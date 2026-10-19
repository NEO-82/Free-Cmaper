import './style.css';

// Keep the loading/error screen independent of the 3D renderer. An unsupported
// graphics context or failed game-module request must never leave a blank menu.
try {
  await import('./main.js');
  document.querySelector('#startup').hidden = true;
} catch (error) {
  window.showStartupFailure(error);
}
