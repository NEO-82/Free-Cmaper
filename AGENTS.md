# Current game edition

- The active entry is `src/current-game.js`. It restores the complete verified b69df5e release (helicopter, expanded world, summit lake and waterfall). `index.html` contains that edition's embedded styles and font.
- Earlier cloud sessions published only ZIPs; their uncommitted modular source was lost when the environment was replaced. The remaining `src/main.js` and older modules are historical reference, not the current executable. Do not switch the entry back to them and regress the game.
- New tunnel floor logic lives in `src/tunnel-portal-ground.js`, imported by the active entry. Keep CPU ground openings and GPU clipping consistent.
- Use `npm run build` and `npm run build:offline` for current builds. `npm test` includes the historical module suite and the current floor regression tests. `scripts/qa/check-tunnel-portals.py` exercises the actual current runtime and all 20 portals with Chromium/Playwright against localhost:5173.
- Ship the source files and `downloads/Free-Camper-Test.zip` together in Git so a fresh environment retains the current edition. Preserve any user changes.
- Give the user a verified GitHub ZIP download link after completing each change. Do not enable web hosting or GitHub Pages.

## Tunnel seals and resident life (2026-11-04)

- `src/tunnel-mountain-seal.js` owns arch-shaped excavation, finite portal planes, outer rock backing and all 20 annular collars. Do not restore rectangular 50/75m approach cuts or circular segment caps outside the entrance planes. Current low-road tunnel floors are 2.5m; pass that floor explicitly to CPU clipping, foundation generation and the matching GPU threshold.
- `src/resident-appearance.js` creates independent resident/shopkeeper models and random exterior paint for every player/AI vehicle. Keep windows, tyres and lamps untouched.
- `src/resident-roads.js` builds the connected, height-aware road graph. `src/resident-traffic.js` manages nine drivers, right-hand lanes, narrow-road yielding, off-lane parking, visits and three activities. Main runtime updates it only while the game advances and adds its OBB colliders to player collision queries.
- Use `scripts/qa/check-resident-life.py` for live scene/AI/bridge/all-portal checks, and `check-resident-appearance.py` for the independent avatar renderer. Capture the WebGL canvas directly; full-page screenshots can wait indefinitely when test RAF is frozen.

## Camping music and helicopter flight (2026-11-04)

- Current music is `src/camping-music-score.js` (ten original 300-second scores) and `src/camping-music-audio.js` (32-bit float stereo Web Audio instruments, shuffled ten-track playlist, 3-second equal-power crossfades). The old bundled short/16-voice music loop has been removed. Keep character and vehicle effects in the current entry.
- `src/helicopter-flight.js` is authoritative for 117.6m/s flight, four skid-contact ground fitting, continuous descent-assisted landing, five-second engine shutdown and rotor RPM. F boards/exits; G has no action. Camera delay is seven seconds for helicopters, 0.2 for ground vehicles, with no return at rest.
- QA: `scripts/qa/check-camping-music.py` renders all ten Float32 stereo excerpts and a complete five-minute track plus crossfade; `scripts/qa/check-helicopter-music.py` exercises real mouse/key inputs and terrain landing in the current game. Production strips development hooks.
