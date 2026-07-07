# Sudoku

A cross-platform Sudoku game built with **React Native (Expo)**, styled after the
Claude.ai aesthetic — warm cream surfaces, clay-orange accent, calm typography.

## Features

- Puzzle generator producing **uniquely-solvable** boards at four difficulties (Easy → Expert)
- **Daily Puzzle** — seeded by the date, so everyone gets the same board; daily streak tracking
- Notes / pencil mode, **Auto-notes** (fills the selected cell), **Hint** (3 per game), **Undo**, and **Erase**
- Row / column / box highlighting + same-value highlighting; conflicts and wrong entries flagged in red
- Mistake counter, live timer, **pause** (auto-pauses when backgrounded)
- Optional **3-mistake limit** mode
- Win screen with confetti; haptic feedback on native
- **Keyboard support on web** — 1-9 place, arrows move, N notes, U undo, H hint, P pause, Backspace erase
- **Light & dark mode** (follows system, with a manual toggle)
- In-progress game, settings, and stats (win rate, best/average time, streaks) persisted via AsyncStorage

## Run

```bash
npm install
npm start          # Expo dev server — press i (iOS), a (Android), or w (web)
```

- **Phone:** install the **Expo Go** app, then scan the QR code from `npm start`.
- **Browser:** `npm run web`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run web` | Run in the browser |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:engine` | Verify generated puzzles are uniquely solvable |

## Release (App Store / Play Store)

Built for [EAS](https://docs.expo.dev/eas/). One-time setup: an Apple Developer account,
`npm i -g eas-cli`, `eas login`, and `git init` if this folder isn't a repo yet.

```bash
eas build --platform ios --profile production   # cloud build; EAS manages signing
eas submit --platform ios --latest              # upload to App Store Connect
```

Icons/splash live in `assets/` (regenerable — clay `#` mark on the app palette).
Bundle IDs are `com.javiergonzalez.sudoko` in `app.json`; change them before the first
submit if desired (they're permanent after that). Store metadata (screenshots,
description, privacy policy URL) is filled in App Store Connect; the app collects no
data — everything is on-device.

## Layout

```
app/                 Expo Router screens (Home, Game, Stats) + root layout
src/engine/          Pure Sudoku logic — generate / solve / validate
src/store/           Zustand game store + persistence
src/theme/           Claude-style palette + theme provider
src/components/       Board, Cell, NumberPad, Controls, Header
scripts/             Engine sanity check
```
