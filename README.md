An interactive, web-based chemistry study application designed to help students master organic chemistry mechanisms, nomenclature, and stoichiometry through progressive hint-based quizzes. Tailored to OpenStax's Organic Chemistry textbook.

## Technology Stack & Dependencies

The application is built entirely as a client-side, serverless web application architecture designed for deployment on static hosting environments like GitHub Pages.

### Core Framework & Build Tooling
* **React:** Component-based user interface library.
* **Vite:** High-performance frontend build tool and dev server.
    * **WASM Configuration Constraint:** The Vite configuration (`vite.config.js`) must be explicitly set up to serve and bundle Ketcher/Indigo `.wasm` files correctly. The AI must ensure that the path to the standalone Indigo provider resolves correctly when built for production on GitHub Pages (accounting for base URL routing).
* **Vitest:** Automated unit testing framework for agentic code verification and logic validation.

### Chemistry Engine & Interface
* **Ketcher (ketcher-react & ketcher-standalone):** Professional, open-source chemical structure editor. 
    * **Constraint:** Must be implemented using the `ketcher-standalone` provider. This utilizes an Indigo WASM module to handle complex chemical operations (cleanup, layout, SMILES generation) entirely client-side, bypassing the need for an external Indigo backend server.

### External Data Integration
* **PubChem PUG REST API:** Direct, client-side asynchronous HTTP requests to resolve text queries (IUPAC/common names) into SMILES strings for dynamic canvas population.
    * **API Constraints:** All requests to the PubChem API must be debounced to prevent rate-limiting. The app should implement a local `sessionStorage` cache for successfully resolved queries. If PubChem fails or times out, the app must gracefully handle the error and prompt the user to draw the molecule manually.

### Application Routing & UI
* **React Router:** Manages client-side navigation between distinct application views (Menu, Quizzes, Settings).
* **Tailwind CSS:** Utility-first CSS framework for all component styling.
* **Lucide-React:** Standardized, lightweight SVG icon library.

### State Management & Validation
* **Zustand:** Single-source-of-truth state management for orchestrating global app states, active quiz data, and user scores.
* **Chemistry Validation Rules:** * *Static Molecules (Nomenclature, Structure Drawing):* Utilize canonical SMILES generation via Ketcher's WASM Indigo functions to ensure equivalent molecular structures are graded accurately.
    * *Reaction Mechanisms (Electron-pushing):* The app must parse Ketcher's native JSON or `.rxn` format to evaluate the placement and direction of reaction arrows and intermediate states. SMILES cannot be used for mechanism evaluation.

## File & Directory Architecture

The project enforces a strict feature-isolated directory structure to ensure modularity and prevent automated agents from introducing cross-component regressions.

```text
├── docs/                      # Spec-Driven Development Blueprints
│   ├── spec-molecule-drawer.md # Layout/inputs for drawing 2D structures
│   ├── spec-reaction-quiz.md  # Rules for electron pushing/mechanism tests
│   └── spec-nomenclature-quiz.md # Rules for naming/IUPAC tests
├── public/                    # Static assets (including Ketcher WASM binaries)
├── src/
│   ├── assets/                # Global styles and static brand assets
│   ├── components/            # Reusable, shared UI primitives (Buttons, Cards, Modals)
│   ├── context/               # Global state providers (Navigation and session routing)
│   ├── data/                  # Static Local Data Bank
│   │   ├── nomenclature.json  # Nomenclature question datasets
│   │   ├── mechanisms.json    # Reaction mechanism question datasets
│   │   └── multipleChoice.json # Conceptual question datasets
│   ├── features/              # Feature-Isolated Core Modules
│   │   ├── chemistry/         # Ketcher engine wrappers, SMILES parsing, and validation logic
│   │   ├── nomenclature/      # Nomenclature rendering and text-input validation engines
│   │   └── reactions/         # Multi-step reaction schemes and arrow-pushing logic
│   ├── routes/                # React Router view layouts (MainMenu, QuizWorkspace)
│   ├── App.jsx                # Application shell and core routing wrapper
│   └── main.jsx               # Application entry point
├── tests/                     # Vitest automated test suites for chemical grading validation
├── package.json               # Package manifests and project dependencies
└── README.md                  # Master System Blueprint and Architectural Contract
```

> **6. UI/UX Aesthetic Standards:** The application must strictly adhere to a modern, minimalist dark-theme design language. Agents must use the following Tailwind CSS conventions to ensure visual consistency:
> * **Global Theme:** Deep dark mode. Use `bg-slate-900` for main application backgrounds and `bg-slate-800` for elevated surface elements (cards, modals, panels). Pure black (`bg-black`) is strictly prohibited to prevent high-contrast eye strain.
> * **The Ketcher Canvas Wrapper:** Because Ketcher renders a stark white canvas, its wrapper must be treated as a focal point. Use `bg-white rounded-xl overflow-hidden ring-4 ring-slate-800/50` to frame it elegantly like a sheet of paper.
> * **Typography & Accents:** Use `text-slate-100` for primary reading and `text-slate-400` for secondary details or hints. Primary action buttons should use a muted, elegant tech accent (`bg-indigo-600 hover:bg-indigo-500 text-white`). 
> * **Borders & Depth:** Rely on subtle, semi-transparent borders (e.g., `border border-white/10` or `border-slate-700`) and smooth radii (`rounded-xl` or `rounded-2xl`) to define hierarchy instead of heavy drop-shadows.
> * **Micro-Interactions:** All interactive elements (buttons, inputs, cards) must include smooth transitions using Tailwind's `transition-all duration-200 ease-in-out` to ensure interactions feel premium and fluid. Use `lucide-react` icons with `text-emerald-400` for success states and `text-red-400` for errors.
