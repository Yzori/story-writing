# Design Handoff: Auth Pages

Build target: Next.js 15 (App Router) · React · Tailwind · framer-motion · NextAuth.
Existing source: `src/app/login`, `src/app/register`, `src/app/forgot-password`,
`src/app/reset-password`. This spec assumes you're refactoring those four
pages onto a shared component set (see the companion audit document
`auth-design-system-audit.md` for the rationale).

---

## Overview

Four pages share one visual frame and one form pattern, with per-page
content. The flows are:

| Route | Purpose | Primary CTA | Secondary entry |
|---|---|---|---|
| `/login` | Sign in to existing account | "Sign in" → `/dashboard` (or `callbackUrl`) | Forgot password · OAuth (GitHub) · Register |
| `/register` | Create account | "Create account" → `/welcome/preferences` (or `/create` for writer intent, or `/write/[id]` if a demo draft exists) | OAuth (GitHub) · Login |
| `/forgot-password` | Request reset link | "Send reset link" → success state | Login |
| `/reset-password?token=…` | Set new password from emailed link | "Reset password" → `/login` (3s auto, replace with manual link — see Edge Cases) | Login |

The visual language belongs to the Lamplight dark theme: warm-neutral dark
surface, candlelight gold CTA, serif display + sans body, paper-grain
texture, warm vignette. Gallery Studio (light mode) should inherit through
tokens with no per-page work.

---

## Layout

```
┌──────────────────────────────── viewport (min-h-screen) ─────────┐
│                                                                  │
│             [ bg-amber/[0.03] blur-[120px] @ y=25% ]            │
│                                                                  │
│                  ┌────── 384px max-width ──────┐                 │
│                  │                              │                 │
│                  │      [ Logo + wordmark ]     │  ← Brand link  │
│                  │                              │     to "/"      │
│                  │     Welcome back             │  ← H1 (display) │
│                  │     Sign in to continue…     │  ← Subtitle    │
│                  │                              │                 │
│                  │   ┌── Form card ───────┐    │                 │
│                  │   │ (optional banner)  │    │                 │
│                  │   │ (optional error)   │    │                 │
│                  │   │ [Label]            │    │                 │
│                  │   │ [Input          ]  │    │                 │
│                  │   │ [Label]            │    │                 │
│                  │   │ [Input          ]  │    │                 │
│                  │   │              [link]│    │                 │
│                  │   │ [ Primary button ] │    │                 │
│                  │   │ ─── or ───         │    │                 │
│                  │   │ [ OAuth button ]   │    │                 │
│                  │   │ ── trust footer ── │    │                 │
│                  │   └────────────────────┘    │                 │
│                  │                              │                 │
│                  │   Already have an account?   │  ← Footer link │
│                  │   Sign in                    │                 │
│                  └──────────────────────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- **Page shell**: `min-height: 100vh`, centered, `padding: 0 16px` (mobile gutter).
- **Content column**: `max-width: 384px` (Tailwind `max-w-sm`), centered.
- **Vertical rhythm**: header → card → footer, `margin-bottom: 32px` between header and card; `margin-top: 24px` between card and footer.
- **Form card padding**: `24px` all sides.
- **Form field gap**: `16px` (Tailwind `space-y-4`).

---

## Design Tokens Used

Sourced from `src/app/globals.css`. Tokens with ⚠ are recommended additions
from the audit (not yet in `globals.css`).

### Color

| Token | Hex (dark) | Hex (light) | Used for |
|---|---|---|---|
| `--t-void` | `#0F0E13` | `#FAFAFA` | Page background, primary button text color |
| `--t-paper` | `#EDE8D8` | `#09090B` | Display headings, brand wordmark, primary text on inputs |
| `--t-text` | `#B8B2A0` | `#3F3F46` | Input value text, success state body |
| `--t-text-secondary` | `#918B7E` | `#71717A` | Subtitle under H1, footer link container text, OAuth button label |
| `--t-text-ghost` | `#85806F` | `#D4D4D8` | Field labels (uppercase eyebrow), input placeholders, success state subtext, "or" divider |
| `--t-gold` (`--color-amber`) | `#D4A843` | `#A8822C` | Primary CTA background, brand mark, link emphasis, focus ring |
| `--t-gold-light` (`--color-amber-light`) | `#E8BE5E` | `#C69A3A` | Primary CTA hover |
| `--t-ruby` (`--color-rose`) | `#B8697A` | `#B04456` | Error banner text + border, required asterisk, missing-token error |
| `--t-emerald` (`--color-sage`) | `#7BA28A` | `#2F7A50` | Trust checkmark on register footer |
| `--t-border` | `rgba(255,255,255,0.06)` | `rgba(9,9,11,0.08)` | Input border, divider rules, footer separators |
| `--t-border-active` | `rgba(255,255,255,0.14)` | `rgba(9,9,11,0.16)` | OAuth button hover border |
| `--t-elevated` | `#272636` | `#FFFFFF` | Input background (`bg-elevated/80`), OAuth button background |

