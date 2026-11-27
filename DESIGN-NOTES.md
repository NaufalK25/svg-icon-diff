# Design notes: svg-icon-diff redesign

Scope: the whole app (`/` Compare, `/pr` PR review, the PR file view, and the dialogs). Visual and layout changes only;
routes, data flow, behaviour and copy meaning stay as they are. Brand constraints: none given, so the palette and type
are chosen below.

Audience: icon designers and maintainers of icon sets (the fixtures and defaults point at vscode-icons) who check new
and changed 32×32 SVGs, often from a pull request, at a desk, switching between a dark editor and the browser.
impeccable surface mode: **Operate** (a tool, not a landing page).

---

## Phase 1: the page as it was

Screenshots were taken of 8 states at 375 / 768 / 1440 in dark and light, compared before and after, then removed after review.

### Palette (app/globals.css, shadcn neutral defaults + Tailwind blue)

| Token             | Light                                     | Dark                  | Notes                                                          |
| ----------------- | ----------------------------------------- | --------------------- | -------------------------------------------------------------- |
| background        | `#fafafa`                                 | `#0a0a0a`             | near-black in dark                                             |
| foreground        | `#0a0a0a`                                 | `#f0f0f0`             |                                                                |
| card / popover    | `#ffffff`                                 | `#161616` / `#111111` |                                                                |
| primary           | `#0a0a0a`                                 | `#ffffff`             | defined, never used by a component                             |
| secondary         | `#f9f9f9`                                 | `#1e1e1e`             | unused                                                         |
| muted             | `#e5e5e5`                                 | `#333333`             |                                                                |
| muted-foreground  | `#666666`                                 | `#888888`             |                                                                |
| accent            | `#3b82f6`                                 | `#3b82f6`             | Tailwind blue-500: buttons, links, active tabs, toggles, focus |
| accent-foreground | `#ffffff`                                 | `#0a0a0a`             |                                                                |
| destructive       | `#ef4444`                                 | `#ff6b6b`             |                                                                |
| border            | `#e5e5e5`                                 | `#222222`             |                                                                |
| input             | `#f9f9f9`                                 | `#161616`             |                                                                |
| ring              | `#3b82f6`                                 | `#3b82f6`             |                                                                |
| chart-1 … 5       | `#3b82f6 #8b5cf6 #ec4899 #f59e0b #10b981` | same                  | chart-1 = A, chart-3 = B, chart-2 = merged                     |
| sidebar-*         | 8 tokens                                  | 8 tokens              | unused                                                         |

Hard-coded colours outside the tokens: Tailwind `green/red/yellow/orange/lime-*` in 14 files; `#1e1e1e` / `white`
preview grounds; `#d4d4d4` checker; `#ff6b9d` guide; `#22d3ee` bounding box; 12 GitHub syntax hexes in
`utils/highlight.ts`; `#444 / #666 / #ccc / #aaa` scrollbars; `rgba(0,0,0,.4)` swipe-handle shadow; `bg-black/60`
labels; a 10-step red→lime→green ladder in `utils/qualityChecks.ts`.

### Type

- DM Sans (UI) via `--font-dm-sans`, JetBrains Mono (filenames, numbers, code) via `--font-jetbrains-mono`.
- Sizes in use: 12px (`text-xs`, ~70% of all text), 14px (`text-sm`), 16px (`text-base`, logo only at sm), 18px
  (`text-lg`: page headings, logo at lg), 30px (`text-3xl`: quality score). Weights 400/500/600/700.
- Section titles: 12px semibold UPPERCASE tracking-wide muted (“ICONS (4)”, “ADDED (3)”, “SIZE LADDER”).
- No line-height or measure rules; the intro paragraph runs ~150 characters wide at 1440.

### Spacing, radius, shadows

