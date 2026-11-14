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
- `src/helicopter-flight.js` is authoritative for 117.6m/s flight, four skid-contact ground fitting, continuous descent-assisted landing, five-second engine shutdown and rotor RPM. F boards/exits; G has no action. Camera delay is seven seconds for helicopters, 1 second for ground vehicles, with no return at rest.
- QA: `scripts/qa/check-camping-music.py` renders all ten Float32 stereo excerpts and a complete five-minute track plus crossfade; `scripts/qa/check-helicopter-music.py` exercises real mouse/key inputs and terrain landing in the current game. Production strips development hooks.

## Illustrated title screen (2026-11-07)

- `assets/title-sunset-camp.webp` is the new original 2D anime-style summit sunset campsite art: rear-view couple in chairs, tent and campfire. The balloon title text stays unchanged.
- `src/current-game.js` imports it with `?inline` and puts it in the title screen CSS custom property; `index.html` has responsive backgrounds. Keep the image embedded in both builds so the standalone HTML works offline. Current launch choices stay on the illustration; do not restore the legacy 3D setup screen.
- `scripts/qa/check-title-artwork.py` checks the actual offline bundle at desktop/laptop/mobile sizes, unchanged title, decoded embedded image, menu transitions, zero network requests/errors and absence of dev hooks.

- Scooter inward banking (2026-11-07): keep steering inputs unchanged. In current-game.js `ef`, two-wheel dynamic roll uses -0.013 times speed*yawRate so the bike/rider lean into turns. Other vehicle roll terms stay unchanged. `scripts/qa/check-scooter-lean.py` checks real A/D/arrow controls, inward lean, rider orientation and recovery.

## Direct launch, startup and road camera (2026-11-08)

- `src/title-launcher.js` mounts all trip choices on the illustrated title before the WebGL world exists. Wait for its started promise, keep options usable before launch, then build and enter the world directly. Main initialization and x_ are async; preserve the catch path for initialization failures.
- The 4096² tunnel mask uses visitedTunnelPixels to compute the globally maximal Nl ceiling once per pixel; preserve full grid resolution and all seals/floors. Selected season coloring happens once through Hf.
- `src/terrain-vehicle-camera.js` sets ground vehicle camera heading/grade from road and rendered terrain, not chassis oscillations. Ground delay1s, helicopter7s, no return at rest. First-person ground view uses world direction while seat location still follows the vehicle.
- `scripts/qa/direct_launch.py` replaces the old two-screen start flow for live QA. Use polling=100 for async readiness if test RAF is disabled. `check-launch-and-camera.py` covers the new flow and camera; `check-current-offline.py` checks standalone/offline startup.

## Ground jumps, cabin fit and airplane/parachute (2026-11-08)

- `src/vehicle-jump.js` composes ballistic vertical support with current P1/ef suspension. R jumps, Space keeps the handbrake. Preserve edge-triggering, 120Hz substeps, landing/ceiling contact and aggregated R1 launch/landing/impact flags.
- `src/rider-mount.js` fits the visible posed human (including skinning/hat/hair) inside per-vehicle cabin envelopes. Do not return to a single fixed unscaled rider offset. Restore root scale1 on normal exit and bailout.
- `src/light-airplane.js`: lightweight model and standalone flight physics; bridge runway spawn, W/S throttle, A/D turn, mouse down pitches up/up pitches down, right-button drag orbits. Render pitch with the opposite sign. Grounded stop+F exits; airborne F bails out.
- `src/parachute.js`: velocity-preserving bailout, next F deploys, progressive inflation/drag, WASD canopy steering and terrain/water touchdown. While ejection exists, skip normal walking physics/pose; restore walking/swimming and hide the canopy at touchdown.
- Main entry wires the model/inputs/cameras/HUD/audio/random paint. Existing helicopter mouse-button controls and seven-second return remain unchanged. The new airplane uses the one-second aircraft-camera return.
- `scripts/qa/check-airplane-jump.py` exercises real controls, four ground chassis, both characters in all six vehicles, runway takeoff, bailout/parachute/landing and render output. `check-current-offline.py airplane` verifies the actual standalone release; no argument defaults to helicopter.

## Ground vehicles in water (2026-11-08)