⚠ Recommended additions:

| Token | Value (dark) | Value (light) | Used for |
|---|---|---|---|
| `--t-shadow-cta` | `0 8px 24px rgba(212, 168, 67, 0.18)` | `0 1px 2px rgba(168,130,44,0.10), 0 8px 20px rgba(168,130,44,0.14)` | Primary button hover shadow |

### Typography

| Token | Family | Size | Weight | Line-height | Used for |
|---|---|---|---|---|---|
| `--font-display` (Fraunces) | serif | 30px (`text-3xl`) | 600 | 1.15 | Page H1 ("Welcome back", "Begin your journey", etc.) |
| `--font-display` | serif | 14px (`text-sm`) | 700 | 1.2 | Brand wordmark next to logo |
| `--font-body` (Plus Jakarta Sans) | sans-serif | 14px (`text-sm`) | 400 | 1.5 | Subtitle below H1, footer text, OAuth button label, trust footer |
| `--font-body` | sans-serif | 13px ⚠ | 400 | 1.45 | Input value, error message |
| `--font-body` | sans-serif | 13px ⚠ | 600 | 1.4 | Primary button label |
| `--font-body` | sans-serif | 12px ⚠ | 400 | 1.5 | "Forgot password?" inline link, success-state subtext |
| `--font-body` | sans-serif | 11px ⚠ | 400 | 1.5 | "or" divider label, register banner subtitle, trust footer |
| `--font-body` | sans-serif | 10px ⚠ | 500 | 1.4 | Field labels (uppercase + tracking 0.12em) |

⚠ The 10/11/12/13px sizes are not on Tailwind's default scale. The audit
recommends promoting them to `--type-form-*` tokens. Until then, the
arbitrary `text-[Npx]` syntax is used.

### Spacing

Tailwind scale only. No arbitrary values needed.

| Use | Token / value |
|---|---|
| Card padding (interior) | `p-6` (24px) |
| Between header and form card | `mb-8` (32px) |
| Between form card and footer | `mt-6` (24px) |
| Between form fields | `space-y-4` (16px) |
| Between label and input | `mb-2` (8px) |
| Input padding | `px-3.5 py-2.5` (14px × 10px) |
| Primary button padding | `px-6 py-2.5` (24px × 10px) |
| Logo + wordmark gap | `gap-2` (8px) |
| OR divider gap | `gap-3` (12px) |

### Radius

| Use | Value |
|---|---|
| Inputs, error banner, register banner, success icon container | `rounded-xl` (12px) |
| Primary button, OAuth button, footer text link "Sign in" pills (none currently) | `rounded-full` |
| Logo | inherits SVG path shape |

### Motion

| Use | Value |
|---|---|
| Card entrance (`<motion.div>`) | `initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration: 0.5s`, `ease: "easeOut"` |
| Error banner enter/leave | `initial={{ opacity: 0, height: 0 }}` → `animate={{ opacity: 1, height: "auto" }}` |
| Register demo-draft banner | `initial={{ opacity: 0, y: -4 }}` → `animate={{ opacity: 1, y: 0 }}` |
| Success state enter | `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}` |
| Primary button hover | `transition: all 0.2s` |
| Input focus | `transition: all` (no duration override) |
| Hover/state changes (color, border) | `transition: colors 0.15s` |

⚠ Promote the 0.5s easeOut card-entrance to a `--motion-fade-in-*` token set
and a shared `<FadeIn>` wrapper.

---

## Component Specs

### `<AuthShell>`

