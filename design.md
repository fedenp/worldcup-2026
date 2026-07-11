# Design System — Reference

Extracted from this codebase (React + Vite, plain CSS with custom properties) so it can be reused as a starting point in other apps. It's a dark-mode-first, data-dense, mobile-first system: dark navy/gold by default, light navy/blue as the alternate theme, monospace for numbers, sans for everything else.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Styling | Plain CSS files per component (no Tailwind/CSS-in-JS), CSS custom properties for theming |
| Icons | [`@phosphor-icons/react`](https://phosphoricons.com/) — `weight="duotone"` when active/selected, `weight="regular"` otherwise |
| Fonts | Google Fonts: `Sora` (UI text) + `DM Mono` (numbers/stats/labels) |
| Theming | `data-theme="light" | "dark"` attribute on root, toggled via a pill switch, persisted (localStorage) |

Import once, in the global stylesheet:

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
```

---

## 2. Design tokens (CSS custom properties)

Define both themes as attribute selectors on `:root`. Everything else in the app references these variables — never hardcode a hex value in a component file.

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 16px; -webkit-text-size-adjust: 100%; }

:root, [data-theme="light"] {
  --bg:        #F7F8FA;
  --surface:   #FFFFFF;
  --surface2:  #F0F2F5;
  --border:    #E8ECF0;
  --border2:   #D4DAE2;
  --ink:       #0F172A;
  --ink2:      #475569;
  --ink3:      #94A3B8;
  --ink4:      #CBD5E1;
  --blue:      #2563EB;
  --blue-dim:  #EFF4FF;
  --green:     #059669;
  --green-dim: #ECFDF5;
  --green-b:   #6EE7B7;
  --red:       #DC2626;
  --red-dim:   #FEF2F2;
  --amber:     #D97706;
  --amber-dim: #FFFBEB;
  --amber-b:   #FCD34D;
  --shadow:    0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05);
  --topbar-bg: rgba(247,248,250,0.93);
  --nav-bg:    rgba(255,255,255,0.93);
  --toggle-track: #E2E8F0;
  --toggle-knob:  #FFF;
  --gold: #D97706;
}

[data-theme="dark"] {
  --bg:        #0C1420;
  --surface:   #172030;
  --surface2:  #1E2D40;
  --border:    rgba(255,255,255,0.07);
  --border2:   rgba(255,255,255,0.13);
  --ink:       #F1F5F9;
  --ink2:      #7A93AC;
  --ink3:      #415A72;
  --ink4:      #243347;
  --blue:      #60A5FA;
  --blue-dim:  rgba(96,165,250,0.12);
  --green:     #34D399;
  --green-dim: rgba(52,211,153,0.10);
  --green-b:   rgba(52,211,153,0.3);
  --red:       #F87171;
  --red-dim:   rgba(248,113,113,0.10);
  --amber:     #FCD34D;
  --amber-dim: rgba(252,211,77,0.10);
  --amber-b:   rgba(252,211,77,0.3);
  --shadow:    0 1px 4px rgba(0,0,0,0.35);
  --shadow-md: 0 6px 24px rgba(0,0,0,0.5);
  --topbar-bg: rgba(12,20,32,0.93);
  --nav-bg:    rgba(23,32,48,0.95);
  --toggle-track: #1E2D40;
  --toggle-knob:  #F59E0B;
  --gold: #C9A84C;
}

body, .card, .topbar {
  transition: background 0.28s ease, color 0.28s ease, border-color 0.28s ease;
}
body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Sora', system-ui, sans-serif;
  min-height: 100dvh;
  overflow-x: hidden;
}
```

### Token semantics (how to reuse in a new app)

- **`--bg` / `--surface` / `--surface2`** — page background, card background, and a slightly-raised/inset background (tab pills, table headers, chip backgrounds).
- **`--border` / `--border2`** — hairline dividers (`--border`) vs. slightly stronger separators (`--border2`).
- **`--ink` → `--ink4`** — text scale from primary text (`--ink`) down to disabled/placeholder (`--ink4`). Use `--ink2` for secondary text/labels, `--ink3` for tertiary/meta text (timestamps, captions).
- **`--blue` / `--green` / `--red` / `--amber`** — semantic colors (info, positive, negative, warning), each with a `-dim` background tint and (for green/amber) a `-b` border tint for pill/badge combos. In dark mode these shift to lighter, higher-chroma variants for contrast on the navy background — don't reuse light-mode hex values in dark mode.
- **`--gold`** — the dark-theme accent (replaces `--blue` as the "active/brand" color in dark mode for nav highlights and back-buttons). Light mode's accent is `--blue`.
- **`--shadow` / `--shadow-md`** — card elevation and modal/overlay elevation.
- **`--topbar-bg` / `--nav-bg`** — translucent versions of surface, paired with `backdrop-filter: blur(20px)` for sticky bars.

### Non-color primitives worth carrying over

- **Radius:** cards/rows `14px`, small controls (tabs, pills, nav icons) `8–10px`, badges/chips `4–6px`, circular elements (dots, toggles, avatars) `50%`.
- **Card border:** always `1px solid var(--border)` + `box-shadow: var(--shadow)`, never a border-only or shadow-only card.
- **Spacing:** content padding `14px` mobile / `24px 32px` desktop; card internal padding `12–16px`; gaps between stacked cards `10–12px`.
- **Max content width:** `700px`, centered (`margin: 0 auto`), so text/cards never stretch full-width on tablet.

---

## 3. Typography

| Use | Font | Notes |
|---|---|---|
| Headings, body, labels, buttons | `Sora` | weights 300–800; headings use `font-weight: 700–800` with tight `letter-spacing: -0.02em` to `-0.03em` |
| Numbers, stats, timestamps, mono badges, uppercase eyebrow labels | `DM Mono` | weights 300–500; almost always paired with `text-transform: uppercase; letter-spacing: 0.06–0.08em` for small labels |

Rule of thumb: **if it's a number or a terse system label (date header, tab badge, "LIVE" pill), it's `DM Mono`. If it's a name, sentence, or heading, it's `Sora`.**

Type scale in use: `9px` (nav labels) · `10–11px` (eyebrow/meta) · `12–13px` (body/row text) · `14–15px` (card titles, brand name) · `18px` (section titles) · `24px+` (hero numbers/scores).

---

## 4. Layout shell

### Mobile (default, < 900px)
- Sticky **topbar** (52px): translucent blur background, brand mark (rounded-square logo chip) + title/year on the left, theme toggle + status pill on the right.
- **Bottom nav**: fixed, translucent blur, `64px` + safe-area inset, flex row of icon+label items, active item gets a filled rounded-square icon background (`--ink` in light mode, `--gold` in dark mode) and its label recolors to match.
- **Content**: single column, `max-width: 700px`, centered, `14px` padding, bottom padding reserves space for the nav bar.
- Drilling into a detail view (e.g. a pre-match page) swaps the topbar for a "← Back" button, hides the bottom nav, and slides the view in — a lightweight in-app "navigation stack" rather than routing.

### Desktop (≥ 900px)
- Bottom nav disappears; a **fixed left sidebar** (220px) takes over: brand block + theme toggle at top, list of nav items in the middle (active item = filled pill, same `--ink`/`--gold` treatment as mobile), meta footer at the bottom.
- Main content area scrolls independently (`flex: 1; overflow-y: auto`), content padding grows to `24px 32px`.
- This is a **single breakpoint** (`@media (min-width: 900px)`) system: build mobile-first, then override layout (never re-theme) at desktop.

```css
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--topbar-bg);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  height: 52px; padding: 0 16px;
  display: flex; align-items: center; justify-content: space-between;
}
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  height: calc(64px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--nav-bg);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
}
```

---

## 5. Core components (copy-paste patterns)

### Card
The single most-reused primitive. A card is: surface background, hairline border, `14px` radius, soft shadow, optional header row with an uppercase mono title + a small mono badge on the right, and a padded body.

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  margin: 12px 14px 0;
  box-shadow: var(--shadow);
}
.card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.card-title {
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--ink3);
}
.card-badge {
  font-family: 'DM Mono', monospace;
  font-size: 9.5px; color: var(--ink3);
  background: var(--surface2);
  padding: 2px 8px; border-radius: 4px;
}
.card-body { padding: 14px 16px; }
```

A grouped-list variant (used for schedules/tables) swaps the header for a solid dark strip (`#093C5D` in light mode → inverted `#DDE6ED` in dark mode) and stacks rows with `border-top` dividers instead of gaps — good for "section of rows" content like fixture lists or league tables:

