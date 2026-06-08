# Feature Specification: Nomenclature Quiz (Text-Based Verification)

## 1. Overview
This module handles quizzes where the user is presented with a static 2D chemical structure or a structural formula and must input the correct IUPAC or common chemical name into a text field.

## 2. The User Journey
1. **Initialization:** The user routes to the nomenclature quiz page. The UI displays an immutable, read-only Ketcher canvas pre-loaded with the target molecule's structure from the `activeQuestion` data object.
2. **Interaction:** The user reviews the structure and types their answer into a standardized text input field.
3. **Submission:** The user submits the HTML form.
    * *Validation Guard:* Strip all leading and trailing whitespace from the input. If the input field is completely empty, flash a visual reminder ("Please enter a name") and abort submission without counting an attempt.
4. **Evaluation:** The component passes the sanitized string to the Quiz Engine, which evaluates it against the array of acceptable text answers.
5. **Feedback Loop:**
   * *If Correct:* Display a success animation/indicator (Lucide checkmark), lock the input field, and reveal the "Next Question" button.
   * *If Incorrect:* Increment the attempt counter, highlight the input box in red, and reveal the next sequential clue from the `hints` array.

## 3. UI Layout & Component Structure
The layout must use strictly Tailwind CSS utility classes and optimize for vertical clarity.

* **Header Bar:** Displays the current question number, difficulty level, and a constant instruction string (e.g., "Provide the correct IUPAC name for the structure shown below").
* **Structure Display Container:** A centralized, read-only `<div>` wrapping the Ketcher canvas.
    * *Canvas Constraint:* The Ketcher instance must act strictly as a read-only visualizer. The AI must use CSS `pointer-events-none` on the Ketcher container wrapper (or an invisible absolute overlay) to completely block mouse clicks, zooming, and keyboard shortcut focus, preventing the user from accidentally modifying the structure.
* **Input Workspace:**
   * The text input and "Submit Answer" button must be wrapped in a standard HTML `<form>` element. Rely on the `onSubmit` event to handle submission, ensuring compatibility with mobile virtual keyboards.
   * A clean, centered `<input type="text" />` field with clear placeholder text.
   * The input field must automatically receive focus (`autoFocus`) upon question initialization.
* **Control Footer:**
   * A primary "Submit Answer" button inside the form.
   * A dynamic feedback/hint panel that expands conditionally based on the failed attempt counter.

## 4. State Management (Zustand)
The component reads and dispatches exclusively to the global Quiz Engine store.
Required state variables:
* `activeQuestion`: Current question object (containing target molecule structure data, an array of accepted string names, and hints).
* `attemptCount`: Integer tracking failed submissions.
* `isCorrect`: Boolean locking the input field and revealing the "Next" button upon success.
* `submitNomenclatureAnswer(userTextInput)`: Action dispatched to grade the text string.

* **Lifecycle Rule:** When `activeQuestion` changes, the component must clear the text input field, reset its local error states, and programmatically load the new question's molecule structure into the read-only Ketcher viewer.

## 5. The Grading Engine (String Normalization Rule)
Chemical nomenclature string matching is highly sensitive to syntax punctuation and legacy IUPAC standards.

* **Normalization Protocol:** Before the Zustand store evaluates the user's string against the answer bank, the string must undergo a multi-step normalization:
    1. Force all characters to lowercase.
    2. Strip all whitespace, hyphens, and commas globally using regex (e.g., `str.replace(/[\s\-,]/g, '')`). This ensures `2-methyl-2-propanol`, `2,methyl,2 propanol`, and `2methyl2propanol` all resolve to the exact same continuous alphanumeric string.
    3. Ensure standard ASCII character equivalents for stereochemical designators if present.
* **Evaluation Logic:** The question schema's `expectedAnswer` array must contain all valid permutations (e.g., the 1979 format, the 1993 format, and valid common names). The grading evaluation passes if the student's normalized string matches *any* normalized string in the array.