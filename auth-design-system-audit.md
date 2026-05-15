# Design System Audit: Auth Pages

Scope: `src/app/login/page.tsx`, `src/app/register/page.tsx`,
`src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`.
Tokens reference: `src/app/globals.css`.

---

## Summary

**Components reviewed:** 4 pages, ~880 LOC combined ·
**Major patterns duplicated:** 8 ·
**Token coverage:** strong (Lamplight palette is in use) ·
**Score:** **62 / 100** — visual language is consistent, but the *implementation*
is copy-pasted four times. One round of extraction would drop these pages
from ~880 LOC to ~250 LOC and remove every consistency drift below.

---

## Naming & Content Consistency

| Issue | Where | Recommendation |
|---|---|---|
| Button label casing inconsistent | "Sign in" (login) and "Create account" (register) use sentence case; "Send Reset Link" (forgot) and "Reset Password" (reset) use Title Case | Sentence case throughout. Adopt as a copy rule: button labels are sentence case, including this product. The Title Case in the reset flow reads as a different brand voice. |
| Loading state copy invented per page | "Signing in…", "Creating account…", "Sending…", "Resetting…" | These are fine as flavor — keep them, but extract `<PrimaryButton loading loadingLabel="…">` so the *pattern* (spinner + reduced opacity + disabled + aria-busy) is shared, even when the words differ. |
| Required-field marker used inconsistently | Register marks only "Display Name" with a red `*`. Email and Password on the same form are equally required but unmarked. Login marks neither. | Pick one rule: either mark all required fields, or none (and rely on the absence of an "optional" label). Recommend marking none, since every visible field across all four pages is required — the asterisks just add noise. |
| Background blur position drifts | `top-1/4` on login/forgot/reset; `top-1/3` on register | One value. There's no design reason for register's blur to sit lower. |
| Footer link copy varies in tone | "Don't have an account? **Join Quiloria**" (login) vs "Already have an account? **Sign in**" (register) vs "Remember your password? **Sign in**" (forgot/reset) | Keep the variations — they're context-appropriate. But "Join Quiloria" is the only place the brand name appears in this copy slot; consider whether that's intentional or just one place that drifted. |
| Success state copy uses different voices | Forgot: "If an account exists with that email, we've sent a reset link." (careful, security-aware) · Reset: "Your password has been reset successfully." (confident, plain) | Both are correct for their contexts. Document the rule: forgot-password copy should NOT confirm account existence (anti-enumeration); reset-password copy can confirm action because the user must have held the token. |
| Reset auto-redirect (3s, no escape) | `reset-password/page.tsx:52` | This is a behavior, not copy, but worth flagging: no manual "Continue to sign in →" link is offered. If the user wants to copy their password or read the confirmation, they get bumped before they can. Replace the timer with an explicit link, or extend to 6s and add the link. |

---

## Token Coverage

| Category | Defined in `globals.css` | Used well | Hardcoded values found |
|---|---|---|---|
| **Colors** | --t-void, --t-paper, --t-text, --t-text-secondary, --t-text-ghost, --t-text-tertiary, --t-gold (--color-amber), --t-ruby (--color-rose), --t-amethyst, --t-emerald, plus shadow + border tokens | ✅ `bg-void`, `text-paper`, `text-text-secondary`, `text-text-ghost`, `text-amber`, `text-rose`, `bg-amber/[0.03]`, `bg-elevated/80`, `border-border`, `border-amber/40`, `border-rose/20`, `card-page`, `firelight` are all on-system | None — colors are routed through tokens cleanly. |
| **Typography sizes** | `--font-display`, `--font-body` exist; no campaign-specific size scale | ⚠️ `font-display`, `text-3xl`, `text-sm`, `text-[13px]` mixed | `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]` appear 30+ times across the four pages. Tailwind's base scale (`text-xs` = 12, `text-sm` = 14) doesn't cover 10/11/13. Introduce 3 form-specific tokens (e.g., `text-form-label`, `text-form-meta`, `text-form-input`) or extend the Tailwind theme. |
| **Spacing** | Tailwind spacing scale | ✅ `mb-2`, `mb-6`, `mb-8`, `gap-2`, `gap-3`, `p-6`, `py-2.5`, `px-3.5`, `space-y-4` all consistent | None worth flagging — auth uses a tight, consistent rhythm. |
| **Border radius** | `card-page` uses `12px`; pills use `rounded-full`; inputs use `rounded-xl` (12px) | ✅ Inputs and the card share radius — good | The error banner uses `rounded-xl` too — consistent. |
| **Shadows / elevation** | `--t-shadow-card`, `--t-shadow-card-hover`, `--t-shadow-modal` exist; `.firelight` wraps the hover glow | ⚠️ Primary button uses `hover:shadow-md hover:shadow-amber/15` — Tailwind shadow scale, not the token system | Route through `--t-shadow-card-hover` or introduce `--t-shadow-cta`. Right now the primary CTA's elevation isn't theme-aware and won't degrade gracefully in Gallery Studio (light mode). |
| **Motion** | No tokens defined in `globals.css` | ⚠️ Every page uses `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}` inline | Promote to `motion-fade-in` token / shared `<FadeIn>` wrapper. 0.5s easeOut is a system-wide reading-app cadence and worth tokenizing. |

