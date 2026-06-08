# Feature Specification: Reaction Mechanism Quiz

## 1. Overview
This module handles multi-step organic chemistry quizzes. The user is presented with a starting molecule or a reaction prompt and must draw the complete mechanism, including intermediate states, products, and proper electron-pushing arrows (curved arrows) using the Ketcher canvas.

## 2. The User Journey
1. **Initialization:** The user routes to the reaction quiz page. The UI displays the `prompt` text. The Quiz Engine may optionally pre-load a starting reactant onto the Ketcher canvas if defined in the `activeQuestion`.
2. **Interaction:** The user interacts with the canvas to draw reactants, products, and map the electron flow using curved arrows.
3. **Submission:** The user clicks a "Submit Mechanism" button.
    * *Validation Guard:* Before processing, check if the canvas contains any reaction components (arrows, plus signs). If it only contains a single static molecule or is empty, visually prompt the user ("Please draw a complete reaction sequence") and abort submission without counting an attempt.
4. **Evaluation:** The component extracts the native JSON reaction data, passes it to the Quiz Engine, and evaluates the mechanism against the `expectedAnswer`.
5. **Feedback Loop:**
   * *If Correct:* Display a success indicator (Lucide checkmark) and a "Next Question" button.
   * *If Incorrect:* Increment the attempt counter, display a warning indicator, and reveal the next available string from the `hints` array.

## 3. UI Layout & Component Structure
The layout uses strictly Tailwind CSS utility classes. Reactions require more horizontal space than single molecules.

* **Header Bar:** Displays the current question number, difficulty level, and the textual `prompt`.
* **Ketcher Container:** A responsive, wide `<div>` that mounts the `ketcher-standalone` editor. 
    * *Horizontal Constraints:* The container must be configured to allow horizontal scrolling (e.g., `overflow-x-auto`) or have a sufficiently large minimum width, as multi-step mechanisms will quickly exceed standard mobile or split-screen widths.
    * *Loading State:* Ketcher WASM initialization is asynchronous. Display a Lucide `<Loader2 className="animate-spin" />` overlay until fully mounted.
* **Control Footer:**
   * A primary "Submit Mechanism" button.
   * A dynamic feedback area displaying conditional hints based on the attempt count.
   * "Reset Canvas" utility button: If clicked, it must prompt the user with a confirmation (e.g., standard browser `window.confirm('Are you sure you want to clear your work?')`) to prevent accidental deletion. If confirmed, it wipes the canvas and instantly re-loads any starting reactants provided by the `activeQuestion`.
* **Icons:** Use `lucide-react` for iconography.

## 4. State Management (Zustand)
The component strictly reads and dispatches to the global Quiz Engine store.
Required state variables:
* `activeQuestion`: The current question object (containing prompt, expected native Ketcher JSON data, hints, and optional starting molecules).
* `attemptCount`: Integer tracking failed submissions.
* `isCorrect`: Boolean locking the canvas and revealing the "Next" button upon success.
* `submitReaction(userKetcherJson)`: The action dispatched when the submit button is clicked.

* **Lifecycle Rule:** When `activeQuestion` changes, the component must trigger a reset to wipe the canvas clean, followed immediately by loading any starting reactants if the new question provides them.

## 5. Ketcher Integration Constraints
* The component must wrap the `Editor` from `ketcher-react` and utilize the `ketcher-standalone` WASM provider.
* **Tool Availability:** Unlike the static molecule drawer, **DO NOT hide** the reaction tools. The UI configuration must ensure that reaction arrows, curved electron-pushing arrows, plus signs, and atom mapping tools are fully visible and enabled for the user.

## 6. The Grading Engine (Critical Rule)
SMILES strings cannot encode electron-pushing arrows or spatial reaction layouts. SMILES evaluation is strictly prohibited in this module. Standard `.rxn` files are also prohibited as they lose curved-arrow metadata.

* **Component Extraction & Safety:** When the user clicks submit, the React component must strictly await Ketcher's native JSON format (e.g., via `ketcher.getKetcherData()`). This preserves the start and end coordinate points of curved arrows. This must be wrapped in a `try/catch` block to handle Indigo validation errors. 
* **State Dispatch:** If successful, dispatch the raw Ketcher JSON object to Zustand via `submitReaction(userKetcherJson)`.
* **Evaluation Logic:** The Zustand engine must not perform a strict string comparison of the JSON objects, as Ketcher JSON includes variable (x,y) canvas coordinates. Instead, the logic must parse the JSON to compare the chemical graph (atom types, bond types, connectivity) and verify that the curved arrows originate and terminate at the correct structural indices, ignoring layout coordinates.