```css
.list-group { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 10px; box-shadow: var(--shadow); }
.list-group-head {
  padding: 8px 14px; background: #093C5D; border-bottom: 1px solid var(--border);
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: #DDE6ED; font-family: 'DM Mono', monospace;
}
[data-theme="dark"] .list-group-head { background: #DDE6ED; color: #093C5D; }
.list-row { display: flex; align-items: center; padding: 11px 14px; gap: 10px; border-top: 1px solid var(--border); cursor: pointer; transition: background 0.12s; }
.list-row:first-of-type { border-top: none; }
.list-row:active { background: var(--surface2); }
```

### Badges / pills
Small, uppercase, mono, `4px` radius, colored by semantic token pairs (`{color}` text on `{color}-dim` background, sometimes with a `{color}-b` border):

```css
.badge {
  display: inline-block;
  font-size: 8px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 4px;
  font-family: 'DM Mono', monospace;
}
.badge-neutral { background: var(--surface2); color: var(--ink3); }
.badge-info    { background: var(--blue-dim);  color: var(--blue); }
.badge-live    { background: var(--green-dim); color: var(--green); border: 1px solid var(--green-b); }
```

A live/status "pulse dot" pairs with the live badge:
```css
.dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: pulse 1.2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
```

### Tabs (segmented control)
Flex row of equal-width pill buttons; active tab inverts to solid `--ink` (light) / `--gold` (dark) with white/dark text:

