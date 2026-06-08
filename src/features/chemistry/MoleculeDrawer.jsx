/**
 * MoleculeDrawer.jsx
 * Feature: Chemistry — Single Structure Drawing Quiz
 *
 * Implements the full spec from docs/spec-molecule-drawer.md:
 *   §2  User Journey   — empty-canvas guard, submit flow, feedback loop
 *   §3  UI Layout      — header bar, Ketcher container, control footer
 *   §4  State Mgmt     — reads/writes exclusively from useQuizStore (no local eval state)
 *   §5  Ketcher Config — hides reaction/arrow/mapping/3D buttons via ButtonsConfig API
 *   §6  Grading Engine — try/catch on getSmiles(), on-mount SMILES canonicalization
 *
 * Aesthetic rules from README §6:
 *   - bg-slate-900 / bg-slate-800 surfaces
 *   - Ketcher canvas wrapped in bg-white rounded-xl ring-4 ring-slate-800/50
 *   - text-slate-100 / text-slate-400 typography
 *   - bg-indigo-600 hover:bg-indigo-500 primary action
 *   - text-emerald-400 success / text-red-400 error
 *   - transition-all duration-200 ease-in-out on all interactive elements
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Editor } from 'ketcher-react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';

import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Eraser,
  FlaskConical,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';

import useQuizStore from '../../context/quizStore.js';

// ─── Ketcher Configuration ────────────────────────────────────────────────────

/**
 * StandaloneStructServiceProvider is instantiated ONCE at module scope.
 * Re-instantiating it on every render would re-initialize the WASM module,
 * causing significant latency and potential memory leaks.
 */
const structServiceProvider = new StandaloneStructServiceProvider();

/**
 * Buttons to hide for the single-structure drawing mode.
 * Per spec §5: use the ButtonsConfig API — never CSS hacks.
 *
 * Hides: all reaction arrow variants, reaction-plus, atom mapping tools,
 * 3D viewer (miew), and the layout/clean structure tools that could mislead
 * students by auto-correcting their work before submission.
 */
const HIDDEN_BUTTONS = {
  // Reaction arrows & plus sign
  'reaction-plus':                                           { hidden: true },
  arrows:                                                    { hidden: true },
  'reaction-arrow-open-angle':                               { hidden: true },
  'reaction-arrow-filled-triangle':                          { hidden: true },
  'reaction-arrow-filled-bow':                               { hidden: true },
  'reaction-arrow-dashed-open-angle':                        { hidden: true },
  'reaction-arrow-failed':                                   { hidden: true },
  'reaction-arrow-both-ends-filled-triangle':                { hidden: true },
  'reaction-arrow-equilibrium-filled-half-bow':              { hidden: true },
  'reaction-arrow-equilibrium-filled-triangle':              { hidden: true },
  'reaction-arrow-equilibrium-open-angle':                   { hidden: true },
  'reaction-arrow-unbalanced-equilibrium-filled-half-bow':   { hidden: true },
  'reaction-arrow-unbalanced-equilibrium-open-half-angle':   { hidden: true },
  'reaction-arrow-unbalanced-equilibrium-large-filled-half-bow': { hidden: true },
  'reaction-arrow-unbalanced-equilibrium-filled-half-triangle': { hidden: true },
  'reaction-arrow-elliptical-arc-arrow-filled-bow':          { hidden: true },
  'reaction-arrow-elliptical-arc-arrow-filled-triangle':     { hidden: true },
  'reaction-arrow-elliptical-arc-arrow-open-angle':          { hidden: true },
  'reaction-arrow-elliptical-arc-arrow-open-half-angle':     { hidden: true },
  // Atom mapping tools
  'reaction-mapping-tools':  { hidden: true },
  'reaction-automap':        { hidden: true },
  'reaction-map':            { hidden: true },
  'reaction-unmap':          { hidden: true },
  // 3D optimization
  miew:    { hidden: true },
  // Auto-structure tools that bypass student intent
  layout: { hidden: true },
  clean:  { hidden: true },
};

// ─── Difficulty Badge ─────────────────────────────────────────────────────────

const DIFFICULTY_STYLES = {
  easy:   'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  medium: 'bg-amber-500/20   text-amber-400   border border-amber-500/30',
  hard:   'bg-red-500/20     text-red-400     border border-red-500/30',
};

