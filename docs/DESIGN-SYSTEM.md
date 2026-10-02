# Orbit Design System

Orbit is the design language behind Vantage: deep-space surfaces, aurora accents
and precise typography. The goal is a premium, product-grade interface that
never looks templated.

## 1. Principles

1. **Calm density.** Information is rich but never cramped; generous spacing and
   a clear hierarchy.
2. **Truthful UI.** Unavailable data is labeled `Unavailable`; nothing is faked.
3. **Quiet motion.** Motion explains state changes, it does not decorate.
4. **Accessible by default.** Focus states, contrast and reduced-motion are
   first-class.

## 2. Tokens

Tokens are CSS custom properties on `:root` and `.dark`, consumed by Tailwind
via `hsl(var(--token) / <alpha-value>)`. Never hardcode a raw color in a
component.

### Surfaces

| Token | Role |
| --- | --- |
| `--canvas` | App background |
| `--surface` / `--surface-muted` | Cards and inset areas |
| `--surface-raised` / `--surface-overlay` | Popovers, dialogs, raised glass |
| `--border` / `--border-strong` | Hairlines and emphasized dividers |

### Content

`--content`, `--content-muted`, `--content-subtle`, `--content-disabled`.

### Accents

| Token | Role |
| --- | --- |
| `--primary` (+ `foreground`, `soft`, `ring`) | Brand/action color (violet) |
| `--accent` | Secondary highlight (cyan) |
| `--success` / `--warning` / `--danger` / `--info` (each with `soft`) | Semantic states |

### Radii, elevation, motion

| Token | Value |
| --- | --- |
| `--radius-control` | `0.625rem` |
| `--radius-card` | `1rem` |
| `--radius-surface` | `1.375rem` |
| `--elevation-1..4` | Progressive shadow ramp |
| `--aurora-1/2/3`, `--grid-line` | Ambient background effects |

Tailwind exposes `rounded-control|card|surface`, `shadow-e1..e4`,
`bg-surface`, `text-content`, `text-primary`, etc.

## 3. Typography

- **Sans**: platform UI stack (SF Pro on Apple, Segoe UI on Windows, Roboto on
  Android/Linux) via `--font-sans`.
- **Mono**: SF Mono / JetBrains Mono via `--font-mono`, used for addresses,
  keys, IDs.
- Numeric telemetry uses the `.tabular` utility (`font-variant-numeric:
  tabular-nums`) so values do not jitter while updating.
- Font features (`cv11`, `ss01`, `cv02`–`cv04`) are enabled for cleaner digits
  and glyphs.
- An extra `text-2xs` size exists for dense labels and meta rows.

## 4. Effects

- `.orbit-aurora` — layered radial gradients behind the hero/topbar.
- `.orbit-grid` — masked blueprint grid for empty/ambient areas.
- `.orbit-panel` — translucent card with hairline border and blur.
- `.orbit-glass` — raised glass surface for overlays and chips.
- `.text-gradient` — content→primary→accent gradient for headline accents.
- `.orbit-scroll` — thin, themed scrollbars.

Use effects sparingly; they are accents, not defaults.

## 5. Components

Primitives live in `components/ui/`:

`badge`, `button`, `charts`, `checkbox`, `confirm-dialog`, `copy-button`,
`dialog`, `dropdown-menu`, `input`, `key-value`, `label`, `metric-card`,
`page-header`, `panel`, `progress`, `skeleton`, `states`, `status-pill`,
`switch`, `tabs`, `toaster`, `tooltip`.

Domain widgets live in:

- `components/dashboard/` — `vps-gate`, `vps-identity`, `stat-grid`,
  `monitor-panel`, `power-controls`.
- `components/shell/` — `app-shell`, `sidebar`, `topbar`, `theme-toggle`,
  `command-palette`, `vps-switcher`.

Composition rules:

- Pages are built from `PageHeader` + `Panel` + primitives.
- Feature pages wrap content in `VpsGate`, which renders a loading, error or
  "no VPS" state before rendering the feature. This keeps every page honest
  about data availability.
- `states.tsx` provides the canonical empty/error/loading visuals; reuse it
  instead of bespoke placeholders.

## 6. Theming

- Light and dark themes are driven by the `.dark` class on `<html>`, managed by
  `next-themes` and toggled from `theme-toggle`.
- The default is dark, matching the "deep space" identity.
- All tokens are defined for both themes; a component must look correct in both
  without conditional classes.
- Theme choice is client-side only (no flash) via the theme provider.

## 7. Motion

Defined in `tailwind.config.ts`:

| Animation | Use |
| --- | --- |
| `fade-in` / `fade-out` | Appearance/disappearance |
| `slide-up` / `slide-down` | Popovers, panels, toasts |
| `scale-in` | Dialogs, command palette |
| `shimmer` | Skeleton shimmer |
| `indeterminate` | Indeterminate progress bars |
| `pulse-soft` | Live/health indicators |

Timings are short (120–200ms) with spring-like easing
(`cubic-bezier(0.16, 1, 0.3, 1)`). `prefers-reduced-motion: reduce` collapses
all animation and transition durations to ~0ms globally.

## 8. Accessibility

- A visible `:focus-visible` ring (`--primary-ring`, 2px, 2px offset) is applied
  globally.
- Interactive elements carry accessible names; icon-only buttons use
  `aria-label` and a tooltip.
- Dialogs, dropdowns, tabs, switches and tooltips are built on Radix, which
  provides focus trapping, roving focus and correct ARIA semantics.
- Status is never conveyed by color alone: `status-pill` pairs color with a
  text label.
- Reduced-motion and sufficient contrast are requirements, not extras.

## 9. Contribution rules

1. Use tokens; never raw hex/hsl in components.
2. Prefer an existing primitive; extend it before creating a parallel one.
3. Every new component must render correctly in light and dark, at focus, and
   with reduced motion.
4. Keep motion meaningful and short.
5. Numbers use `.tabular`; addresses/keys use the mono font.
6. Empty, loading and error states are mandatory for any data-bound view.
7. No emoji in the product UI.