- Spacing: Tailwind 4px scale; used steps 2, 4, 6, 8, 10, 12, 16, 20, 24, 40px. Page rhythm `space-y-6` on Compare
  and `space-y-5` on PR. Buttons come in four paddings (`px-2 py-1`, `px-2.5 py-1.5`, `px-3 py-1.5`, `px-4 py-2`).
- Radius: `--radius: 0.5rem`, but components use `rounded` (4px) for nearly everything, `rounded-lg` (8px) for the
  drop zone and dialogs, `rounded-t` on tabs, `rounded-full` on the swipe handle and avatars.
- Shadows: `shadow-2xl` on the three dialogs, a hard 1px `rgba(0,0,0,.4)` ring on the swipe divider. The header is
  translucent with `backdrop-blur`.

### Components on the page

Header (logo, Compare / PR review nav, rate-limit meter, Sign in, theme toggle, token panel) · DropZone (full and
compact) · PasteDialog · SvgTray (icon chips with A/B badges) · CompareView (Visual / Code diff / Metadata tabs) ·
CompareToolbar (5 modes, size, zoom, background, Grid, Guides, File/Folder) · Stage + Swipe / Difference / Onion /
Blink / Side-by-side views · RangeInput · AllVsBaseGrid · CodeDiff · CodeView · MetadataDiff (table) · PrUrlInput ·
PrSummary · PrCaseTabs (All/Added/Updated + sort + size) · PrFileGrid with AddedCard / UpdatedCard · PrFileView
(full-screen file view) · AddedIconView (previews, size ladder, quality checks, metadata, theme pair, source, compare
with) · QualityChecklist · SizeLadder · GridPreview + modal · ErrorState · SkeletonGrid.

---

## Phase 2: audit

> ⚠️ DEGRADED: single-context. impeccable's `/critique` asks for two isolated sub-agents and its `detect` binary.
> Sub-agents were not requested, and the binary is a download this run chose not to execute (see the skills security
> note in the report), so Assessment B is replaced by the manual anti-pattern pass and measured contrast below.
> Nothing was persisted to `.impeccable/`.

### impeccable /audit (technical)

| #   | Dimension                | Score     | Key finding                                                                                                                                                                                                                                       |
| --- | ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Accessibility            | 2         | 7 light-mode text pairs under 4.5:1 (blue links 3.52, white on blue buttons 3.68, active nav 2.92, green/red/pink text 3.2–3.6); inputs use a 1px `focus:ring-1` instead of a visible focus ring; tray “remove” and card “retry” targets are 16px |
| 2   | Performance              | 3         | Fine for the job; `transition-all` on tabs; `backdrop-blur` on a sticky header repaints on scroll                                                                                                                                                 |
| 3   | Theming                  | 1         | Tokens exist but ~120 hard-coded colour classes bypass them; 13 tokens defined and unused; dark mode is a near-black inversion                                                                                                                    |
| 4   | Responsive               | 2         | At 375 the header wraps into an orphan row (Sign in alone); PR title truncates to two words; toolbar wraps into 4 ragged rows                                                                                                                     |
| 5   | Implementation integrity | 2         | Three different segmented-control implementations, four button sizes, the same `uppercase tracking-wide` label copied into 5 files                                                                                                                |
|     | **Total**                | **10/20** | **Acceptable: significant work needed**                                                                                                                                                                                                           |

### impeccable /critique (design)

Design specificity: **fails**. Cover the logo and it is any shadcn starter: neutral greys, Tailwind blue-500 for
everything clickable, the default chart palette for A/B. Nothing in the look comes from comparing icons.

