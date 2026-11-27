# svg-icon-diff

A Next.js app to compare SVG icons visually and as code (`/`), and to review the icons in a GitHub pull request
(`/pr`). Everything runs in the browser: files are read from GitHub with the user's optional token, and nothing is
written anywhere. The only server code is the optional GitHub OAuth flow in `app/api/auth/`. See [README.md](README.md)
for features and setup.

## Commands

Use Bun. There is no test suite, so verify with all three checks:

```sh
bun install
bunx tsc --noEmit -p .
bun run lint          # ESLint, including simple-import-sort; `bunx eslint --fix` sorts imports
bun run format:check  # Prettier: single quotes, 120 columns, trailing commas
bun dev               # http://localhost:3000, to see a change working
```

## Layout

- `app/`: pages (`page.tsx` Compare, `pr/[[...pr]]/page.tsx` PR review at `/pr/owner/repo/123`), `globals.css` (all design tokens), `api/auth/` (OAuth).
- `components/`: UI. `ui.ts` holds the shared class tokens; use them instead of writing classes again.
- `hooks/`: state and data (`usePullRequest` loads a PR; `useSvgAnalysis`, `usePixelDiff` do the work off the page).
- `utils/`: pure logic. `githubPr.ts` talks to GitHub, `qualityChecks.ts` scores icons, `pixelDiff.ts` and
  `rasterize.ts` compare renders.
- `context/AppContext.tsx`: icons, token, sign-in, theme and rate limit shared across pages.
- `types/`: shared types.

## Code style

- Keep comments to a minimum. Write one only when the code can't say it: a non-obvious reason, a workaround, a
  GitHub quirk. Never restate what the code does, and don't add doc comments to self-explanatory names.
- Keep pages thin: data and decisions in hooks and utils, markup in components.
- Classify errors where they are thrown (e.g. `PrInputError` in `githubPr.ts` for problems with the input), so the UI
  picks the look from the kind of error, never by matching message text.

## UI rules

[DESIGN-NOTES.md](DESIGN-NOTES.md) is the design reference: tokens, components, states and copy. Read it before
changing UI. The rules broken most easily:

- **Colours only from tokens** in `app/globals.css`, through semantic utilities (`text-destructive`, `bg-plate-a`).
  No raw hex, no Tailwind palette classes. The `mark` colour is for the current tab and focus only.
- **One look per state**, on every screen:
  - wrong input → `FIELD_ERROR` text under the field
  - load failed and retry may help → `ErrorState` with "Try again"
  - global notice → `NOTICE_WARNING` / `NOTICE_ERROR`
  - loading → `LoadingMessage` (or `SkeletonGrid`)
  - nothing to show → `EMPTY_STATE`
- **Never a blank section.** Every tab, panel or section shows loading, content or an empty state.
- **One primary button per region**; everything else `BUTTON_SECONDARY` or smaller.
- **Sentence case**, "Try again" for retry, `…` for loading text, mono only for filenames, numbers and code.
- **Check both themes**, light and dark, and keyboard focus, when you change UI.
