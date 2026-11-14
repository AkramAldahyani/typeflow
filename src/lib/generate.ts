import { COMMON_WORDS, DEFAULT_CUSTOM_TEXT, GENTLE_WORDS, LONG_WORDS, QUOTES, quoteLength } from './texts';
import { mulberry32, pick, type Rng } from './rng';

export type Mode = 'time' | 'words' | 'quote' | 'custom';
export type Difficulty = 'gentle' | 'standard' | 'demanding';
export type QuoteLength = 'short' | 'medium' | 'long';

export interface PracticeConfig {
  mode: Mode;
  time: number;
  words: number;
  quoteLength: QuoteLength;
  difficulty: Difficulty;
  customText: string;
}

export const MODES: Mode[] = ['time', 'words', 'quote', 'custom'];
export const TIME_OPTIONS = [15, 30, 60, 120];
export const WORD_OPTIONS = [10, 25, 50, 100];

export const DEFAULT_CONFIG: PracticeConfig = {
  mode: 'time',
  time: 30,
  words: 25,
  quoteLength: 'medium',
  difficulty: 'standard',
  customText: DEFAULT_CUSTOM_TEXT,
};

export interface PracticeText {
  text: string;
  label: string;
  source?: string;
}

const PUNCT = [',', ',', ',', '.', '.', ';', '?', '!', ':'];

/** Generator that keeps context across calls, so timed mode can keep extending text seamlessly. */
export function wordStream(difficulty: Difficulty, rng: Rng) {
  const pool = difficulty === 'gentle' ? GENTLE_WORDS : difficulty === 'demanding' ? [...COMMON_WORDS, ...LONG_WORDS, ...LONG_WORDS] : COMMON_WORDS;
  let prev = '';
  let capNext = true;

  return (count: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      let w = pick(rng, pool);
      while (w === prev) w = pick(rng, pool);
      prev = w;
      if (difficulty === 'demanding') {
        if (rng() < 0.05) {
          w = String(Math.floor(rng() * 1990) + 10);
        } else if (capNext || rng() < 0.06) {
          w = w[0].toUpperCase() + w.slice(1);
        }
        capNext = false;
        const r = rng();
        if (r < 0.03) w = `(${w})`;
        else if (r < 0.05) w = `"${w}"`;
        if (rng() < 0.17) {
          const p = pick(rng, PUNCT);
          w += p;
          capNext = '.?!'.includes(p);
        }
      }
      out.push(w);
    }
    return out;
  };
}

/** Gentle difficulty turns any passage into lowercase words without punctuation. */
const soften = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const normaliseCustom = (text: string) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);

const difficultyName: Record<Difficulty, string> = {
  gentle: 'gentle',
  standard: 'standard',
  demanding: 'demanding',
};

export function buildText(config: PracticeConfig, seed: number): PracticeText {
  const rng = mulberry32(seed);
  switch (config.mode) {
    case 'time': {
      const words = wordStream(config.difficulty, rng)(140);
      return { text: words.join(' '), label: `${config.time} seconds of ${difficultyName[config.difficulty]} words` };
    }
    case 'words': {
      const words = wordStream(config.difficulty, rng)(config.words);
      return { text: words.join(' '), label: `${config.words} ${difficultyName[config.difficulty]} words` };
    }
    case 'quote': {
      const options = QUOTES.filter((q) => quoteLength(q) === config.quoteLength);
      const q = pick(rng, options.length ? options : QUOTES);
      const text = config.difficulty === 'gentle' ? soften(q.text) : q.text;
      return { text, label: q.source, source: q.source };
    }
    case 'custom': {
      const raw = normaliseCustom(config.customText) || DEFAULT_CUSTOM_TEXT;
      const text = config.difficulty === 'gentle' ? soften(raw) : raw;
      return { text, label: 'Your own text' };
    }
  }
}