| #   | Heuristic                       | Score     | Key issue                                                                                     |
| --- | ------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3         | Loading, rate limit, per-file errors all shown; rate meter is a decorative bar                |
| 2   | Match with the real world       | 3         | A/B, before/after, VS Code grounds are right for icon people                                  |
| 3   | User control and freedom        | 3         | Esc, swap, clear, back all present                                                            |
| 4   | Consistency and standards       | 1         | Same blue means “primary button”, “link”, “current page”, “active toggle” and “focus” at once |
| 5   | Error prevention                | 3         | URL validation, threshold, normalize                                                          |
| 6   | Recognition rather than recall  | 2         | Shortcuts live in middle-dot run-on sentences                                                 |
| 7   | Flexibility and efficiency      | 4         | 1–5, X, ←/→, [ ], Space, Ctrl+V                                                               |
| 8   | Aesthetic and minimalist design | 1         | 14 equal-weight controls in one toolbar row; olive score card; five uppercase eyebrows        |
| 9   | Error recovery                  | 3         | Retry everywhere; “Try Again” capitalised differently from the rest                           |
| 10  | Help and documentation          | 3         | Inline hints and tooltips                                                                     |
|     | **Total**                       | **26/40** |                                                                                               |

Strengths to keep: keyboard model, honest data (pixel %, byte deltas, checks), VS Code-exact preview grounds, the
A/B vocabulary. Persona red flag (maintainer reviewing a 40-icon PR at 1440): the PR title, the thing they came to
check, is the same 14px weight as the SHAs beside it, and the primary “Review” button is the same blue as the active
tab, so the eye has no first stop.

### Anti-pattern check (design-anti-patterns skill unavailable, checked by hand against its list and frontend-design's tells)

| Pattern                         | Found?        | Where                                                                                          |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| Purple/blue gradients           | No            | –                                                                                              |
| Glassmorphism                   | **Yes, mild** | sticky header `bg-background/60 backdrop-blur`                                                 |
| Oversized rounded corners       | No            | radii are small, but **inconsistent** (4 / 8 / pill / tab-top)                                 |
| Generic 3-card icon grid        | No            | the PR file grid is real data, cards are justified                                             |
| Decorative stats                | **Yes**       | 10-step red→green score card; quality score shown twice on the added-icon view; rate-limit bar |
| Floating blobs                  | No            | –                                                                                              |
| Emoji icons                     | No            | lucide throughout                                                                              |
| Centered-everything             | **Partly**    | empty drop zone, error state, swipe/blink caption rows centered under a left-aligned page      |
| Weak hierarchy                  | **Yes**       | 18px page title vs 14px body; PR title at body size; primary CTA = toggle colour               |
| Gray-on-gray low contrast       | **Yes**       | `#888` on `#333` rate pill (3.56); blue on blue-tint active nav (2.92)                         |
| Inconsistent spacing            | **Yes**       | `space-y-5` vs `space-y-6`; four button paddings; tabs `px-3` vs `px-4`                        |
| Uppercase tracked eyebrows      | **Yes**       | 5 files                                                                                        |
| Middle-dot meta strings         | **Yes**       | tray hint, swipe hint, blink hint, card meta “8/9 · 203 B”                                     |
| Tinted near-black for black     | **Yes**       | `#0a0a0a` dark ground                                                                          |
| Default blue as the only colour | **Yes**       | `#3b82f6` everywhere                                                                           |

### Ranked issues

1. **One colour for five jobs.** Blue-500 is the primary button, links, current nav, active toggles and focus ring.
   _Reads as slop:_ it is the framework default, so nothing signals priority. _Fix:_ ink-solid primary action, plain
   underlined links, neutral segmented controls, and a single sharp accent reserved for “current” and focus.
2. **A/B colours are the default chart palette.** Blue and pink from `chart-1/chart-3`, with violet for merged.
   _Reads as slop:_ borrowed from a dashboard kit, unrelated to comparing two drawings. _Fix:_ make A/B the product's
   signature: two print-registration plates (cyan, magenta) used consistently on badges, tray chips, labels, swipe
   ends and the compare header.
3. **Light mode fails AA in 7 places.** _Fix:_ every pair re-derived in OKLCH and measured (table in the report).
4. **No first stop on any screen.** 18px page title, PR title at body size, toolbar of 14 equal controls. _Fix:_
   real heading scale; PR title as the page heading; toolbar grouped into labelled clusters; the stage set in its own
   well so the work area reads as the work area.