Page-level wrapper. One per page.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | required | Display H1. Sentence case. |
| `subtitle` | string | required | One-line subtitle under H1. |
| `banner` | ReactNode | undefined | Optional banner above the form card (register's demo-draft banner). Renders with `mb-5` if present. |
| `footer` | ReactNode | undefined | Optional copy below the form card (register's trust footer is inside the card; the bottom "Already have an account?" line is the *page* footer slot). |
| `footerPrompt` | string | required | "Don't have an account?" / "Already have an account?" / "Remember your password?" |
| `footerLink` | `{ href, label }` | required | The amber link inline with `footerPrompt`. |
| `children` | ReactNode | required | The form card content. Rendered inside `card-page firelight p-6`. |

**Layout/visuals**: Renders the centered page shell, background blur,
brand link header, motion fade-in container, FormCard, page footer. Always
uses the same blur position (`top-1/4`).

**Accessibility**: H1 is the page landmark. Brand link is a single
discoverable focusable element above the form.

### `<TextField>`

Replaces every label + input pair across the four pages.

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | string | required | `htmlFor` target + input id |
| `label` | string | required | Uppercase eyebrow label |
| `type` | `"text" \| "email" \| "password"` | `"text"` | Input type. For `"password"`, renders a visibility toggle suffix. |
| `value` | string | required | Controlled value |
| `onChange` | function | required | Standard React onChange |
| `placeholder` | string | undefined | Placeholder text |
| `autoComplete` | string | undefined | e.g. `"email"`, `"current-password"`, `"new-password"` |
| `required` | boolean | false | Affects only browser validation. **Do not** render a `*` — the audit recommends marking nothing required since all auth fields are required. |
| `error` | string | undefined | Inline error message under the input. Adds red border + `aria-invalid`. |
| `helper` | string | undefined | Inline helper text under the input (e.g. "At least 8 characters"). Mutually exclusive with `error`. |
| `maxLength` | number | undefined | Hard cap on input length |
| `minLength` | number | undefined | Browser-level min length |
| `disabled` | boolean | false | Disabled state. Reduces opacity to 0.5. |
| `autoFocus` | boolean | false | First field on a page may set this |

**States** — see "States and Interactions" below for exact visuals.

**Internal markup**:

```
<div>
  <label>{LABEL}</label>
  <div class="input-wrap">
    <input ... aria-describedby={errorId || helperId} aria-invalid={!!error} />
    {type === "password" && <button class="visibility-toggle" aria-label="Show password" aria-pressed={visible} />}
  </div>
  {error  && <p id={errorId} role="alert">{error}</p>}
  {helper && <p id={helperId}>{helper}</p>}
</div>
```

### `<PrimaryButton>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `"button" \| "submit"` | `"submit"` | Form submit by default |
| `loading` | boolean | false | When true: shows spinner, disables, sets `aria-busy`, swaps label |
| `loadingLabel` | string | required when `loading` is used | Per-page copy: "Signing in…", "Creating account…", "Sending…", "Resetting…" |
| `disabled` | boolean | false | Independent of `loading` |
| `children` | string | required | Default button label (sentence case) |
| `onClick` | function | undefined | Optional handler (when `type="button"`) |

**Visuals**:
- Background: `var(--t-gold)`
- Text: `var(--t-void)`
- Padding: `px-6 py-2.5`
- Border-radius: `rounded-full`
- Font: 13px, weight 600, sentence case
- Full width: `w-full`

**Loading state**: button stays mounted (no layout shift), label swaps to
`loadingLabel`, an inline spinner (12px, `border-2 border-current border-r-transparent animate-spin`) sits 8px before the label. `aria-busy="true"` on the parent form.

### `<OAuthButton>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `provider` | `"github"` (extensible) | required | Which OAuth provider |
| `callbackUrl` | string | `"/dashboard"` | Where NextAuth should redirect on success |
| `loading` | boolean | false | When true: spinner, disabled |
| `loadingLabel` | string | `"Connecting…"` | Loading copy |

**Visuals**:
- Background: `var(--t-elevated)` at 80% alpha
- Border: `var(--t-border)`
- Text: `var(--t-text-secondary)` → `var(--t-paper)` on hover
- Same padding + radius + font as PrimaryButton
- 16px provider icon to the left, 10px gap

### `<ErrorBanner>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | ReactNode | required | Error copy |
| `severity` | `"error" \| "warning" \| "info"` | `"error"` | Adjusts color tokens |

**Visuals (error)**:
- Background: `bg-rose/10` (rose at 10%)
- Border: `border-rose/20`
- Text: `text-rose`
- Padding: `px-3 py-2.5`
- Radius: `rounded-xl`
- Animates in/out with `motion.div` height + opacity (350ms)
- Has `role="alert"` so it announces to screen readers when it appears

### `<SuccessState>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `"envelope" \| "check"` | required | Which icon |
| `title` | string | required | First line of body copy |
| `caption` | string | undefined | Optional second line |
| `action` | `{ href, label }` | undefined | Optional CTA link below the copy |

**Visuals**:
- 40×40px amber circle (`bg-amber/10`) with the icon (`text-amber`, 20px stroke)
- Title: `text-text` 14px, centered
- Caption: `text-text-ghost` 12px, centered, `mt-2`
- Action link: amber, weight 500, `mt-4`
- Has `role="status" aria-live="polite"` so screen readers announce on appear

### `<Logo>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | sm=20px (auth header), md=28px, lg=40px |
| `withWordmark` | boolean | `true` | Show "Quiloria" text to the right |

The path data is in `login/page.tsx:62-64` — lift into the component.

---

## States and Interactions

### Form lifecycle (all four pages)

| Element | State | Behavior |
|---|---|---|
| Page | Initial load | Suspense fallback: `bg-void` solid color (no flash). Then `<motion.div>` fades in from `opacity: 0, y: 12` over 500ms easeOut. |
| Form | Idle | Inputs editable, primary button enabled if all required fields have value (no client-side gating today — rely on server validation). |
| Form | Submitting | `aria-busy="true"` on `<form>`. All inputs disabled. PrimaryButton shows spinner + loadingLabel. |
| Form | Error | ErrorBanner appears with `role="alert"`. Inputs re-enabled. Focus does NOT shift automatically (user keeps context). |
| Form | Success | Card content swaps to `<SuccessState>` (forgot, reset) OR full-page redirect (login, register). |

### Per-input states

| State | Visual |
|---|---|
| Default | Border `var(--t-border)`, background `var(--t-elevated)` at 80%, value `var(--t-text)`, placeholder `var(--t-text-ghost)` |
| Hover (no focus) | No change (subtle, atmospheric design) |
| Focus | Border `var(--t-gold)` at 40%, ring `var(--t-gold)` at 40% with 2px width and 2px offset against `var(--t-void)` |
| Filled | Same as default |
| Disabled | Opacity 0.5, cursor `not-allowed` |
| Error | Border `var(--t-ruby)`, `aria-invalid="true"`, inline error message below with `role="alert"` |
| Password type, hidden | Eye icon at right (16px, `var(--t-text-ghost)`). Hover: `var(--t-text-secondary)`. |
| Password type, visible | Eye-off icon, same colors |

### Per-button states (PrimaryButton)

| State | Visual |
|---|---|
| Default | Background `var(--t-gold)`, text `var(--t-void)`, no shadow |
| Hover | Background `var(--t-gold-light)`, shadow `var(--t-shadow-cta)` ⚠ |
| Focus-visible | Same as hover + 2px `var(--t-gold)` ring at 2px offset |
| Active (pressed) | Background `var(--t-gold)` (no extra), translateY(1px) |
| Disabled | Opacity 0.5, cursor `not-allowed`, no hover |
| Loading | Disabled visuals + spinner + loadingLabel, `aria-busy="true"` |

### Per-button states (OAuthButton)

| State | Visual |
|---|---|
| Default | `bg-elevated/80`, `border-border`, text `var(--t-text-secondary)` |
| Hover | `border-border-active`, text `var(--t-paper)` |
| Focus-visible | + 2px `var(--t-gold)` ring at 2px offset |
| Loading | Disabled + spinner replaces provider icon, label → loadingLabel |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| Desktop (≥1024px) | Default layout as drawn. Content centered at 384px max-width. |
| Tablet (768–1023px) | Identical to desktop. The 384px max-width and 16px page padding already work. |
| Mobile (375–767px) | Page padding remains 16px. Content column shrinks to `100% - 32px`. Font sizes unchanged. The amber blur ambiance scales with viewport. |
| Mobile small (<375px) | iPhone SE width. The H1 (30px Fraunces) still fits. Two-word labels never overflow at this scale. |

Form card width is always `100%` of its container. There is no special
"narrow viewport" handling needed.

---

## Edge Cases

### Long content

- **Email addresses**: Inputs allow horizontal overflow with native browser handling (the placeholder is short, real addresses up to ~50ch fit; longer values scroll within the input).
- **Display name (register)**: Hard-capped at 100 characters server-side and `maxLength={100}` client-side. No counter UI currently; consider adding `<TextField helper={\`${name.length} / 100\`}>` once the user starts typing.
- **Error messages**: Wrap naturally. Banner has no max-height. Worst-case server error ("That email is already in use. If you forgot your password, you can reset it from here.") is ~3 lines and looks fine.

### Empty / loading / missing data

| Page | Scenario | Behavior |
|---|---|---|
| All | Initial Suspense | Blank `bg-void` placeholder. Avoids flash. |
| `/login` | OAuth in progress | Full-page redirect to GitHub. No in-app loading UI between click and redirect. **Improve**: add `loading` state on OAuthButton so the button shows it's been clicked. |
| `/register` | Demo draft present | The register page shows a banner above the form indicating the draft will be imported. The H1 also changes to "Save your draft". After register, draft is POSTed to `/api/stories` and the user lands in `/write/[storyId]`. |
| `/register` | Demo draft import fails | Falls through to the regular welcome flow (no error shown). Worth surfacing — "We couldn't import your draft, but your account is ready." |
| `/forgot-password` | Email doesn't exist | API returns 200 regardless (anti-enumeration). UI shows the same "If an account exists…" success state. **Critical: do not change.** |
| `/reset-password` | Missing token | Renders an early-return card with "Invalid or missing reset token." and a link to `/forgot-password`. **Improvement: add an `<h1>` for landmarks.** |
| `/reset-password` | Expired token | Server returns 4xx with `data.error`. UI shows it in the ErrorBanner. |
| `/reset-password` | Success | Currently auto-redirects to `/login` after 3 seconds. **Recommended change**: keep the success state, replace the auto-redirect with a "Continue to sign in →" link. Accessibility note: 3-second auto-navigation gives no escape and isn't announced. |

### Network failures

- All four pages catch fetch errors and show `"Something went wrong. Please try again."` in the ErrorBanner.
- No retry button — user re-submits the form.

### Slow connections

- The framer-motion fade-in still runs on slow connections (it's local).
- The button loading state is the only loading UI. A long-running submit (>2s) gives no further feedback. Consider a `loading` state that, after 4s, swaps the loading label to "Still working…".

### Browser autofill

- Inputs use proper `autoComplete` values (`email`, `current-password`, `new-password`). Tested implicitly through `signIn("credentials", …)`.
- The yellow autofill background that Chromium applies overrides `bg-elevated/80`. Add the standard mitigation if needed:
  ```css
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px var(--t-elevated) inset;
    -webkit-text-fill-color: var(--t-text);
  }
  ```

### Password managers

- All five password fields use `type="password"` with correct `autoComplete` values. 1Password / Bitwarden / Apple Keychain will pick up the form correctly.
- The visibility toggle (added per recommendation) should NOT change the input `type` if a password manager has filled it — keep this in mind for the toggle implementation.

---

## Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Form card | Page mount | Opacity 0→1, translateY 12→0 | 500ms | easeOut |
| Error banner | Mount/unmount | Opacity 0↔1, height 0↔auto | ~350ms (framer default) | default |
| Demo-draft banner (register) | Mount | Opacity 0→1, translateY -4→0 | ~350ms | default |
| Success state | Mount | Opacity 0→1, translateY 8→0 | ~350ms | default |
| Primary button hover | Pointer enter/leave | Background + shadow | 200ms | default |
| Input focus | Focus/blur | Border + ring color | (default `transition-all`) | default |
| OAuth button hover | Pointer enter/leave | Color + border | 200ms | default |
| Reset success redirect | Success state mount | None (window.location after 3s) | — | — |

⚠ Reduced motion: Wrap all framer-motion entries in
`useReducedMotion()`. When `prefers-reduced-motion: reduce`, render the
animated element directly without the y-offset (opacity is still allowed,
or skip it too — Apple recommends just opacity).

---

## Accessibility Notes

### Focus order

1. Brand link ("Quiloria" logo at top of page)
2. First input (varies by page)
3. Each subsequent input in DOM order
4. Inline link (e.g. "Forgot password?" on login)
5. Primary button
6. OAuth button (if present)
7. Footer link ("Sign in" / "Register")

The visibility toggle button on password inputs should sit immediately
after the input in tab order (which is the natural DOM order if the
toggle is a sibling sharing the wrapping `<div>`).

### ARIA / semantics

| Element | Pattern |
|---|---|
| `<form>` | `aria-busy={loading}` during submit |
| Form inputs with error | `aria-invalid="true"` + `aria-describedby={errorId}` |
| Error banner | `role="alert"` (assertive — interrupts the screen reader) |
| Success state | `role="status" aria-live="polite"` |
| Password visibility toggle | `<button aria-label="Show password"` / `"Hide password" aria-pressed={visible}>` |
| Brand link | `<Link href="/" aria-label="Quiloria — back to home">` (or trust the visible label) |
| Required asterisk | If kept, wrap in `<span aria-hidden="true">*</span>` and add `aria-required="true"` to the input. Recommendation: remove the asterisks entirely (all visible fields are required). |

### Keyboard

- All interactive elements reachable by Tab.
- `Enter` in any input submits the form (default form behavior).
- `Escape` on the password visibility toggle: no special behavior needed (it's not a modal).
- The success state's CTA link (if added) is the focused element when the success state mounts — explicitly call `.focus()` so keyboard users land there.

### Screen reader announcements

| Event | Announcement |
|---|---|
| Page loaded | H1 + subtitle (default semantic landmarks) |
| Field receives focus | Label + value + role |
| Submit clicked | Button label change to "Signing in…" (announced if `aria-live` is set on parent, or via the `aria-busy` change). Recommendation: add an off-screen `<span aria-live="polite">` that gets updated to "Submitting your details" / "Sending reset email" / etc. |
| Error returned | Error banner content is announced via `role="alert"` |
| Success | Success-state content is announced via `role="status"` |
| Reset auto-redirect | Currently silent. If kept, add "Redirecting to sign in." aria-live message. Recommended: remove the auto-redirect. |

### Color independence

- The `*` required marker (currently used on register's Display Name only) uses red color alone. If kept, also append the literal word "(required)" in `aria-label` or visible text. Recommendation: remove.
- Error border on inputs is red — pair with the inline error message text (already present), so the user doesn't depend on color.

### Contrast (verified against `--t-void`)

| Element | Foreground | Contrast | WCAG |
|---|---|---|---|
| H1 | `--t-paper` `#EDE8D8` | 15.7 : 1 | AAA |
| Subtitle | `--t-text-secondary` `#918B7E` | 5.7 : 1 | AA |
| Field label | `--t-text-ghost` `#85806F` | 4.9 : 1 | AA |
| Input value | `--t-text` `#B8B2A0` | 9.0 : 1 | AAA |
| Placeholder | `--t-text-ghost` `#85806F` on `--t-elevated` (#272636) | ~3.3 : 1 | AA Large only — acceptable for placeholders |
| Primary button label | `--t-void` `#0F0E13` on `--t-gold` `#D4A843` | 7.6 : 1 | AAA |
| OAuth button label | `--t-text-secondary` `#918B7E` | 5.7 : 1 | AA |
| Footer link | `--t-gold` `#D4A843` | 8.7 : 1 | AAA |
| Error text | `--t-ruby` `#B8697A` | 5.4 : 1 | AA |

All pass WCAG AA. No remediation needed for the auth pages themselves.

---

## Implementation Notes

- **Existing class to keep**: `card-page firelight` (defined in `globals.css:371-382`). The new `<FormCard>` component should compose these classes rather than redefine the visual.
- **Existing class to extract**: the 280-character input className appears 7 times across the four pages. Move into `<TextField>` first.
- **NextAuth callback URL safety**: Login already does this:
  ```ts
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";
  ```
  Apply the same safety check anywhere a callback URL is consumed from query params (register, OAuth init).
- **Suspense boundary**: every page that reads `useSearchParams()` must be wrapped in `<Suspense>`. Login, register, and reset already do this; forgot-password doesn't need to (no search params consumed).
- **Demo draft localStorage key**: `quiloria-demo-draft-v1`. Encapsulate read/clear/import in a single `lib/demo-draft.ts` so it's testable and reusable.

---

## Acceptance Criteria

A reviewer should be able to confirm each:

1. [ ] All four auth pages render and animate identically on initial load (500ms easeOut fade + y-12).
2. [ ] Button labels are sentence case on all four pages.
3. [ ] No `text-[Npx]` arbitrary values remain — all sizes routed through tokens or the Tailwind base scale.
4. [ ] No two pages contain the same SVG path data (logo extracted to `<Logo>`).
5. [ ] Tabbing through each page hits every interactive element in DOM order with a visible focus ring.
6. [ ] Submitting an invalid login announces the error via `role="alert"`.
7. [ ] Password fields have a working visibility toggle with `aria-pressed`.
8. [ ] Reset-success replaces the 3-second auto-redirect with a manual "Continue to sign in →" link.
9. [ ] `prefers-reduced-motion: reduce` removes the y-offset on all motion entrances.
10. [ ] Light mode (`html.theme-light`) renders correctly — no hard-coded shadows or colors that break.
