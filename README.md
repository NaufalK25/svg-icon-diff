# svg-icon-diff

Compare SVG icons visually and as code, and review the icons in a GitHub pull request.

Signing in only raises the API rate limit and, if you choose, lets it read private repositories. Nothing is written to
your repositories.

## Features

### Compare (`/`)

Drop, pick or paste SVG files, then compare them against a base icon.

- **Visual**: side by side, swipe, difference, onion skin, blink and overprint modes, plus previews at several sizes
- **Code diff**: a line diff of the formatted SVG source
- **Metadata**: dimensions, viewBox, file size and other attributes side by side
- **Quality checklist** for 32×32 icons: dimensions, viewBox, origin at (0, 0), size under 2 KB, vector only, 2px
  margin, centered, single line and clean attributes

### PR review (`/pr`)

Paste a pull request link (`https://github.com/owner/repo/pull/123`) to see every added and updated SVG in it. Updated
icons open in the same comparison view, against the PR's merge base. Links are shareable: `/pr?url=…&file=…`.

### Keyboard shortcuts

| Key         | Action                       |
| ----------- | ---------------------------- |
| Number keys | Pick a comparison mode       |
| `Space`     | Play or pause blink          |
| `x`         | Swap the compared icons      |
| `[` / `]`   | Previous / next file in a PR |
| `←` / `→`   | Previous / next icon         |
| `/`         | Focus search                 |
| `c`         | Copy link                    |
| `Esc`       | Close the open panel         |

## GitHub access

Without a token, GitHub allows 60 API requests an hour; with one, 5,000. You can either paste a personal access token
or, if the deployment has an OAuth app set up, sign in with GitHub:

- **Public repositories only** asks for no scope.
- **Private repositories** asks for the `repo` scope, since GitHub has no read-only variant. The app only reads.

The token is kept in your browser's `localStorage` and sent only to `api.github.com`. After sign-in it is passed back in
the URL fragment, which browsers never send to a server.

## Development

Requires [Bun](https://bun.sh) (or Node.js with npm).

```sh
bun install
bun dev
```

Then open http://localhost:3000.

| Script                 | Does                        |
| ---------------------- | --------------------------- |
| `bun dev`              | Start the dev server        |
| `bun run build`        | Production build            |
| `bun start`            | Serve the production build  |
| `bun run lint`         | ESLint                      |
| `bun run lint:fix`     | ESLint fixes, then Prettier |
| `bun run format`       | Prettier                    |
| `bun run format:check` | Check formatting            |

### Sign in with GitHub (optional)

Without these variables the app works the same, with only the token field.

1. [Create an OAuth App](https://github.com/settings/applications/new) with the callback URL
   `http://localhost:3000/api/auth/callback` (one app per environment, since an app allows a single callback URL).
2. Copy `.env.example` to `.env.local` and fill in:

   ```sh
   NEXT_PUBLIC_GITHUB_CLIENT_ID=   # public, shows the sign-in button
   GITHUB_CLIENT_SECRET=           # secret, read only by the /api/auth routes
   ```

   On Vercel, set them under Project Settings → Environment Variables.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, [`diff`](https://github.com/kpdecker/jsdiff),
[highlight.js](https://highlightjs.org) and [Lucide](https://lucide.dev) icons.
