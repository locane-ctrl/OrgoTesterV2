import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/**
 * App — Application shell and core routing wrapper.
 *
 * Route tree:
 *   /            → MainMenu (to be implemented in src/routes/)
 *   /quiz/:type  → QuizWorkspace (nomenclature | molecule-drawer | reaction)
 *   /settings    → Settings
 *   *            → redirect to /
 *
 * The basename is set to match the GitHub Pages deployment path.
 * Vite injects the correct BASE_URL from vite.config.js at build time.
 */
function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Placeholder routes — full view implementations live in src/routes/ */}
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
              <p className="text-2xl font-semibold">OrgoTesterV2 — Scaffold Ready ✓</p>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
