import { describe, it, expect, beforeEach } from 'vitest';
import useQuizStore, { normalizeNomenclatureString } from '../src/context/quizStore.js';

// ─── normalizeNomenclatureString ─────────────────────────────────────────────

describe('normalizeNomenclatureString', () => {
  it('lowercases input', () => {
    expect(normalizeNomenclatureString('Ethanol')).toBe('ethanol');
  });

  it('strips whitespace', () => {
    expect(normalizeNomenclatureString('2 methyl propane')).toBe('2methylpropane');
  });

  it('strips hyphens', () => {
    expect(normalizeNomenclatureString('2-methyl-2-propanol')).toBe('2methyl2propanol');
  });

  it('strips commas', () => {
    expect(normalizeNomenclatureString('2,methyl,2 propanol')).toBe('2methyl2propanol');
  });

  it('returns empty string for non-string input', () => {
    expect(normalizeNomenclatureString(null)).toBe('');
    expect(normalizeNomenclatureString(undefined)).toBe('');
  });
});

// ─── useQuizStore — Nomenclature grading ─────────────────────────────────────

describe('useQuizStore — nomenclature grading', () => {
  beforeEach(() => {
    useQuizStore.getState().loadQuiz('nomenclature');
  });

  it('loads the first nomenclature question', () => {
    const { activeQuestion, questionIndex } = useQuizStore.getState();
    expect(questionIndex).toBe(0);
    expect(activeQuestion.id).toBe('nom-001');
  });

  it('marks correct when the normalized answer matches an expected answer', () => {
    useQuizStore.getState().submitNomenclatureAnswer('Ethanol');
    expect(useQuizStore.getState().isCorrect).toBe(true);
  });

  it('marks correct for alternate accepted spellings', () => {
    useQuizStore.getState().loadQuiz('nomenclature');
    useQuizStore.getState().submitNomenclatureAnswer('ethyl alcohol');
    expect(useQuizStore.getState().isCorrect).toBe(true);
  });

  it('marks incorrect for a wrong answer and increments attemptCount', () => {
    useQuizStore.getState().loadQuiz('nomenclature');
    useQuizStore.getState().submitNomenclatureAnswer('methanol');
    const { isCorrect, attemptCount } = useQuizStore.getState();
    expect(isCorrect).toBe(false);
    expect(attemptCount).toBe(1);
  });

  it('advances to the next question', () => {
    useQuizStore.getState().submitNomenclatureAnswer('ethanol');
    useQuizStore.getState().nextQuestion();
    const { questionIndex, activeQuestion, attemptCount, isCorrect } =
      useQuizStore.getState();
    expect(questionIndex).toBe(1);
    expect(activeQuestion.id).toBe('nom-002');
    expect(attemptCount).toBe(0);
    expect(isCorrect).toBe(false);
  });
});

// ─── useQuizStore — Molecule drawer grading ───────────────────────────────────

describe('useQuizStore — molecule drawer grading', () => {
  beforeEach(() => {
    useQuizStore.getState().loadQuiz('moleculeDrawer');
  });

  it('loads the first molecule-drawing question', () => {
    const { activeQuestion } = useQuizStore.getState();
    expect(activeQuestion.id).toBe('draw-001');
    expect(activeQuestion.expectedAnswer).toBe('CCO');
  });

  it('marks correct when canonical SMILES match', () => {
    useQuizStore.getState().submitAnswer('CCO');
    expect(useQuizStore.getState().isCorrect).toBe(true);
  });

  it('marks incorrect and increments attemptCount for wrong SMILES', () => {
    useQuizStore.getState().submitAnswer('CC');
    const { isCorrect, attemptCount } = useQuizStore.getState();
    expect(isCorrect).toBe(false);
    expect(attemptCount).toBe(1);
  });

  it('uses normalizedExpectedAnswer when set', () => {
    // Simulate the component setting the canonicalized version
    useQuizStore.getState().setNormalizedExpectedAnswer('CCO');
    useQuizStore.getState().submitAnswer('CCO');
    expect(useQuizStore.getState().isCorrect).toBe(true);
  });
});

// ─── useQuizStore — Session score tracking ────────────────────────────────────

describe('useQuizStore — session score tracking', () => {
  it('increments sessionScore.correct on a correct nomenclature answer', () => {
    useQuizStore.getState().loadQuiz('nomenclature');
    useQuizStore.getState().submitNomenclatureAnswer('ethanol');
    expect(useQuizStore.getState().sessionScore).toEqual({ correct: 1, total: 1 });
  });

  it('increments only sessionScore.total on a wrong answer', () => {
    useQuizStore.getState().loadQuiz('nomenclature');
    useQuizStore.getState().submitNomenclatureAnswer('wrong answer here');
    expect(useQuizStore.getState().sessionScore).toEqual({ correct: 0, total: 1 });
  });
});
