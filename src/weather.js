const PROFILES = {
  clear: { cloudCover: 0.2, wind: 0.45, precipitation: 0 },
  rain: { cloudCover: 0.96, wind: 1.6, precipitation: 1 },
  snow: { cloudCover: 0.9, wind: 0.55, precipitation: 0.7 },
  overcast: { cloudCover: 1, wind: 0.8, precipitation: 0 },
  fog: { cloudCover: 0.65, wind: 0.12, precipitation: 0 },
};

/** A complete, deterministic profile, also used when restoring a saved weather kind. */
export function weatherState(kind, cloudCover) {
  const profile = PROFILES[kind];
  if (!Object.hasOwn(PROFILES, kind)) throw new RangeError(`Unknown weather: ${kind}`);
  const cover = cloudCover ?? profile.cloudCover;
  if (!Number.isFinite(cover) || cover < 0 || cover > 1) throw new RangeError('Cloud cover must be between 0 and 1');
  return { kind, ...profile, cloudCover: cover };
}

function draw(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Weather random values must be in [0, 1)');
  return value;
}

/** One independent hourly draw: clear 70%, precipitation 10%, overcast 10%, fog 10%. */
export function sampleWeather(season, random = Math.random) {
  if (!Number.isInteger(season) || season < 0 || season > 3) throw new RangeError('Season must be an index from 0 to 3');
  if (typeof random !== 'function') throw new TypeError('Weather random source must be a function');
  const chance = draw(random);
  if (chance < 0.7) {
    // A second draw changes only cloud cover, never the weather probabilities.
    const clouds = draw(random);
    return weatherState('clear', clouds < 0.5 ? 0 : 0.15 + (clouds - 0.5) * 0.3);
  }
  if (chance < 0.8) return weatherState(season === 3 ? 'snow' : 'rain');
  if (chance < 0.9) return weatherState('overcast');
  return weatherState('fog');
}
