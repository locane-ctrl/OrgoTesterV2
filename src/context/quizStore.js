import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Static Dummy Question Data ──────────────────────────────────────────────
// These are self-contained inline fixtures for early verification.
// Production data is loaded from src/data/*.json via a loadQuestions() action.

const DUMMY_QUESTIONS = {
  /** Molecule-drawing quiz: user draws a structure, graded by canonical SMILES */
  moleculeDrawer: [
    {
      id: 'draw-001',
      type: 'moleculeDrawer',
      difficulty: 'easy',
      prompt: 'Draw the structure of ethanol.',
      // normalizedExpectedAnswer is populated at runtime by Ketcher
      // canonicalizing this SMILES. See spec-molecule-drawer.md §6.
      expectedAnswer: 'CCO',
      hints: [
        'Ethanol is a 2-carbon alcohol.',
        'The functional group is a hydroxyl (-OH) attached to the end of the chain.',
        'SMILES: CCO',
      ],
    },
    {
      id: 'draw-002',
      type: 'moleculeDrawer',
      difficulty: 'medium',
      prompt: 'Draw the structure of acetic acid (ethanoic acid).',
      expectedAnswer: 'CC(=O)O',
      hints: [
        'Acetic acid has a carboxylic acid functional group (-COOH).',
        'The parent chain has 2 carbons.',
        'SMILES: CC(=O)O',
      ],
    },
  ],

  /** Nomenclature quiz: user types an IUPAC name for a displayed structure */
  nomenclature: [
    {
      id: 'nom-001',
      type: 'nomenclature',
      difficulty: 'easy',
      prompt: 'Provide the correct IUPAC name for the structure shown below.',
      structureSmiles: 'CCO',
      // Grading normalizes: lowercase → strip whitespace/hyphens/commas
      expectedAnswer: ['ethanol', 'ethyl alcohol'],
      hints: [
        'Count the carbons in the longest chain.',
        "'-ol' suffix indicates a hydroxyl group.",
        "The parent chain has 2 carbons: 'eth-'.",
      ],
    },
    {
      id: 'nom-002',
      type: 'nomenclature',
      difficulty: 'medium',
      prompt: 'Provide the correct IUPAC name for the structure shown below.',
      structureSmiles: 'CC(C)O',
      expectedAnswer: ['2-propanol', 'isopropanol', 'propan-2-ol'],
      hints: [
        'Longest chain containing OH has 3 carbons.',
        'Number from the end closest to the OH group.',
        'OH is on carbon 2.',
      ],
    },
  ],

  /** Reaction mechanism quiz: user draws a full mechanism with curved arrows */
  mechanism: [
    {
      id: 'mech-001',
      type: 'mechanism',
      difficulty: 'medium',
      prompt:
        'Draw the complete SN2 mechanism for bromomethane + OH⁻. Show curved arrows for nucleophilic attack and leaving group departure in one concerted step.',
      startingMaterialSmiles: 'CBr',
      reagentLabel: 'OH⁻',
      // Graded by curved-arrow graph analysis, NOT SMILES. See spec-reaction-quiz.md §6.
      expectedKetcherJson: null, // populated when full Ketcher data is authored
      hints: [
        'SN2 is a concerted single step — no intermediate carbocation.',
        'Arrow 1: lone pair on OH⁻ → carbon bearing Br.',
        'Arrow 2: C–Br bond → Br, showing departure of bromide.',
      ],
    },
  ],
};

// ─── Normalisation Utilities (also used by Nomenclature grading engine) ──────

/**
 * Normalizes a nomenclature string per spec-nomenclature-quiz.md §5.
 * 1. Lowercase
 * 2. Strip all whitespace, hyphens, and commas globally
 * 3. (Stereochemical ASCII equivalence handled externally if needed)
 *
 * @param {string} str - Raw user input or expected answer string
 * @returns {string} Normalized alphanumeric string
 */
export function normalizeNomenclatureString(str) {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[\s\-,]/g, '');
}

// ─── Zustand Store ───────────────────────────────────────────────────────────