5. **Uppercase tracked section labels and middle-dot hint strings.** _Reads as slop:_ template chrome. _Fix:_
   sentence-case semibold headings with a muted count; hints as a row of `<kbd>` items.
6. **Decorative score ladder.** Olive/lime/orange 10-step card, score repeated in a big tile. _Fix:_ neutral panel,
   score coloured by tier (good / ok / poor) only.
7. **Glass header.** _Fix:_ solid ground and a hairline, no blur.
8. **Header breaks at 375.** _Fix:_ nav moves to its own full-width row on phones.
9. **Inconsistent controls.** Three segmented implementations, four button sizes, three radii. _Fix:_ one set of
   shared class tokens (`components/ui.ts`), one control height (32px), radius 4/6/8 by elevation.
10. **Hard-coded colours.** _Fix:_ every colour becomes a CSS variable in `app/globals.css`; components use
    semantic utilities only (`text-success`, `bg-plate-a`, `bg-stage-dark` …).
11. **Weak focus.** 1px `ring-1` on inputs, browser default elsewhere. _Fix:_ one global 2px `:focus-visible` outline
    in the accent colour with offset; 24px minimum for the small icon buttons.

---

## Phase 3: direction

### Two candidates

**A. Registration plates:** cool graphite paper and ink, the two versions as cyan and magenta print plates, one
registration-yellow mark for “current” and focus; Atkinson Hyperlegible, set tight and dense.

| Token                      | Light                    | Dark                     |
| -------------------------- | ------------------------ | ------------------------ |
| paper (ground)             | `oklch(0.982 0.004 250)` | `oklch(0.225 0.01 258)`  |
| ink (text, primary action) | `oklch(0.235 0.014 258)` | `oklch(0.945 0.005 250)` |
| graphite (secondary text)  | `oklch(0.475 0.016 258)` | `oklch(0.72 0.014 255)`  |
| plate A (cyan)             | `oklch(0.505 0.105 228)` | `oklch(0.78 0.115 220)`  |
| plate B (magenta)          | `oklch(0.53 0.2 355)`    | `oklch(0.75 0.165 355)`  |
| mark (registration yellow) | `oklch(0.6 0.135 72)`    | `oklch(0.87 0.165 92)`   |

Fonts: Atkinson Hyperlegible Next (UI) + Atkinson Hyperlegible Mono (filenames, numbers, code), one family in two
cuts, drawn for character distinction (0/O, 1/l/I), which matters when reading `file_type_light_*` names and hex
values. Dials (taste-skill v1 scale): **VARIANCE 3 · MOTION 2 · DENSITY 7.**

**B. Light table:** warm charcoal darkroom chrome around a lit stage, amber safelight accent; Instrument Sans +
Martian Mono.

| Token              | Value (dark-first)     |
| ------------------ | ---------------------- |
| chrome             | `oklch(0.23 0.012 60)` |
| surface            | `oklch(0.27 0.012 60)` |
| lit stage          | `oklch(0.97 0.01 85)`  |
| ink                | `oklch(0.94 0.01 80)`  |
| muted              | `oklch(0.7 0.015 70)`  |
| safelight (accent) | `oklch(0.8 0.15 70)`   |
| danger             | `oklch(0.65 0.19 30)`  |

Dials: **VARIANCE 5 · MOTION 3 · DENSITY 5.**

### Choice: A, Registration plates

Icon reviewers judge colour, so the chrome around the icons has to stay chromatically quiet: B's warm charcoal and
amber would tint every icon by simultaneous contrast, and amber cannot hold AA on a light theme. A grows out of the
app's own A/B vocabulary (overlaying two plates and checking they register is exactly what swipe, onion and
difference do), so it reads as this product and as a tool, in both themes.

Principles for A:

