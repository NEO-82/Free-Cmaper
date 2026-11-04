# Current game edition

- The active entry is `src/current-game.js`. It restores the complete verified b69df5e release (helicopter, expanded world, summit lake and waterfall). `index.html` contains that edition's embedded styles and font.
- Earlier cloud sessions published only ZIPs; their uncommitted modular source was lost when the environment was replaced. The remaining `src/main.js` and older modules are historical reference, not the current executable. Do not switch the entry back to them and regress the game.
- New tunnel floor logic lives in `src/tunnel-portal-ground.js`, imported by the active entry. Keep CPU ground openings and GPU clipping consistent.
- Use `npm run build` and `npm run build:offline` for current builds. `npm test` includes the historical module suite and the current floor regression tests. `scripts/qa/check-tunnel-portals.py` exercises the actual current runtime and all 20 portals with Chromium/Playwright against localhost:5173.
- Ship the source files and `downloads/Free-Camper-Test.zip` together in Git so a fresh environment retains the current edition. Preserve any user changes.
- Give the user a verified GitHub ZIP download link after completing each change. Do not enable web hosting or GitHub Pages.