- `src/vehicle-water.js` supplies shallow-bed contact/deep-water buoyancy and immersion-dependent drag/drive/speed limits. The current P1 uses this support in Ga/Gl/suspension/jump. Keep raw height and altitude-aware water callbacks separate; null water must not become a sea-level surface in tunnels.
- Do not restore the removed C1/maxWadeDepth movement gate or waterAllowedAt rejection for ground vehicles. Airborne vehicles above the water have zero water drag; submerged vehicles can drive/steer/reverse and climb out. Dry roads and bridges retain their original support and speed. Existing structure/tree/world-boundary collision stays active.
- `scripts/qa/check-vehicle-water.py` covers all four chassis jumping synthetic/actual streams, deep-water forward/reverse, both bank exits and actual player W/S recovery. `tests/vehicle-water.test.js` covers support/immersion and untouched airborne arcs.

## Weighted landing and suspension (2026-11-08)

- `src/vehicle-suspension.js` owns per-kind weight/impulse/frequency/damping. Current ef supplies attitude targets only. Grounded recovery is strongly damped and cannot rebound above tyre support. Airborne attitude keeps inertia instead of chasing the ground, and vertical gravity belongs only to vehicle-jump.js.
- `src/vehicle-jump.js` compresses on landing, clears stale ground momentum/angular kick, and uses a0.35s settling period. Settling prevents spring re-launch but must never suppress falling off a real drop. Preserve water support and stream crossing.
- `tests/vehicle-weight.test.js` checks landing, settling, mass response and real support loss. `check-vehicle-water.py` now checks all four actual chassis plus real R-key landing and prior water recovery in one browser session.

## Tunnel and stream clearance (2026-11-08)

- `src/stream-clearance.js` carves the FINAL rendered terrain after Jd/road/campsite grading. Keep the triangle footprint and downhill elevation allowance: carving only analytical terrain lets mesh interpolation obstruct the stream. This operation only lowers terrain; preserve watershed points/lakes/waterfall and sea outlet.
- `tunnelExcavationCeiling` deliberately exceeds the visible 17m inner arch to cover mask texel quantization, staying within the 20m rock backing. Preserve floor2.48 threshold and finite portal planes. Nature spawning uses a30m tunnel exclusion including canopy/rock footprint and portal ground mismatches.
- `scripts/qa/check-corridor-clearance.py` checks the actual water mesh, coast outlet, every tunnel's interior mask and all prop colliders. Also run `check-tunnel-portals.py` for all20 portal floors and rendering.

## Road edges and terrain (2026-11-11)

- Current qd must grade against the NEAREST projected segment. Do not take the minimum of all segment heights within the wide underlay radius: that excavates 2–3m trenches next to ascending summit roads.
- `src/road-edge-blend.js` builds a continuous6m smooth verge with4 lateral samples, matching the exact road tangent and overlapping both road/terrain edges. Keep the name `road edge blend`: jd includes these triangles in walking/vehicle support, and camp masking includes them. Never omit a connection merely because the ground differs by0.6m. Preserve tunnel, bridge and water exclusions, checking quad corners as well as centres.
- `scripts/qa/check-road-edges.py` audits all13 roads/both sides, exact inner/outer seams, missing faces and actual walking support, then renders the two summit roads/coast/bridge approach. Existing corridor/portal QA protects tunnels, lake/waterfall and sea outlet.
- `bridgeBedHeight` supplies hidden, narrow approach support within16.15m of the starting bridge's ends so grid interpolation does not drag the land approach down to-5m. Keep the broad bridge CPU/GPU footprint clipping unchanged; the middle of the span and wide apron remain-5m.

## Alpine tributaries and dunes (2026-11-14)

- `src/alpine-waters.js` owns seeded tributaries, low rounded dunes and the cloud mountain's broad alpine ridge/snowline. The active entry integrates them; keep water rendering, map, physics and final terrain clearance aligned.
- Additional channels initialize after the road network. Keep whole reaches away from roads, villages and shops. Preserve graded terrain outside the actual channel footprint; a no-op clearance must never clamp road terrain to natural height. Repeated clearance must be idempotent.
- `scripts/qa/check-alpine-waters.py` validates all four actual streams, water physics, terrain clearance and road distance, then saves alpine/desert/stream canvas views to `/tmp/camper-landscape-*.png`. Run existing road-edge/corridor checks and offline startup too.