- Neutral chrome, colour only for meaning: A/B identity, state (added / failing / warning / merged), and the one mark.
- The primary action is ink, not colour. Links are underlined ink.
- The mark (yellow/ochre) appears only on the current tab or page and the focus ring.
- The stage sits in a recessed well; everything else stays flat. One elevation (dialogs) gets a shadow.
- Sentence case everywhere, no eyebrows, no middle-dot strings. Mono only for filenames, numbers and code.
- Radius by role: 4px controls, 6px panels, 8px dialogs. Nothing pill-shaped except the swipe handle.
- Motion: none added. Existing fades stay and respect `prefers-reduced-motion`.

Tokens: `app/globals.css` (`:root` and `.dark`, mapped to Tailwind in `@theme inline`). The final table is in the
report and at the end of this file once built.

---

## Phase 4–5: as built

### Final tokens (pp/globals.css)

| Token                                                              | Light                                              | Dark                                             | Used for                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| `--background` (paper)                                             | `oklch(0.982 0.004 250)`                           | `oklch(0.225 0.01 258)`                          | page ground                                                        |
| `--card`                                                           | `oklch(1 0 0)`                                     | `oklch(0.258 0.011 258)`                         | raised panels, cards, inputs                                       |
| `--well`                                                           | `oklch(0.955 0.006 250)`                           | `oklch(0.195 0.009 258)`                         | recessed work areas: stage well, code, drop zone, segmented tracks |
| `--muted`                                                          | `oklch(0.935 0.007 252)`                           | `oklch(0.3 0.012 258)`                           | hover fill, skeletons                                              |
| `--foreground` (ink)                                               | `oklch(0.235 0.014 258)`                           | `oklch(0.945 0.005 250)`                         | text                                                               |
| `--muted-foreground` (graphite)                                    | `oklch(0.475 0.016 258)`                           | `oklch(0.72 0.014 255)`                          | secondary text                                                     |
| `--border`                                                         | `oklch(0.885 0.009 252)`                           | `oklch(0.345 0.013 258)`                         | hairlines                                                          |
| `--input`                                                          | `oklch(0.64 0.012 255)`                            | `oklch(0.55 0.014 258)`                          | control boundaries (3:1)                                           |
| `--primary` / `--primary-foreground`                               | ink / paper                                        | ink / paper                                      | the one primary action per region                                  |
| `--mark` = `--ring`                                                | `oklch(0.6 0.135 72)`                              | `oklch(0.87 0.165 92)`                           | current tab or page underline, focus ring (only)                   |
| `--plate-a` / `-soft`                                              | `oklch(0.505 0.105 228)` / `oklch(0.95 0.025 228)` | `oklch(0.78 0.115 220)` / `oklch(0.3 0.04 225)`  | A, base, Before                                                    |
| `--plate-b` / `-soft`                                              | `oklch(0.53 0.2 355)` / `oklch(0.955 0.025 355)`   | `oklch(0.75 0.165 355)` / `oklch(0.31 0.05 355)` | B, compare, After                                                  |
| `--success` / `-soft`                                              | `oklch(0.5 0.12 150)` / `oklch(0.95 0.035 150)`    | `oklch(0.78 0.14 152)` / `oklch(0.31 0.045 152)` | added, 0% change, smaller, passing                                 |
| `--warning` / `-soft`                                              | `oklch(0.53 0.12 70)` / `oklch(0.96 0.045 85)`     | `oklch(0.83 0.13 80)` / `oklch(0.315 0.045 80)`  | rate limit, truncated PR, ok tier                                  |
| `--destructive` / `-soft`                                          | `oklch(0.53 0.19 25)` / `oklch(0.955 0.025 25)`    | `oklch(0.73 0.16 22)` / `oklch(0.31 0.05 22)`    | errors, failing checks, larger                                     |
| `--merged` / `-soft`                                               | `oklch(0.5 0.15 305)` / `oklch(0.95 0.03 305)`     | `oklch(0.76 0.12 305)` / `oklch(0.315 0.05 305)` | merged PR chip (GitHub convention)                                 |
| `--code-*`                                                         | 9 tokens                                           | 9 tokens                                         | syntax and diff-line colours                                       |
| `--stage-dark` / `--stage-light` / `--checker-*` / `--diff-ground` | `#1e1e1e` / `#fff` / `#d4d4d4 #fff` / `#000`       | same                                             | preview grounds, deliberately theme-independent                    |
| `--overlay-guide` / `-bbox` / `-divider`                           | lifted magenta / cyan / mark                       | same                                             | lines drawn over icons on any ground                               |
| radius                                                             | 4 / 6 / 8px                                        |                                                  | controls / panels / dialogs                                        |
| `--shadow-overlay`                                                 | one value per theme                                |                                                  | dialogs only                                                       |
| fonts                                                              | Atkinson Hyperlegible Next + Mono                  |                                                  | UI + filenames, numbers, code                                      |

