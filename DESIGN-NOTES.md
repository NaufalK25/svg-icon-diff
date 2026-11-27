# Design notes

How svg-icon-diff looks and behaves, and the rules that keep every screen consistent. Read this before adding or
changing UI. The redesign that produced it (audit, candidate directions, before/after) is in the git history.

Audience: icon designers and maintainers of icon sets (vscode-icons first) checking new and changed 32×32 SVGs, often
from a pull request, at a desk, switching between a dark editor and the browser. It is a tool, not a landing page:
dense, quiet and predictable.

## Principles

1. **Neutral chrome, colour only for meaning.** Icon reviewers judge colour, so nothing around the icons is tinted.
   Colour means A/B identity, state (added, failing, warning, merged) or the one mark. Never decoration.
2. **One job per look.** A look (colour, box, button style) means one thing everywhere. If two things look the same,
   they are the same kind of thing; if they mean different things, they look different.
3. **One primary action per region**, in solid ink. Everything else is secondary.
4. **The work area reads as the work area.** Stages, code and drop zones sit in a recessed well; the rest is flat.
5. **Sentence case, no ornaments.** No uppercase eyebrows, no middle-dot strings. Mono only for filenames, numbers,
   SHAs and code.

## Tokens

Defined in [app/globals.css](app/globals.css) (`:root` for light, `.dark` for dark) and mapped to Tailwind in
`@theme inline`. Components use semantic utilities only (`bg-card`, `text-success`, `bg-plate-a`); never a raw colour
or a Tailwind palette class like `text-red-500`.

| Token                                 | Light                    | Dark                     | Used for                                                             |
| ------------------------------------- | ------------------------ | ------------------------ | -------------------------------------------------------------------- |
| `background` (paper)                  | `oklch(0.982 0.004 250)` | `oklch(0.225 0.01 258)`  | page ground                                                          |
| `card`                                | `oklch(1 0 0)`           | `oklch(0.258 0.011 258)` | raised panels, cards, inputs                                         |
| `well`                                | `oklch(0.955 0.006 250)` | `oklch(0.195 0.009 258)` | recessed work areas: stage, code, drop zone, segmented tracks, empty |
| `muted`                               | `oklch(0.935 0.007 252)` | `oklch(0.3 0.012 258)`   | hover fill, skeletons                                                |
| `foreground` (ink)                    | `oklch(0.235 0.014 258)` | `oklch(0.945 0.005 250)` | text                                                                 |
| `muted-foreground` (graphite)         | `oklch(0.475 0.016 258)` | `oklch(0.72 0.014 255)`  | secondary text                                                       |
| `border`                              | `oklch(0.885 0.009 252)` | `oklch(0.345 0.013 258)` | hairlines (decorative)                                               |
| `input`                               | `oklch(0.64 0.012 255)`  | `oklch(0.55 0.014 258)`  | control boundaries (3:1)                                             |
| `primary` / `primary-foreground`      | ink / paper              | ink / paper              | the one primary action per region                                    |
| `mark` = `ring`                       | `oklch(0.6 0.135 72)`    | `oklch(0.87 0.165 92)`   | current tab or page underline, focus ring. **Nothing else**          |
| `plate-a` / `-soft`                   | cyan                     | cyan                     | A, base, Before                                                      |
| `plate-b` / `-soft`                   | magenta                  | magenta                  | B, compare, After                                                    |
| `success` / `-soft`                   | green                    | green                    | added, 0% change, smaller, passing                                   |
| `warning` / `-soft`                   | ochre                    | ochre                    | rate limit, truncated PR, "ok" tier                                  |
| `destructive` / `-soft`               | red                      | red                      | errors, failing checks, larger                                       |
| `merged` / `-soft`                    | purple                   | purple                   | merged PR chip (GitHub convention)                                   |
| `code-*`                              | 9 tokens                 | 9 tokens                 | syntax and diff-line colours                                         |
| `stage-*`, `checker-*`, `diff-ground` | `#1e1e1e` / `#fff` …     | same                     | preview grounds, theme-independent on purpose (VS Code-exact)        |
| `overprint-*`, `overlay-*`            | fixed                    | same                     | ink and lines drawn over icons on any ground                         |
| `shadow-overlay`, `scrim`             | per theme                | per theme                | dialogs only                                                         |

Every text pair meets WCAG AA (4.5:1) and every control boundary and focus ring meets 3:1 in both themes. A new
pair must be measured before it ships.

### Type

- **Atkinson Hyperlegible Next** for UI, **Atkinson Hyperlegible Mono** for filenames, numbers, SHAs and code. Use
  `tabular-nums` for numbers that line up or change.
- Page title: `text-3xl sm:text-[2.5rem]`, bold, `tracking-[-0.02em]`. One per page; on a loaded PR the PR title
  (`PrSummary`, `text-2xl sm:text-[1.75rem]`) takes that role.
- Section title: `SECTION_TITLE` (14px semibold), with an optional `SECTION_COUNT`.
- Body `text-sm`; dense tool rows and meta `text-xs`; intro copy `text-base` capped at `max-w-[60ch]`.

### Space, radius, elevation

