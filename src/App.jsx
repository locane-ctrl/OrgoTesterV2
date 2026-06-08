import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MoleculeDrawer from './features/chemistry/MoleculeDrawer.jsx';

/**
 * App — Application shell and core routing wrapper.
 *
 * Route tree:
 *   /                      → MoleculeDrawer (primary quiz during development)
 *   /quiz/molecule-drawer  → MoleculeDrawer (canonical URL)
 *   *                      → redirect to /
 *
 * The basename is set to match the GitHub Pages deployment path.
 * Vite injects the correct BASE_URL from vite.config.js at build time.
 */
function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<MoleculeDrawer />} />
        <Route path="/quiz/molecule-drawer" element={<MoleculeDrawer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
