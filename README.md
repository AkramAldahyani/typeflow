<div align="center">

# ♩ TypeFlow

**Type with rhythm. Speed follows.**

A typing practice app that writes every keystroke onto a musical stave, so you can see where you rush, where you hesitate, and when your hands settle into an even pace.

**Live demo:** https://akramaldahyani.github.io/typeflow/

</div>

---

## Why TypeFlow

Most typing sites give you a speed and a score. But speed is a result. Underneath it sits **rhythm**: the even spacing between keystrokes that lets your hands move without second-guessing.

TypeFlow is built around that idea:

- **Rhythm comes first.** Every run gets a rhythm score based on how evenly you type, not only on how fast.
- **A quiet page.** While you type, the screen holds the text, your caret and four numbers. Menus fade back until you stop.
- **Every mistake counts.** Accuracy includes the keys you went back and fixed, and the score shows exactly where each slip happened.
- **Stays on your device.** No account, no backend and no uploads. Your sessions are saved in your browser and nowhere else.

## Features

### Practice
- **Four modes:** Timed (15, 30, 60 or 120 s), Words (10, 25, 50 or 100), Quote (short, medium or long passages from classic books) and Custom (paste up to 2,000 characters of your own text).
- **Three difficulties:** *Gentle* uses short lowercase words, *Standard* uses common words, and *Demanding* adds capitals, punctuation and numbers.
- **Live figures:** clock, wpm, accuracy and mistakes, plus a progress line.
- **Live stave:** each keystroke appears as a note under a moving playhead.
- **Smooth caret:** it glides between letters, pulses on each key press and turns rose after a wrong key.

### Results
- **Tempo marking:** your speed gets a musical name, from *Largo* to *Presto*, with a metronome mark in keystrokes per minute.
- **Your run as a score:** the whole run is laid out as sheet music, with fermatas over pauses longer than a second.
- **Six figures:** accuracy, rhythm, mistakes, raw speed, characters and time.
- **Speed chart:** words per minute, second by second.
- **Notes on the run:** written insights, such as your steadiest stretch, where you paused and which keys you missed most.
- **Average comparison:** how the run compares with your 30-day average.

### Progress
- **Streak and totals:** current streak, best speed, monthly accuracy and rhythm, and total time practised.
- **Twelve weeks of practice, written as music:** each week is a bar, each practice day a chord with one note per session, and each day off a rest.
- **Trend chart:** speed, accuracy or rhythm over the last six weeks.
- **Key heat map:** the keys you miss most often.
- **Recent sessions:** your latest runs, each with a short score excerpt.

### Everywhere
- **Themes:** day and night, following your system setting, with a manual toggle.
- **Phone-friendly:** responsive down to phone widths, and works with mobile keyboards.
- **Accessible:** keyboard accessible, with visible focus. Respects reduced-motion settings.

## Reading the score

| Symbol | Meaning |
| --- | --- |
| Note on the middle line | A keystroke at your own pace |
| Higher note | Quicker than your recent pace |
| Lower note | Slower than your recent pace |
| Rose × | A mistake |
| Thin bar line | A space between words |
| Fermata (arc with a dot) | A pause longer than a second |

An even line of notes means an even hand. That's flow.

## Keyboard shortcuts

| Where | Key | Action |
| --- | --- | --- |
| Practice | Any key | Start typing (the clock starts on your first key) |
| Practice | <kbd>Tab</kbd> | New text |
| Practice | <kbd>Esc</kbd> | Step out of the text |
| Practice | <kbd>Backspace</kbd> / <kbd>Ctrl</kbd> + <kbd>Backspace</kbd> | Delete a letter / a word |
| Results | <kbd>Tab</kbd> | Practise again |
| Home demo | Click the text | Take over the demo |
| Home demo | <kbd>Esc</kbd> | Hand the demo back |

On the results screen, Space and Enter do nothing, so a stray key at the end of a timed run can't skip your results.

## Getting started

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run dev       # start the dev server at http://localhost:5173
npm run build     # type-check and build for production into dist/
npm run preview   # serve the production build locally
```

## Deployment

TypeFlow is a static site. Running `npm run build` produces a `dist/` folder you can upload to any static host: Netlify, Vercel, GitHub Pages, Cloudflare Pages and so on.

Routing uses the URL hash (`#/practice`, `#/progress`), so no server rewrite rules are needed.

## Tech stack

- **[React 18](https://react.dev/)** with **TypeScript**, built with **[Vite](https://vitejs.dev/)**.
- **Hand-written CSS** on a small set of design tokens, with no UI framework.
- **Hand-drawn SVG** for the staves, charts and calendar, with no chart library.
- **Fonts:** [Newsreader](https://fonts.google.com/specimen/Newsreader) for text and headlines, and [Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk) for the interface, both from Google Fonts.

## Project structure

```
src/
├── lib/            # Logic with no UI
│   ├── generate.ts   # Practice text for each mode and difficulty
│   ├── stats.ts      # WPM, accuracy, rhythm score, note pitches, insights
│   ├── history.ts    # Saved runs and generated sample history
│   ├── texts.ts      # Word lists, quotes, demo sentences
│   └── rng.ts        # Seeded random numbers
├── hooks/
│   ├── useTypingSession.ts  # The typing engine (a reducer)
│   └── hooks.ts             # Routing, theme, saved state, sizing
├── components/
│   ├── Stave.tsx         # Live stave, full score, mini score
│   ├── TypingText.tsx    # Practice text with a precisely placed caret
│   ├── TypingInput.tsx   # Hidden input that also works with mobile keyboards
│   ├── LineChart.tsx     # Smooth SVG line chart with tooltip
│   ├── CalendarScore.tsx # Twelve weeks as bars of music
│   ├── KeyHeat.tsx       # Missed-key heat map
│   └── …
├── pages/            # Home, Practice, Results, Progress
└── styles/           # Design tokens (day and night) and base styles
```

## How the numbers work

- **WPM:** correct characters ÷ 5, per minute.
- **Raw speed:** every key you pressed ÷ 5, per minute.
- **Accuracy:** correct keystrokes ÷ all keystrokes. Mistakes you corrected still count.
- **Rhythm:** `100 × e^(−0.75 × CV)`, where CV is the coefficient of variation of the gaps between keystrokes. Pauses of 1.5 seconds or more are left out, so stopping to think isn't punished.
- **Note height:** each gap between keystrokes is compared with the median of your recent gaps. Quicker sits higher and slower sits lower, snapped to stave positions.

## Data and privacy

TypeFlow has no backend. Your settings and finished runs are saved in your browser's `localStorage` under the keys `tf-config` and `tf-history-v1`. You can clear your saved runs at any time from the Progress page.

The Progress page also shows **sample history** next to your own runs, so the charts are useful from day one. It's generated from a fixed seed, so it's the same every time. Your own sessions are marked **Yours**.

## Credits

The practice passages come from public-domain works by Jane Austen, Charlotte Brontë, Lewis Carroll, Charles Dickens, Ralph Waldo Emerson, F. Scott Fitzgerald, Herman Melville, Mary Shelley, Henry David Thoreau, Leo Tolstoy, Mark Twain, Walt Whitman and Oscar Wilde.