/**
 * useQuizStore — Global Quiz Engine state management.
 *
 * State slices:
 *  - quizType         : Active quiz mode ('moleculeDrawer' | 'nomenclature' | 'mechanism')
 *  - questions        : Array of question objects for the active session
 *  - questionIndex    : Index into questions[] pointing to the active question
 *  - activeQuestion   : Derived reference to questions[questionIndex]
 *  - attemptCount     : Number of failed submissions for the current question
 *  - isCorrect        : True when the user has answered the current question correctly
 *  - sessionScore     : { correct, total } tally for the full session
 *  - isLoading        : True while Ketcher WASM is initializing
 *  - errorMessage     : Non-null string when a submission-level error occurs
 *
 * Actions:
 *  - loadQuiz(type)                     : Bootstrap a new quiz session
 *  - submitAnswer(canonicalSmiles)      : Grade a molecule-drawing submission
 *  - submitNomenclatureAnswer(text)     : Grade a nomenclature text submission
 *  - submitReaction(ketcherJson)        : Store a reaction JSON for grading
 *  - nextQuestion()                     : Advance to the next question
 *  - setKetcherLoading(bool)            : Toggle WASM loading overlay state
 *  - clearError()                       : Reset errorMessage to null
 */
const useQuizStore = create(
  devtools(
    (set, get) => ({
      // ── State ─────────────────────────────────────────────────────────────
      quizType: null,
      questions: [],
      questionIndex: 0,
      activeQuestion: null,
      attemptCount: 0,
      isCorrect: false,
      sessionScore: { correct: 0, total: 0 },
      isLoading: false,
      errorMessage: null,

      // ── Actions ───────────────────────────────────────────────────────────

      /**
       * loadQuiz — Initialize a quiz session for the given type.
       * Pulls dummy question data synchronously for now; replace with
       * async JSON fetch in production.
       *
       * @param {'moleculeDrawer'|'nomenclature'|'mechanism'} type
       */
      loadQuiz: (type) => {
        const questions = DUMMY_QUESTIONS[type] ?? [];
        set(
          {
            quizType: type,
            questions,
            questionIndex: 0,
            activeQuestion: questions[0] ?? null,
            attemptCount: 0,
            isCorrect: false,
            sessionScore: { correct: 0, total: 0 },
            errorMessage: null,
          },
          false,
          'loadQuiz'
        );
      },

      /**
       * submitAnswer — Grade a molecule-drawing submission.
       *
       * Per spec-molecule-drawer.md §6: the comparison is a strict string
       * equality of TWO canonical SMILES strings. The normalizedExpectedAnswer
       * must have been set on activeQuestion by the component after Ketcher
       * canonicalizes the raw expectedAnswer SMILES on mount.
       *
       * This store trusts that the component dispatches a canonical SMILES.
       *
       * @param {string} canonicalUserSmiles - Output of ketcher.getSmiles()
       */
      submitAnswer: (canonicalUserSmiles) => {
        const { activeQuestion, attemptCount, sessionScore } = get();
        if (!activeQuestion) return;

        // Use normalizedExpectedAnswer if the component pre-canonicalized it,
        // otherwise fall back to the raw expectedAnswer string.
        const expected =
          activeQuestion.normalizedExpectedAnswer ?? activeQuestion.expectedAnswer;

        const isCorrect = canonicalUserSmiles === expected;

        set(
          {
            isCorrect,
            attemptCount: isCorrect ? attemptCount : attemptCount + 1,
            sessionScore: isCorrect
              ? { ...sessionScore, correct: sessionScore.correct + 1, total: sessionScore.total + 1 }
              : { ...sessionScore, total: sessionScore.total + 1 },
            errorMessage: null,
          },
          false,
          'submitAnswer'
        );
      },

      /**
       * submitNomenclatureAnswer — Grade a nomenclature text submission.
       *
       * Per spec-nomenclature-quiz.md §5: normalize both sides before compare.
       * Passes if the normalized user input matches ANY normalized string in
       * activeQuestion.expectedAnswer[].
       *
       * @param {string} userTextInput - Raw text from the input field
       */
      submitNomenclatureAnswer: (userTextInput) => {
        const { activeQuestion, attemptCount, sessionScore } = get();
        if (!activeQuestion) return;

        const normalizedInput = normalizeNomenclatureString(userTextInput);
        const expectedAnswers = Array.isArray(activeQuestion.expectedAnswer)
          ? activeQuestion.expectedAnswer
          : [activeQuestion.expectedAnswer];

        const isCorrect = expectedAnswers.some(
          (ans) => normalizeNomenclatureString(ans) === normalizedInput
        );

        set(
          {
            isCorrect,
            attemptCount: isCorrect ? attemptCount : attemptCount + 1,
            sessionScore: isCorrect
              ? { ...sessionScore, correct: sessionScore.correct + 1, total: sessionScore.total + 1 }
              : { ...sessionScore, total: sessionScore.total + 1 },
            errorMessage: null,
          },
          false,
          'submitNomenclatureAnswer'
        );
      },

      /**
       * submitReaction — Store the raw Ketcher JSON for mechanism grading.
       *
       * Per spec-reaction-quiz.md §6: The store MUST NOT do a naive JSON
       * string comparison (coordinates vary). The curved-arrow graph analysis
       * engine (to be implemented in src/features/reactions/) consumes this
       * JSON and returns a boolean. For now this action just stores the data
       * and marks correct=false as a safe default until the engine is built.
       *
       * @param {object} userKetcherJson - Output of ketcher.getKetcherData()
       */
      submitReaction: (userKetcherJson) => {
        const { attemptCount, sessionScore } = get();

        // TODO: Replace this stub with the curved-arrow graph analysis engine
        // from src/features/reactions/ once it is implemented.
        const isCorrect = false; // safe default — engine not yet implemented

        set(
          {
            isCorrect,
            attemptCount: isCorrect ? attemptCount : attemptCount + 1,
            sessionScore: { ...sessionScore, total: sessionScore.total + 1 },
            // Store the submitted JSON on the store so the grading engine can
            // access it when it is eventually wired up.
            lastSubmittedReactionJson: userKetcherJson,
            errorMessage: null,
          },
          false,
          'submitReaction'
        );
      },

      /**
       * nextQuestion — Advance the question index.
       * Resets per-question state (attemptCount, isCorrect).
       * If already on the last question, does nothing (session end is
       * handled by the route component).
       */
      nextQuestion: () => {
        const { questions, questionIndex } = get();
        const nextIndex = questionIndex + 1;
        if (nextIndex >= questions.length) return; // session complete

        set(
          {
            questionIndex: nextIndex,
            activeQuestion: questions[nextIndex],
            attemptCount: 0,
            isCorrect: false,
            errorMessage: null,
          },
          false,
          'nextQuestion'
        );
      },

      /**
       * setNormalizedExpectedAnswer — Called by the molecule-drawer component
       * after it uses Ketcher to canonicalize the raw expectedAnswer SMILES
       * on mount (per spec-molecule-drawer.md §6).
       *
       * @param {string} canonicalSmiles
       */
      setNormalizedExpectedAnswer: (canonicalSmiles) => {
        const { activeQuestion } = get();
        if (!activeQuestion) return;
        set(
          {
            activeQuestion: {
              ...activeQuestion,
              normalizedExpectedAnswer: canonicalSmiles,
            },
          },
          false,
          'setNormalizedExpectedAnswer'
        );
      },

      /** Toggle the Ketcher WASM loading overlay. */
      setKetcherLoading: (isLoading) =>
        set({ isLoading }, false, 'setKetcherLoading'),

      /** Set a submission-level error message (e.g., invalid valence). */
      setError: (message) =>
        set({ errorMessage: message }, false, 'setError'),

      /** Clear the current error message. */
      clearError: () =>
        set({ errorMessage: null }, false, 'clearError'),
    }),
    { name: 'OrgoTesterV2 Quiz Store' }
  )
);

export default useQuizStore;