Shared control classes: `components/ui.ts`.

### Anti-pattern re-check (after)

| Pattern                                            | Status                                                                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Purple/blue gradients, floating blobs, emoji icons | none                                                                                                                         |
| Glassmorphism                                      | removed: solid header                                                                                                        |
| Oversized / inconsistent radii                     | 4 / 6 / 8 by role; the only pill is the swipe handle (a drag grip)                                                           |
| Generic card grids                                 | PR/all-vs-base grids kept: each card is one real file and a button. Justified                                                |
| Decorative stats                                   | score ladder and rate-limit bar removed; the big score on the added-icon view stays as the one bold number, coloured by tier |
| Centered-everything                                | empty states and error state left-aligned; the stage stays centred in its well because it is the canvas                      |
| Weak hierarchy                                     | 40px page titles, PR title as the heading, one ink primary per region                                                        |
| Gray-on-gray                                       | every pair measured, table below                                                                                             |
| Inconsistent spacing                               | 4px scale, 32px control height, page rhythm 32/24/12px                                                                       |
| Uppercase eyebrows, middle-dot strings             | removed (hint lists use hairline separators)                                                                                 |
| Tinted near-black                                  | dark ground is graphite `#191c20`, not `#0a0a0a`                                                                             |
| Default blue                                       | gone; no colour without a role                                                                                               |

Justified exceptions: GitHub-purple `--merged` (domain convention; taste-skill bans violet as decoration, this is state); monospace for filenames, sizes, SHAs and code (data, not costume).

### Contrast (computed from the tokens; WCAG 2.x)