- 4px scale. Page rhythm: `space-y-8` on Compare and `space-y-6` on PR review, `space-y-3` inside a section.
- Control height: 32px (`h-8`). Tool rows 28px (`h-7`), text inputs 36px (`h-9`), the page-level PR input 44px.
- Radius by role: 4px controls (`rounded-sm`), 6px panels (`rounded-md`), 8px dialogs (`rounded-lg`). The only
  pill is the swipe handle.
- One elevation: dialogs get `shadow-overlay` over a `scrim`. Everything else is flat; the header is solid, no blur.

### Focus and motion

- One global 2px `:focus-visible` outline in `ring`, offset 2px (0 on text fields). Don't override it per component.
- Smallest targets 24×24.
- No new motion. The existing fades and spinners respect `prefers-reduced-motion`.

## Components

Shared class tokens live in [components/ui.ts](components/ui.ts). Use them instead of writing the classes again; if a
role is missing, add a token there rather than a one-off.

| Token / component                                                                        | Role                                                              |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `BUTTON_PRIMARY`                                                                         | the one primary action in a region (solid ink)                    |
| `BUTTON_SECONDARY`                                                                       | every other action                                                |
| `BUTTON_SMALL`, `BUTTON_ICON`                                                            | tool rows; icon-only buttons (always with `title` + `aria-label`) |
| `SEGMENT_GROUP` + `segmentClass`                                                         | pick one of several (modes, sizes)                                |
| `toggleButtonClass`                                                                      | stand-alone on/off (Grid, Guides, Normalize)                      |
| `tabClass`                                                                               | tabs and nav; the mark underlines the current one                 |
| `INPUT_CLASS`, `SELECT_CLASS`                                                            | text fields and selects                                           |
| `PANEL`, `CHIP`, `STAGE_LABEL`, `HINT_LIST`                                              | raised panels, status chips, labels on stages, shortcut hints     |
| `FIELD_ERROR`, `ErrorState`, `NOTICE_*`, `EMPTY_STATE`, `LoadingMessage`, `SkeletonGrid` | states, below                                                     |

Links are underlined ink, not coloured. A/B always use the plate colours, on badges, tray chips, stage labels, swipe
ends and the compare header alike.

## States: one look per case

Every error, loading and empty case on every screen uses exactly one of these. Pick by what the user can do about it,
not by where it happens.

| Case                                                             | Look                                                                                   | Use                                            | Examples                                                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Wrong input:** what was typed, dropped or pasted can't be used | red text directly under that field; field gets `border-destructive` and `aria-invalid` | `FIELD_ERROR` with `role="alert"`              | not a PR link, an issue, no such PR, not an SVG, invalid pasted code, missing base file |
| **Load failed:** trying again may work                           | red box with title, message and **Try again** (plus token help on rate limits)         | `ErrorState`                                   | rate limit, network, GitHub 5xx, a PR file that didn't download                         |
| **Global notice** not tied to a field                            | tinted bar                                                                             | `NOTICE_WARNING`, `NOTICE_ERROR` (dismissible) | low rate limit, truncated PR, sign-in failed                                            |
| **Inside a card:** one item of many failed                       | one line of red text + a small "Try again" icon button                                 | card markup                                    | a PR card whose file didn't load                                                        |
| **Loading**                                                      | spinner + muted text ending in "…"                                                     | `LoadingMessage`; `SkeletonGrid` for a grid    | "Loading the pull request from GitHub…", "Analyzing…"                                   |
| **Nothing to show**                                              | dashed box in the well, left-aligned text                                              | `EMPTY_STATE`                                  | no SVGs in a PR, an empty tab, identical files, a file not in this PR                   |

Rules that go with it:

- **Never both.** A wrong-input message clears the results and any error box; a new submit clears the message.
- **No dead ends.** A failure that retrying can't fix is a wrong-input message, not an `ErrorState` (a 404 PR is
  input, not a load failure). An `ErrorState` always offers Try again.
- **Every section says something.** A section, tab or panel never renders blank: while waiting it shows
  `LoadingMessage`, when empty it shows `EMPTY_STATE`. A section that can't apply at all (the tray before any icon
  is added) may be hidden instead.
- **Errors carry their cause.** Say what went wrong and what to do ("No pull request owner/repo#1234. Check the
  repository and number."), not just a status code.
- **Full width.** Boxes (`ErrorState`, notices, `EMPTY_STATE`) span the content column; long text wraps
  (`wrap-break-word`) and paragraphs inside cap at `max-w-[60ch]`.

## Copy

- Sentence case for everything: titles, buttons, tabs, labels.
- Retry is always **Try again**, in buttons, tooltips and labels.
- Loading text ends with an ellipsis character (`…`), not three dots.
- Name things by the user's words: A/B on Compare, Before/After on a PR, "base" for the merge base.
- Shortcuts are shown as `<kbd>` items in a `HINT_LIST`, not in run-on sentences.

## Checklist for new UI

- [ ] Colours come from tokens; no new colour without a role in the table above.
- [ ] Buttons, inputs, tabs and segmented controls use the `ui.ts` tokens, at the standard heights.
- [ ] Error, loading and empty cases each use the look from the states table, and none renders blank.
- [ ] Works in light and dark, at 375px and 1440px, with a keyboard (visible focus, logical order).
- [ ] New text and control pairs measured against AA.
