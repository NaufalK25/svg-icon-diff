'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { GitCompareArrows, GitPullRequest, KeyRound, LogOut, Moon, Sun, X } from 'lucide-react';

import { GITHUB_SIGN_IN_ENABLED, useAppContext } from '@/context/AppContext';

import { BUTTON_ICON, BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS, NOTICE_ERROR } from './ui';

// GitHub badge from vscode-icons' folder_type_github.svg, cropped to the badge:
// circle and octocat merged with evenodd so the octocat is cut out (follows currentColor).
// Same as the explorer's Header
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="10 10 21 21" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M31 20.5A10.5 10.5 0 1 1 20.5 10 10.5 10.5 0 0 1 31 20.5M23.013 27.6a2.5 2.5 0 0 0-.713-1.944c2.339-.26 4.794-1.148 4.794-5.181a4.05 4.05 0 0 0-1.079-2.818 3.77 3.77 0 0 0-.105-2.779s-.88-.282-2.884 1.077a9.94 9.94 0 0 0-5.258 0c-2.005-1.359-2.887-1.077-2.887-1.077a3.78 3.78 0 0 0-.1 2.779A4.06 4.06 0 0 0 13.7 20.47c0 4.023 2.451 4.924 4.783 5.189a2.25 2.25 0 0 0-.667 1.4 2.234 2.234 0 0 1-3.055-.873 2.21 2.21 0 0 0-1.609-1.082s-1.025-.013-.072.639a2.78 2.78 0 0 1 1.166 1.535s.616 2.043 3.537 1.408c0 .876.014 1.537.014 1.786a.6.6 0 0 1-.032.177 10.2 10.2 0 0 0 5.27 0 .6.6 0 0 1-.035-.173c0-.344.013-1.476.013-2.876"
      />
    </svg>
  );
}

// public/icon.svg drawn inline from the theme tokens, so it follows the app's own light/dark
// toggle (the file favicon can only follow the OS setting): plate A and plate B overlapping,
// the paper showing through where they register
function AppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="17" height="17" rx="3" style={{ fill: 'var(--plate-a)' }} />
      <rect x="12" y="12" width="17" height="17" rx="3" style={{ fill: 'var(--plate-b)' }} />
      <path d="M12 15a3 3 0 0 1 3-3h5v5a3 3 0 0 1-3 3h-5z" fill="#fff" />
    </svg>
  );
}