| Pair                                          | Tokens                                    | Needs | Light | Dark  |
| --------------------------------------------- | ----------------------------------------- | ----- | ----- | ----- |
| Body text                                     | `foreground` on `background`              | 4.5:1 | 15.83 | 14.56 |
| Text on cards / panels                        | `foreground` on `card`                    | 4.5:1 | 16.67 | 13.31 |
| Text in stage well, code                      | `foreground` on `well`                    | 4.5:1 | 14.63 | 15.57 |
| Secondary text                                | `muted-foreground` on `background`        | 4.5:1 | 6.34  | 6.90  |
| Secondary text on cards                       | `muted-foreground` on `card`              | 4.5:1 | 6.68  | 6.30  |
| Secondary text in well                        | `muted-foreground` on `well`              | 4.5:1 | 5.86  | 7.38  |
| Secondary text on hover fill                  | `muted-foreground` on `muted`             | 4.5:1 | 5.52  | 5.50  |
| Primary button label                          | `primary-foreground` on `primary`         | 4.5:1 | 15.83 | 14.56 |
| A label text                                  | `plate-a` on `background`                 | 4.5:1 | 5.38  | 8.82  |
| B label text                                  | `plate-b` on `background`                 | 4.5:1 | 5.61  | 7.11  |
| A text on card                                | `plate-a` on `card`                       | 4.5:1 | 5.67  | 8.06  |
| B text on card                                | `plate-b` on `card`                       | 4.5:1 | 5.91  | 6.50  |
| A badge                                       | `plate-foreground` on `plate-a`           | 4.5:1 | 5.38  | 8.82  |
| B badge                                       | `plate-foreground` on `plate-b`           | 4.5:1 | 5.61  | 7.11  |
| Updated chip                                  | `plate-a` on `plate-a-soft`               | 4.5:1 | 4.92  | 6.96  |
| Filename on selected A chip                   | `foreground` on `plate-a-soft`            | 4.5:1 | 14.48 | 11.50 |
| Bytes on selected A chip                      | `muted-foreground` on `plate-a-soft`      | 4.5:1 | 5.80  | 5.45  |
| Filename on selected B chip                   | `foreground` on `plate-b-soft`            | 4.5:1 | 14.48 | 11.47 |
| Bytes on selected B chip                      | `muted-foreground` on `plate-b-soft`      | 4.5:1 | 5.80  | 5.43  |
| "new" / Open chip                             | `success` on `success-soft`               | 4.5:1 | 4.96  | 6.81  |
| Success numbers on cards                      | `success` on `card`                       | 4.5:1 | 5.67  | 8.24  |
| Success numbers on page                       | `success` on `background`                 | 4.5:1 | 5.39  | 9.02  |
| Warning tier score                            | `warning` on `card`                       | 4.5:1 | 5.42  | 9.15  |
| Warning notice text                           | `foreground` on `warning-soft`            | 4.5:1 | 14.81 | 11.05 |
| Error notice                                  | `destructive` on `destructive-soft`       | 4.5:1 | 5.05  | 5.24  |
| Error state body / newly failing row          | `foreground` on `destructive-soft`        | 4.5:1 | 14.45 | 11.45 |
| Failing checks on cards                       | `destructive` on `card`                   | 4.5:1 | 5.83  | 6.09  |
| Error text on page                            | `destructive` on `background`             | 4.5:1 | 5.53  | 6.67  |
| Merged chip                                   | `merged` on `merged-soft`                 | 4.5:1 | 5.53  | 5.88  |
| Code: element names                           | `code-name` on `well`                     | 4.5:1 | 5.77  | 10.06 |
| Code: attribute names                         | `code-attr` on `well`                     | 4.5:1 | 5.42  | 11.14 |
| Code: values                                  | `code-string` on `well`                   | 4.5:1 | 11.96 | 12.76 |
| Code: punctuation                             | `code-punct` on `well`                    | 4.5:1 | 5.86  | 6.35  |
| Diff: element names                           | `code-name` on `card`                     | 4.5:1 | 6.58  | 8.60  |
| Diff: attribute names                         | `code-attr` on `card`                     | 4.5:1 | 6.18  | 9.52  |
| Stage label on dark stage (label ground 72%)  | `stage-label-foreground` on `stage-dark`  | 4.5:1 | 18.97 | 18.97 |
| Stage label on light stage (label ground 72%) | `stage-label-foreground` on `stage-light` | 4.5:1 | 8.15  | 8.15  |
| Focus ring / current marker (non-text)        | `mark` on `background`                    | 3:1   | 3.84  | 11.52 |
| Focus ring on cards (non-text)                | `mark` on `card`                          | 3:1   | 4.05  | 10.53 |
| Input boundary (non-text)                     | `input` on `background`                   | 3:1   | 3.19  | 3.53  |
| Input boundary on card (non-text)             | `input` on `card`                         | 3:1   | 3.36  | 3.22  |

Verification: keyboard walk of Compare, PR review and the PR file view in both themes: every stop shows the 2px mark-coloured ring, order follows the visual order, smallest targets 24×24. `npm run lint`, `tsc --noEmit`, `prettier --check` and `next build` pass. The project has no test suite.