---

## Pattern Duplication

Eight patterns are copy-pasted across the four pages with minor variations.
This is the audit's central finding.

| # | Pattern | Occurrences | Drift between copies |
|---|---|---|---|
| 1 | Page shell (`min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden` + motion.div wrapper) | 4 | Identical except register/reset add a second copy of the page shell to handle the missing-token early-return state |
| 2 | Background ambiance blur (`absolute … w-[600px] h-[400px] rounded-full bg-amber/[0.03] blur-[120px]`) | 4 | `top-1/4` vs `top-1/3` |
| 3 | Brand link header (`<Link href="/">` + 32×32 quill SVG + "Quiloria" wordmark) | 4 | Identical, but the SVG is inlined verbatim each time (~250 chars × 4) |
| 4 | Form card (`<div class="card-page firelight p-6">`) | 4 + 1 (token-error fallback) | Identical |
| 5 | Error banner (`bg-rose/10 border border-rose/20 rounded-xl px-3 py-2.5 text-[13px] text-rose` with motion height animation) | 3 | Identical |
| 6 | Label + input pair (`<label class="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">` + the ~280-char input className) | 7 instances of the same input className | Identical |
| 7 | Primary submit button (`w-full bg-amber text-void font-semibold px-6 py-2.5 rounded-full hover:bg-amber-light … hover:shadow-md hover:shadow-amber/15`) | 4 | Only the button label and `loading` copy differ |
| 8 | Footer link (`text-center text-text-secondary text-sm mt-6` + amber Link) | 4 | Only the copy differs |

Plus three secondary patterns:

| # | Pattern | Occurrences |
|---|---|---|
| 9 | Success state (40×40 amber circle with icon, `text-text` body, `text-text-ghost` subtext) | 2 (forgot, reset) |
| 10 | OAuth button (GitHub) | 2 (login, register) |
| 11 | Token-missing / early-return error card | 1 (reset) — but the empty page-shell + card fallback pattern recurs in `Suspense` placeholders too |

---

## Component Completeness — what *should* exist

| Proposed component | Pulled from | States | Variants | Notes |
|---|---|---|---|---|
| `<AuthShell>` | patterns 1, 2, 3 | default · loading (Suspense fallback) | — | Wraps the page bg + motion + brand header. Children get rendered inside the centered column. Should accept an optional `<Banner>` slot for register's demo-draft banner. |
| `<Logo>` | pattern 3 inner SVG | default · sm / md / lg | — | The quill svg is currently inlined four times. One component. Already used in the landing nav? Check `landing/Navbar.tsx`. |
| `<FormCard>` | pattern 4 | default · success · error-overlay | — | Already exists as `card-page firelight` utility classes — just needs a documented wrapper component (or a `<Card variant="form">`) so success and error states share a frame. |
| `<TextField>` | pattern 6 | default · focus · disabled · error · with-affix (password visibility) | — | The 280-char input className is the strongest argument for a component. Add `type="password"` toggle as a free a11y win. |
| `<PrimaryButton>` | pattern 7 | default · hover · focus-visible · disabled · loading | size: md (default) | Currently uses `hover:shadow-md hover:shadow-amber/15` which is off-token. Route through `--t-shadow-card-hover` or a new `--t-shadow-cta` token. |
| `<OAuthButton>` | pattern 10 | default · hover · loading | provider: github (extensible to google/discord/etc.) | Accepts `provider` prop, renders the right icon + brand color. Loading state is missing today. |
| `<ErrorBanner>` | pattern 5 | default · entering · leaving | severity: error (default), warning, info | Already has the motion height animation — wrap it. |
| `<SuccessState>` | pattern 9 | default | icon: envelope, check (extensible) | The 40×40 amber circle + icon + two-line copy. Used by forgot + reset. |
| `<FieldLabel>` | pattern 6 (label half) | default · required | — | The `text-[10px] uppercase tracking-[0.12em] text-text-ghost` style is also used outside auth (campaign panels, GM dashboard). Worth promoting to a `<Eyebrow>` or `<Label>` component. |

