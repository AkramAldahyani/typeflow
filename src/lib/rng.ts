/** Small seeded PRNG so generated texts and sample history are reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Box–Muller normal sample. */
export function gauss(rng: Rng, mean = 0, sd = 1) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