```css
.tabs { display: flex; gap: 6px; margin-bottom: 16px; padding: 0 4px; }
.tab {
  flex: 1; padding: 8px 4px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--ink2); font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tab.active { background: var(--ink); color: #fff; border-color: var(--ink); }
[data-theme="dark"] .tab.active { background: var(--amber); color: #111; border-color: var(--amber); }
```

### Theme toggle switch
```css
.toggle-track { width: 36px; height: 20px; background: var(--toggle-track); border-radius: 10px; position: relative; transition: background 0.28s; }
.toggle-knob {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  background: var(--toggle-knob); border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.24s cubic-bezier(0.4,0,0.2,1), background 0.28s;
}
[data-theme="dark"] .toggle-knob { transform: translateX(16px); }
```

### Progress / comparison bars
Horizontal tri-color or single-fill bar tracks, used for probabilities, attribute ratings, percentiles:

```css
.bar-track { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--surface2); }
.bar-fill-a { background: var(--blue); height: 100%; }
.bar-fill-b { background: var(--ink4); height: 100%; }
.bar-fill-c { background: var(--red); height: 100%; }
```

### Empty / loading / error states
Every list/data view gets the same centered placeholder treatment — never a blank screen:

```css
.state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 50vh; gap: 0.5rem; color: var(--ink3); font-size: 0.9rem; text-align: center; padding: 1rem;
}
.state.error { color: var(--red); }
.state .hint { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: var(--ink3); margin-top: 0.5rem; }
```

---

## 6. Interaction & motion

- Theme + color transitions: `0.28s ease` on `background`, `color`, `border-color`.
- Tap/press feedback: `:active { background: var(--surface2); opacity: 0.7 }` — no ripple effects, just a quick background/opacity shift. Always pair with `-webkit-tap-highlight-color: transparent`.
- Nav icon selection: `transform: scale(1.05)` + background fill, `transition: background 0.18s, transform 0.18s`.
- Toggle knob: `cubic-bezier(0.4,0,0.2,1)` easing for the slide.
- Live/pulsing indicators: `@keyframes pulse`/`blink` — `opacity: 1 → 0.3` over `1.2–2s`, infinite.
- No large page-transition animations beyond the slide-in used for drill-down detail views.

---

## 7. Iconography

- Library: **Phosphor Icons** (`@phosphor-icons/react`), not a custom SVG set.
- Sizes: `17px` (mobile nav), `20px` (desktop sidebar nav) — icons scale with context, not fixed globally.
- Weight convention: `weight="duotone"` when the icon represents the active/selected state, `weight="regular"` otherwise. Don't mix in `bold`/`fill`/`thin` — stick to these two weights for consistency.

```jsx
<Icon size={17} weight={activeTab === id ? 'duotone' : 'regular'} />
```

---

## 8. Applying this to a new app

1. Copy the token block from §2 verbatim as your starting palette; only change the **hue** of `--blue`/accent and `--gold` if you want a different brand color — keep the neutral/ink scale and the dim/border tint pattern, it's what makes badges and status colors feel cohesive.
2. Load `Sora` + `DM Mono` (or swap for your own sans + mono pair, but keep the two-typeface split: prose in sans, data in mono).
3. Build the shell first (§4): topbar + bottom nav on mobile, single breakpoint flip to sidebar on desktop.
4. Compose everything else from the five primitives in §5 (card, badge, tabs, toggle, bar) before inventing new components — most screens in this app are just cards containing rows, tables, or bars.
5. Never skip the empty/loading/error state (§5) — every data-driven view in this codebase has one, styled identically.
