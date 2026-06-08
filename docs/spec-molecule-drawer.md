# Feature Specification: Molecule Drawer (Single Structure)

## 1. Overview
This module handles quizzes where the user is presented with a conceptual prompt (e.g., an IUPAC name or a functional group description) and must draw the corresponding static 2D chemical structure using the Ketcher canvas.

## 2. The User Journey
1. **Initialization:** The user routes to the quiz page. The UI displays the `prompt` text from the current question data object.
2. **Interaction:** The user interacts with the embedded Ketcher canvas to draw the target molecule. 
3. **Submission:** The user clicks a "Submit Answer" button located below the canvas.
    * *Validation Guard:* Before processing, the component must check if the canvas is empty. If empty, visually prompt the user (e.g., "Please draw a structure first") and abort the submission without incrementing the attempt counter.
4. **Evaluation:** The component extracts the canonical SMILES, passes it to the Quiz Engine, and the engine compares it against the `expectedAnswer`.
5. **Feedback Loop:**
   * *If Correct:* Display a success indicator (Lucide checkmark) and a "Next Question" button.
   * *If Incorrect:* Increment the attempt counter, display a warning indicator, and reveal the next available string from the `hints` array.

## 3. UI Layout & Component Structure
The layout must be built exclusively using Tailwind CSS utility classes. 

* **Header Bar:** Displays the current question number, difficulty level, and the textual `prompt`.
* **Ketcher Container:** A responsive, centralized `<div>` that mounts the `ketcher-standalone` editor. It must maintain a stable aspect ratio to prevent layout shift during drawing.
    * *Loading State:* Ketcher WASM initialization is asynchronous. The container must display a Lucide `<Loader2 className="animate-spin" />` overlay until the Ketcher instance is fully mounted. Prevent interactions until loaded.
* **Control Footer:** * A primary "Submit Answer" button.
   * A dynamic feedback area that displays hints conditionally based on the attempt counter.
   * "Clear Canvas" utility button.
* **Icons:** Use `lucide-react` for all iconography (e.g., `<CheckCircle />` for correct, `<AlertTriangle />` for incorrect/hints).

## 4. State Management (Zustand)
The component must not manage its own evaluation state. It must subscribe to the global Quiz Engine store.
Required state variables to read/write:
* `activeQuestion`: The current question object (containing prompt, target SMILES, hints).
* `attemptCount`: Integer tracking failed submissions.
* `isCorrect`: Boolean locking the canvas and revealing the "Next" button upon success.
* `submitAnswer(canonicalUserSmiles)`: The action dispatched when the submit button is clicked.

* **Lifecycle Rule:** When `activeQuestion` changes (i.e., moving to the next question), the React component must trigger `ketcher.setMolecule('')` to wipe the canvas clean for the new prompt.

## 5. Ketcher Integration Constraints
* The component must wrap the `Editor` from `ketcher-react`.
* The `ketcher-standalone` provider must be utilized to execute WASM operations client-side.
* Use Ketcher's configuration props (e.g., the `hiddenButtons` array or settings object) to programmatically hide reaction arrows, mapping tools, and 3D optimization buttons. Do not attempt to hide these elements using CSS hacks.

## 6. The Grading Engine (Critical Rule)
Textual string comparison of raw SMILES is strictly prohibited due to geometric variations in drawing.
* **Component Extraction & Safety:** When the user clicks submit, the React component must await `ketcher.getSmiles()`. This must be wrapped in a `try/catch` block. If Indigo throws an error due to invalid chemistry (e.g., valence errors like a 5-bond carbon), catch it, abort the submission, and display a UI warning: "Invalid chemical structure drawn. Please check your valences."
* **State Dispatch:** If successful, the component dispatches `submitAnswer(canonicalUserSmiles)` to the Zustand store.
* **Evaluation Logic:** To guarantee 1:1 string matching regardless of the JSON data's origin, the component must use Ketcher to silently canonicalize the `activeQuestion.expectedAnswer` upon component mount. Zustand then performs the strict string comparison: `canonicalUserSmiles === normalizedExpectedAnswer`.