const NAV = [
  { href: '/', label: 'Compare', icon: GitCompareArrows },
  { href: '/pr', label: 'PR review', icon: GitPullRequest },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof GitPullRequest;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-flex items-center gap-1.5 px-2.5 text-sm transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full ${
        active
          ? 'font-semibold text-foreground after:bg-mark'
          : 'text-muted-foreground hover:text-foreground hover:after:bg-border'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

interface HeaderProps {
  /** Open the sign-in / token panel from outside, e.g. when the rate limit runs low */
  tokenInputOpen?: boolean;
  onTokenInputOpenChange?: (open: boolean) => void;
}

export default function Header({ tokenInputOpen, onTokenInputOpenChange }: HeaderProps) {
  const { token, setToken, authUser, authError, clearAuthError, signIn, signOut, theme, setTheme, rateLimit } =
    useAppContext();
  const pathname = usePathname();
  const [ownTokenOpen, setOwnTokenOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [includePrivate, setIncludePrivate] = useState(false);
  // A failed sign-in opens the panel so the reason is visible
  const showTokenInput = (tokenInputOpen ?? ownTokenOpen) || !!authError;
  const setShowTokenInput = (open: boolean) => {
    setOwnTokenOpen(open);
    onTokenInputOpenChange?.(open);
    if (!open) clearAuthError();
    // A token from sign-in is never put in the field
    if (open) setTokenInput(authUser ? '' : token);
  };

  const handleTokenSave = () => {
    setToken(tokenInput.trim());
    setShowTokenInput(false);
  };

  // Without a token GitHub allows 60 requests an hour, with one 5000
  const rateLimitMax = token ? 5000 : 60;
  const rateLimitPercent = rateLimit ? Math.min(100, Math.round((rateLimit.remaining / rateLimitMax) * 100)) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-x-6">
          <div className="flex min-w-0 items-center gap-6 self-stretch">
            <Link href="/" className="flex shrink-0 items-center gap-2 rounded-sm">
              <AppMark className="h-5 w-5" />
              <h1 className="font-mono text-[15px] font-bold tracking-tight">svg-icon-diff</h1>
            </Link>
            <nav className="hidden gap-1 self-stretch sm:flex" aria-label="Main">
              {NAV.map(({ href, label, icon: Icon }) => (
                <NavLink key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {rateLimit && (
              <div
                className="mr-2 hidden shrink-0 items-baseline gap-1 font-mono text-xs tabular-nums text-muted-foreground md:flex"
                title={`GitHub API requests remaining, resets at ${new Date(rateLimit.reset * 1000).toLocaleTimeString()}`}
              >
                <span className={`text-sm font-semibold ${rateLimitPercent < 20 ? 'text-warning' : 'text-foreground'}`}>
                  {rateLimit.remaining}
                </span>
                /{rateLimitMax}
              </div>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={BUTTON_ICON}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              aria-expanded={showTokenInput}
              aria-label="GitHub sign-in and token"
              className={`${BUTTON_ICON} ${token ? 'text-foreground' : ''}`}
              title={
                authUser
                  ? `Signed in to GitHub as ${authUser.login}`
                  : token
                    ? 'GitHub API token (set)'
                    : GITHUB_SIGN_IN_ENABLED
                      ? 'Sign in with GitHub or add a token'
                      : 'GitHub API token'
              }
            >
              {authUser?.avatarUrl ? (
                <img src={authUser.avatarUrl} alt={authUser.login} className="h-4 w-4 rounded-full" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
            </button>
            {GITHUB_SIGN_IN_ENABLED && !token && (
              <button
                onClick={() => signIn()}
                className={`${BUTTON_SECONDARY} ml-1 px-2.5`}
                title="Sign in with GitHub (public repositories; for private ones use the key button)"
              >
                <GitHubIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Phones: the two pages get their own row so the header never wraps into an orphan line */}
        <nav className="-mx-1 flex h-10 gap-1 sm:hidden" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
          ))}
        </nav>

        {showTokenInput && (
          <div className="max-w-3xl space-y-3 border-t border-border py-4">
            {authError && (
              <p className={`flex items-center gap-2 ${NOTICE_ERROR}`}>
                <span className="flex-1">GitHub sign-in failed: {authError}</span>
                <button
                  onClick={clearAuthError}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-destructive/15"
                  title="Dismiss"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </p>
            )}

            {authUser ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {authUser.avatarUrl && <img src={authUser.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
                <span>
                  Signed in to GitHub as <span className="font-semibold">{authUser.login}</span>
                </span>
                <button
                  onClick={() => {
                    signOut();
                    setShowTokenInput(false);
                  }}
                  className={BUTTON_SECONDARY}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <>
                {GITHUB_SIGN_IN_ENABLED && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <button onClick={() => signIn({ includePrivate })} className={BUTTON_PRIMARY}>
                      <GitHubIcon className="h-4 w-4" />
                      Sign in with GitHub
                    </button>
                    <label
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
                      title="For private repos GitHub only offers full repository access (read and write); this app only reads"
                    >
                      <input
                        type="checkbox"
                        checked={includePrivate}
                        onChange={e => setIncludePrivate(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Include private repositories (asks for full repo access)
                    </label>
                    <span className="text-sm text-muted-foreground">or paste a token:</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoFocus={!GITHUB_SIGN_IN_ENABLED}
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTokenSave();
                    }}
                    placeholder="GitHub personal access token (optional)"
                    aria-label="GitHub personal access token"
                    className={`${INPUT_CLASS} min-w-0 flex-1`}
                  />
                  <button onClick={handleTokenSave} className={`${BUTTON_PRIMARY} h-9 px-4`}>
                    Save
                  </button>
                </div>
              </>
            )}
            <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
              Raises the limit from 60 to 5000 requests an hour; private repositories need repo access. The token is
              stored only in this browser (localStorage) and sent only to GitHub.
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