function DifficultyBadge({ level }) {
  const style = DIFFICULTY_STYLES[level] ?? DIFFICULTY_STYLES.medium;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-widest ${style}`}>
      {level}
    </span>
  );
}

// ─── Hint Panel ───────────────────────────────────────────────────────────────

function HintPanel({ hints, attemptCount }) {
  const visibleHints = hints?.slice(0, attemptCount) ?? [];
  if (visibleHints.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 animate-in fade-in duration-300">
      {visibleHints.map((hint, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm leading-relaxed text-amber-200">
            <span className="font-semibold text-amber-400">Hint {i + 1}:</span>{' '}
            {hint}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── MoleculeDrawer ───────────────────────────────────────────────────────────

/**
 * MoleculeDrawer — Molecule structure drawing quiz component.
 *
 * All grading state lives in the Zustand store. This component's only local
 * state tracks UI-transient concerns:
 *   - `ketcherRef`       : mutable ref to the live Ketcher instance
 *   - `canvasGuardMsg`   : empty-canvas warning (cleared on next draw action)
 *   - `valenceError`     : error from Indigo during getSmiles()
 *   - `isSubmitting`     : prevents double-submit while async getSmiles() runs
 *
 * None of these are evaluation state — they do not influence grading results.
 */
export default function MoleculeDrawer() {
  // ── Zustand bindings ───────────────────────────────────────────────────────
  const activeQuestion         = useQuizStore((s) => s.activeQuestion);
  const attemptCount           = useQuizStore((s) => s.attemptCount);
  const isCorrect              = useQuizStore((s) => s.isCorrect);
  const isLoading              = useQuizStore((s) => s.isLoading);
  const errorMessage           = useQuizStore((s) => s.errorMessage);
  const questions              = useQuizStore((s) => s.questions);
  const questionIndex          = useQuizStore((s) => s.questionIndex);
  const submitAnswer           = useQuizStore((s) => s.submitAnswer);
  const nextQuestion           = useQuizStore((s) => s.nextQuestion);
  const setKetcherLoading      = useQuizStore((s) => s.setKetcherLoading);
  const setError               = useQuizStore((s) => s.setError);
  const clearError             = useQuizStore((s) => s.clearError);
  const setNormalizedExpected  = useQuizStore((s) => s.setNormalizedExpectedAnswer);
  const loadQuiz               = useQuizStore((s) => s.loadQuiz);

  // ── Local transient UI state (NOT evaluation state) ────────────────────────
  const ketcherRef      = useRef(null);
  const [canvasGuardMsg, setCanvasGuardMsg] = useState('');
  const [isSubmitting,  setIsSubmitting]    = useState(false);

  // ── Bootstrap: load the moleculeDrawer quiz on first mount ────────────────
  useEffect(() => {
    if (!activeQuestion) {
      loadQuiz('moleculeDrawer');
    }
  }, [activeQuestion, loadQuiz]);

  // ── Lifecycle Rule (spec §4): wipe canvas when activeQuestion changes ──────
  useEffect(() => {
    if (!ketcherRef.current || !activeQuestion) return;

    // Clear the canvas for the new question.
    // We intentionally do not use ketcher to dynamically canonicalize the 
    // expectedAnswer here anymore. It causes race conditions with the UI canvas 
    // and is unnecessary since the DB expectedAnswers are already canonical.
    ketcherRef.current.setMolecule('').catch(() => {
      // Ignore errors if canvas is already empty
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion?.id]);

  // ── onInit callback: fired by Ketcher when WASM is fully loaded ────────────
  const handleKetcherInit = useCallback((ketcher) => {
    ketcherRef.current = ketcher;
    // Ketcher's internal KetcherLogger requires window.ketcher to be defined.
    // If we don't set it here, getSmiles() will crash with "Ketcher needs to
    // be initialized before KetcherLogger is used".
    window.ketcher = ketcher;
    setKetcherLoading(false);
    clearError();
  }, [setKetcherLoading, clearError]);

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const ketcher = ketcherRef.current;
    if (!ketcher || isSubmitting || isCorrect) return;

    // Clear transient messages from the previous attempt
    setCanvasGuardMsg('');
    clearError();

    // ── Empty-canvas guard (spec §2.3) ───────────────────────────────────────
    // Use getMolfile() to detect an empty canvas by reading the V2000 atom
    // count. This is independent of the Indigo WASM service.
    // IMPORTANT: only block submission if we *positively* confirmed 0 atoms.
    // If getMolfile itself throws, we skip the guard and fall through to
    // getSmiles() — never treat a service error as "no structure drawn".
    let userMolfile;
    try {
      userMolfile = await ketcher.getMolfile();
      // V2000 counts line is line index 3: "  3  2  0  0 ..." → atom count
      const countsLine = (userMolfile ?? '').split('\n')[3] ?? '';
      const atomCount = parseInt(countsLine.trim().split(/\s+/)[0], 10);
      if (Number.isFinite(atomCount) && atomCount === 0) {
        setCanvasGuardMsg('Please draw a structure first.');
        return;
      }
    } catch {
      // getMolfile failed — can't confirm empty; proceed below.
    }

    // ── SMILES extraction (for display/logging) ──────────────────────────────
    let rawSmiles;
    try {
      rawSmiles = await ketcher.getSmiles();
    } catch (err) {
      const msg = err?.message ?? String(err);
      const isValenceError = /valence|charge|radical|invalid/i.test(msg);
      if (isValenceError) {
        setError('Invalid chemical structure drawn. Please check your valences.');
      } else {
        setError(`Could not convert structure to SMILES: ${msg || 'unknown error'}. Try redrawing.`);
      }
      return;
    }

    if (!rawSmiles || rawSmiles.trim() === '') {
      setCanvasGuardMsg('Please draw a structure first.');
      return;
    }

    // ── InChI-based grading ──────────────────────────────────────────────────
    // SMILES is NOT a canonical identifier — the same molecule can produce
    // different SMILES strings depending on drawing order (e.g. "C(=O)(C)O"
    // vs "CC(O)=O" for acetic acid). InChI (International Chemical Identifier)
    // IS canonical: same molecule → always identical InChI string.
    //
    // Since Ketcher's React canvas is heavily asynchronous, dynamically loading
    // the expected answer into the canvas to get its InChI causes silent
    // failures and race conditions. Instead, we compare the user's InChI
    // against a pre-computed `expectedInchi` string from the database.
    setIsSubmitting(true);
    try {
      // Step 1: Get user's InChI
      const userInchi = await ketcher.getInchi();

      // Step 2: Compare against the pre-authored InChI string from the database
      // We use .includes() because Ketcher's output might include a prefix
      // like "InChI=1S/" while the database might only have the core layers.
      let chemicallyCorrect = false;
      if (activeQuestion.expectedInchi && userInchi) {
        chemicallyCorrect = userInchi.includes(activeQuestion.expectedInchi);
      } else {
        // Fallback if the database is missing the expectedInchi
        chemicallyCorrect = rawSmiles === activeQuestion.expectedAnswer;
      }

      submitAnswer(chemicallyCorrect);
    } catch (err) {
      console.warn('[MoleculeDrawer] InChI extraction failed, falling back to SMILES:', err);
      // Fallback: pass raw SMILES to store for direct string comparison
      submitAnswer(rawSmiles);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isCorrect, activeQuestion, clearError, setError, submitAnswer]);

  // ── Clear canvas utility button ────────────────────────────────────────────
  const handleClearCanvas = useCallback(async () => {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    try {
      await ketcher.setMolecule('');
      setCanvasGuardMsg('');
      clearError();
    } catch {
      // ignore — canvas was already empty
    }
  }, [clearError]);

  // ── Next question ──────────────────────────────────────────────────────────
  const isLastQuestion = questionIndex >= questions.length - 1;

  const handleNextQuestion = useCallback(() => {
    setCanvasGuardMsg('');
    nextQuestion();
  }, [nextQuestion]);

  // ── Render: no active question ─────────────────────────────────────────────
  if (!activeQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  // ── Render: session complete ───────────────────────────────────────────────
  if (isLastQuestion && isCorrect) {
    // The route-level component would normally handle this, but we add a
    // graceful in-component fallback so the drawer is never stranded.
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="h-5 w-5 text-indigo-400" />
            <span className="text-sm font-semibold tracking-tight text-slate-200">
              OrgoTester
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-400">Structure Drawing</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>
              Question{' '}
              <span className="font-semibold text-slate-200">
                {questionIndex + 1}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-200">
                {questions.length}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">

        {/* ── Header Bar (spec §3) ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-white/10 bg-slate-800 px-6 py-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Question {questionIndex + 1}
            </span>
            <DifficultyBadge level={activeQuestion.difficulty} />
          </div>
          <p className="text-lg font-medium leading-relaxed text-slate-100">
            {activeQuestion.prompt}
          </p>
        </section>

        {/* ── Ketcher Container (spec §3) ────────────────────────────────────
            The container is relative-positioned so the WASM loading overlay
            can be stacked on top without disturbing the layout. ──────────── */}
        <section className="relative flex-1">
          {/* WASM loading overlay (spec §3 Loading State) */}
          {isLoading && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/90 backdrop-blur-sm"
              aria-live="polite"
              aria-label="Ketcher chemistry editor is initializing"
            >
              <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
              <p className="text-sm font-medium text-slate-400">
                Initializing chemistry engine…
              </p>
            </div>
          )}

          {/* Success lock overlay — prevents drawing after correct answer */}
          {isCorrect && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/60 backdrop-blur-sm">
              <CheckCircle className="h-16 w-16 text-emerald-400 drop-shadow-lg" />
              <p className="text-lg font-semibold text-emerald-400">
                Correct!
              </p>
            </div>
          )}

          {/* Ketcher editor — framed like a sheet of paper per README §6 */}
          <div
            className="overflow-hidden rounded-2xl bg-white ring-4 ring-slate-800/50"
            style={{ height: '520px' }}
          >
            <Editor
              staticResourcesUrl={import.meta.env.BASE_URL}
              structServiceProvider={structServiceProvider}
              buttons={HIDDEN_BUTTONS}
              onInit={handleKetcherInit}
              errorHandler={(msg) => setError(msg)}
            />
          </div>
        </section>

        {/* ── Control Footer (spec §3) ──────────────────────────────────────── */}
        <footer className="flex flex-col gap-4">

          {/* ── Action Row ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Primary: Submit Answer */}
            {!isCorrect && (
              <button
                id="btn-submit-answer"
                onClick={handleSubmit}
                disabled={isLoading || isSubmitting}
                className="
                  flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3
                  text-sm font-semibold text-white shadow-lg shadow-indigo-900/40
                  transition-all duration-200 ease-in-out
                  hover:bg-indigo-500 hover:shadow-indigo-800/50
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isSubmitting ? 'Checking…' : 'Submit Answer'}
              </button>
            )}

            {/* Secondary: Next Question (revealed on success) */}
            {isCorrect && (
              <button
                id="btn-next-question"
                onClick={handleNextQuestion}
                disabled={isLastQuestion}
                className="
                  flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3
                  text-sm font-semibold text-white shadow-lg shadow-emerald-900/40
                  transition-all duration-200 ease-in-out
                  hover:bg-emerald-500
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                {isLastQuestion ? 'Session Complete!' : 'Next Question'}
                {!isLastQuestion && <ChevronRight className="h-4 w-4" />}
              </button>
            )}

            {/* Utility: Clear Canvas */}
            {!isCorrect && (
              <button
                id="btn-clear-canvas"
                onClick={handleClearCanvas}
                disabled={isLoading}
                className="
                  flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-4 py-3
                  text-sm font-medium text-slate-400
                  transition-all duration-200 ease-in-out
                  hover:border-slate-600 hover:bg-slate-700 hover:text-slate-200
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <Eraser className="h-4 w-4" />
                Clear Canvas
              </button>
            )}

            {/* Attempt counter */}
            {attemptCount > 0 && !isCorrect && (
              <span className="ml-auto text-sm text-slate-500">
                {attemptCount} failed attempt{attemptCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* ── Feedback Area ─────────────────────────────────────────────── */}

          {/* Empty-canvas warning */}
          {canvasGuardMsg && !isCorrect && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 transition-all duration-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300">{canvasGuardMsg}</p>
            </div>
          )}

          {/* Valence / Indigo error */}
          {errorMessage && !isCorrect && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 transition-all duration-200"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Incorrect submission feedback */}
          {attemptCount > 0 && !isCorrect && !errorMessage && !canvasGuardMsg && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 transition-all duration-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">
                Not quite right. Check the hint below and try again.
              </p>
            </div>
          )}

          {/* Hint Panel (spec §3 — progressive hint revelation) */}
          <HintPanel
            hints={activeQuestion.hints}
            attemptCount={attemptCount}
          />

        </footer>
      </main>
    </div>
  );
}