---

## Component Scores (today, against the criteria above)

| Component | States | Variants | Docs | Score |
|---|---|---|---|---|
| Page shell (`AuthShell` not yet extracted) | ❌ | ❌ | ❌ | 0 / 10 |
| Logo | ⚠️ inlined | ❌ | ❌ | 1 / 10 |
| FormCard (`card-page firelight`) | ⚠️ partial | ⚠️ class-only | ⚠️ none | 5 / 10 |
| TextField | ❌ no error state, no password toggle | ❌ | ❌ | 3 / 10 |
| PrimaryButton | ✅ default/hover/focus/disabled/loading | ⚠️ one size | ❌ | 6 / 10 |
| OAuthButton | ⚠️ no loading state | ⚠️ one provider | ❌ | 4 / 10 |
| ErrorBanner | ✅ motion in/out | ❌ | ❌ | 5 / 10 |
| SuccessState | ⚠️ static, no error variant | ❌ | ❌ | 4 / 10 |

---

## Accessibility — patterns missing across all four pages

- **No password visibility toggle.** Five password fields across the four pages (login: 1, register: 2, reset: 2). Adding a show/hide eye icon button is a one-time component fix that lands everywhere.
- **No password strength indicator** on register or reset. The only validation is "at least 8 characters" client-side — a strength meter would also serve as inline feedback that the field is being read.
- **No `aria-live` regions** on error or success states. The error banner uses framer-motion to animate in but isn't announced. Add `role="alert"` (errors) and `role="status" aria-live="polite"` (success).
- **Loading state isn't announced.** Buttons swap their text label ("Sign in" → "Signing in…") but there's no `aria-busy` on the form, and screen readers may or may not announce the label change depending on focus. Add `aria-busy={loading}` to the form.
- **Auto-redirect on reset success has no announcement or way out.** A blind user hits success, the page silently redirects 3s later. Either announce ("Redirecting to sign in in 3 seconds — press Escape to cancel") or replace with a manual link.
- **Missing-token error on reset uses a card with no heading.** `reset-password/page.tsx:61-82` is a bare error message inside a Card. Should have an `<h1>` ("Reset link expired") for screen-reader landmarks and visual hierarchy.

---

## Token Drift — items that should join the token system

Promote these to `globals.css`:

```css
/* In @theme inline */
--shadow-cta: var(--t-shadow-cta);

/* In html, html.theme-dark */
--t-shadow-cta: 0 8px 24px rgba(212, 168, 67, 0.18);

/* In html.theme-light */
--t-shadow-cta:
  0 1px 2px rgba(168, 130, 44, 0.10),
  0 8px 20px rgba(168, 130, 44, 0.14);
```

```css
/* Form-specific type scale */
--type-form-label: 10px;     /* uppercase eyebrow above inputs */
--type-form-helper: 11px;    /* hints under inputs */
--type-form-meta: 12px;      /* secondary links, footer copy */
--type-form-input: 13px;     /* input values, button labels */
```

```css
/* Motion presets */
--motion-fade-in-duration: 0.5s;
--motion-fade-in-y: 12px;
--motion-fade-in-easing: cubic-bezier(0.16, 1, 0.3, 1); /* mirrors framer's easeOut */
```

Routing the inline framer values through these tokens lets light-mode (Gallery Studio) and any future theme adjust feel without touching component code.

---

## Priority Actions

1. **Extract `<AuthShell>`, `<TextField>`, `<PrimaryButton>`, `<OAuthButton>`, `<ErrorBanner>`, `<SuccessState>`, `<Logo>`.** Estimated impact: ~880 LOC → ~250 LOC across the four pages, and every consistency issue in the "Naming & Content Consistency" table above disappears or becomes a single-file fix. This is the highest-leverage change.

2. **Add the missing a11y patterns to those components once.** Once `<TextField>` exists, the password toggle, error association via `aria-describedby`, and `aria-invalid` ship to all five password fields with one change. Same for `aria-live` on `<ErrorBanner>` / `<SuccessState>`.

3. **Decide the button label casing rule and apply it.** "Sign in" / "Send reset link" (sentence) is the recommendation. Two-character change in two files.

4. **Replace the 3-second reset auto-redirect with an explicit "Continue to sign in →" link.** Don't strand users who want to read the success message or copy their password before the next page.

5. **Promote form-specific type sizes and the CTA shadow to tokens.** Removes 30+ `text-[Npx]` instances; makes light-mode work; documents intent.

A second tier: add password strength meter to register/reset (one component, two locations); add an OAuth `loading` state; consolidate the brand SVG into a `<Logo>` component (already used on the landing page navbar — check whether one exists there to import).
