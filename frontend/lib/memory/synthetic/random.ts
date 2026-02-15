export interface SeededRng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: T[]): T;
  bool(probability?: number): boolean;
}

function normalizeSeed(seed: string | number): number {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed: string | number): SeededRng {
  const rand = mulberry32(normalizeSeed(seed));
  return {
    next() {
      return rand();
    },
    int(min, max) {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      return Math.floor(rand() * (hi - lo + 1)) + lo;
    },
    pick<T>(items: T[]) {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty list.");
      }
      return items[this.int(0, items.length - 1)];
    },
    bool(probability = 0.5) {
      return rand() < probability;
    },
  };
}

export function randomIsoBetween(
  rng: SeededRng,
  startIso: string,
  endIso: string
): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const ms = start + (end - start) * rng.next();
  return new Date(ms).toISOString();
}
