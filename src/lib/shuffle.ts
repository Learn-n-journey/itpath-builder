/**
 * Deterministic shuffling helpers.
 *
 * A numeric seed drives the order, so the same seed always produces the same
 * sequence. UI code keeps the seed in state and replaces it when the learner
 * asks for a fresh selection.
 */

function seededRandom(seed: number) {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return value / 0xffffffff;
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) || 1;
}

/**
 * Seed state that is stable during server rendering and hydration, then
 * randomised on the client after mount. Using `newSeed()` directly inside
 * `useState` produces a different order on the server than in the browser,
 * which React reports as a hydration mismatch.
 */
export function useShuffleSeed(): [number, () => void] {
  const [seed, setSeed] = useState(1);
  useEffect(() => {
    setSeed(newSeed());
  }, []);
  const reshuffle = useCallback(() => setSeed(newSeed()), []);
  return [seed, reshuffle];
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const next = seededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const a = copy[index] as T;
    const b = copy[swap] as T;
    copy[index] = b;
    copy[swap] = a;
  }
  return copy;
}
