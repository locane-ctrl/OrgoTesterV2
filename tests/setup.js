import '@testing-library/jest-dom';

// Global test setup for Vitest + jsdom environment.
// Add any global mocks here (e.g., canvas, WebAssembly stubs).

// Stub out WebAssembly.instantiateStreaming for jsdom environments that lack
// native WASM support. Ketcher tests should mock the Ketcher API directly
// rather than invoking actual Indigo WASM.
if (typeof WebAssembly === 'undefined') {
  global.WebAssembly = {
    instantiateStreaming: () => Promise.resolve({ instance: {}, module: {} }),
    instantiate: () => Promise.resolve({ instance: {}, module: {} }),
  };
}
