## Context

The game was initially styled with a warm brick-red/gold/brown Chinese room aesthetic. The project config context specifies the canonical theme as Blue (`#18B7F6`), Purple (`#666BCE`), and White (`#D7EEF6`). All color values in `style.css` need to be reconciled with these tokens. No game logic (`game.js`) or DOM structure (`index.html`) changes are needed.

## Goals / Non-Goals

**Goals:**
- Redesign the color palette using `#18B7F6`, `#666BCE`, `#D7EEF6` as brand anchors, with extended transition/gradient tokens for visual harmony
- Apply the new palette to every UI surface: background, top bar, sidebars, nav plank, panels, popups, toasts
- Align the layout structure with the config context spec: coins in the top-bar, a stat mini-bar visible on screen, bottom nav with 喂食
- Preserve readability, contrast, and the healing/cozy aesthetic with the new palette
- Keep all existing animations and emoji fallbacks intact

**Non-Goals:**
- Changing element IDs (game.js depends on these)
- Adding new game mechanics or features
- Resizing components or changing overall flex/grid proportions
- Replacing emoji fallbacks with images

## Decisions

### Color

| Decision | Choice | Alternative Considered |
|---|---|---|
| Color mapping strategy | Derive a full palette from the 3 brand tokens with light/dark/mid variants for hierarchy | Use the 3 colors verbatim — rejected; flat use creates insufficient contrast |
| Background color | Deep navy (`#0d1b2a`) to keep a dark, cozy room feel | `#D7EEF6` directly — rejected as too bright for a nighttime companion game |
| Accent/border color | `#18B7F6` as primary accent replacing gold `#d4a843` | `#666BCE` as accent — both work, but green-blue is more energetic for action/stat roles |
| Panel background | Soft white `#f0f8ff` / `#D7EEF6`-derived | Keep warm cream — rejected to align with cool palette |
| Nav plank | Deep blue-grey gradient replacing wood-brown | Remove plank style — rejected to preserve the structural "shelf" metaphor |
| Center button color | Keep existing pink gradient (`#e05c96`) for interact CTA | Retheme to `#666BCE` — pink is deliberately distinct as primary CTA |
| Text colors | Dark navy `#0d2a3a` headings, `#1a3a5c` body | Preserve `#4a2a10` brown — rejected; clashes with blue-based backgrounds |

**Color token reference:**

| Token | Value | Role |
|---|---|---|
| `--c-accent` | `#18B7F6` | Borders, highlights, active states |
| `--c-purple` | `#666BCE` | Secondary accent, tags, bond bar |
| `--c-light` | `#D7EEF6` | Avatar area, subtle tint fills |
| `--c-bg-dark` | `#0d1b2a` | Game container background, floor |
| `--c-bg-mid` | `#1a2e42` | Mid-tone surfaces (nav plank, sidebars) |
| `--c-bg-panel` | `#f0f8ff` | Panel card backgrounds, cool near-white |
| `--c-text-dark` | `#0d2a3a` | Primary text on light surfaces |
| `--c-text-mid` | `#1a3a5c` | Body/secondary text on light surfaces |
| `--c-text-light` | `#e8f4fb` | Text on dark backgrounds |
| `--c-accent-dim` | `rgba(24,191,118,0.15)` | Subtle hover/fill tints |

### Layout

| Decision | Choice | Alternative Considered |
|---|---|---|
| Coin display placement | Move `#coin-display` into `#top-bar` right side (remove floating overlay) | Keep as floating overlay — rejected to match config context layout |
| Stat visibility | Add compact `#stat-mini-bar` below top-bar showing Hunger / Energy / Mood | Stats panel-only — rejected; config context specifies a visible sub-top stat bar |
| Top-actions content | Replace 🍽/📊 buttons with coin display; feed moves to bottom nav | Keep feed/stats buttons in top-bar — rejected; config context assigns feed to bottom nav and coins to top-bar |
| Bottom nav composition | 喂食 \| 装扮 per config context | Keep 挖宝 in nav — remove 挖宝 |
| Left Side Bar | keeps only 小猪日记 | Remove 相册 and 伙伴
| game.js renderAll update | Minimal addition: populate 3 new `#mini-*` stat spans | No game.js changes — not viable; new DOM elements need values wired up |

## Migration Plan

- `index.html`: Move `#coin-display` into `#top-bar`; add `#stat-mini-bar`; swap 挖宝 nav button for 喂食.
- `style.css`: All color changes; add `#stat-mini-bar` styles; remove `.coin-display` floating position.
- `game.js`: Add 3 lines to `renderAll()` to populate `#mini-hunger`, `#mini-energy`, `#mini-mood`.
- Rollback: revert `style.css` and `index.html` to previous versions. No state or localStorage changes.

## Risks / Trade-offs

- **Emoji rendering on dark backgrounds** → Emojis have sufficient contrast on any background; no risk.
- **`bg_room_dawn.png` asset clash** → The room background image, when loaded, may visually conflict with the new palette. Mitigation: set a matching dark-navy fallback color so the CSS-only state is cohesive; asset update is deferred.
- **`mix-blend-mode: multiply` on sprites** → This mode works best on light backgrounds; on very dark backgrounds sprites may appear too dark. Mitigation: switch to `mix-blend-mode: normal` on `#char-sprite` since the new background is dark (transparent sprites will render correctly without multiply).
- **Pink CTA button contrast** → Pink on dark backgrounds retains sufficient contrast (WCAG AA). No change needed.


## Open Questions

- Should the `bg_room_dawn.png` background image be updated/replaced to match the new blue palette, or remain as a future asset task? (Current decision: defer — CSS fallback color covers the no-asset state.)
- Should the stat mini-bar show raw values (0–100) or icons with colour-coded fills like the stats panel? (Current decision: compact text — `🍚 72%  ⚡ 60%  🩷 85%` — to avoid layout complexity.)
