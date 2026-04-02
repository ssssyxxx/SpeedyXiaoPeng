## 0. Layout — index.html & game.js

- [x] 0.1 Move `#coin-display` div into `#top-actions` inside `#top-bar`; remove the standalone `#coin-display` from its current position after `#char-stage`
- [x] 0.2 Remove the two `.top-btn` buttons (feed 🍽, stats 📊) from `#top-actions` (feed moves to nav; stats exposed via stat-mini-bar)
- [x] 0.3 Add `<div id="stat-mini-bar">` immediately below `#top-bar` with three spans: `<span class="mini-stat" id="mini-hunger">🍚 <span id="mini-hunger-val">0</span></span>` and equivalents for energy (`mini-energy-val`) and mood (`mini-mood-val`)
- [x] 0.4 In `#nav-plank`, replace the `#nav-outing` (挖宝) button with a `#nav-feed` button: `<button class="nav-btn" id="nav-feed" onclick="openPanel('feed')">` with nav-icon-bg (emoji 🍽) and label `喂食`
- [x] 0.5 Remove "相册" and "伙伴" on left-side bar
- [x] 0.6 In `game.js` `renderAll()`, add three lines to populate `#mini-hunger-val`, `#mini-energy-val`, `#mini-mood-val` from the `G` state object

## 1. CSS Color Tokens

- [x] 1.1 At the top of `style.css`, define CSS custom properties on `:root`: `--c-accent`, `--c-purple`, `--c-light`, `--c-bg-dark`, `--c-bg-mid`, `--c-bg-panel`, `--c-text-dark`, `--c-text-mid`, `--c-text-light`, `--c-accent-dim` (values per design.md token table)

## 2. Background and Global Colors

- [x] 2.1 Set `body` background to deep navy (`#0d1b2a`) replacing `#1a0f08`
- [x] 2.2 Set `#game-container` box-shadow/border to use dark blue tones instead of `#5a3010`
- [x] 2.3 Set `#bg-room` fallback `background-color` to dark navy (`#0d1b2a`) replacing `#7a2e1a`
- [x] 2.4 Update `#bg-wall` brick overlay to use blue-navy tones replacing the warm-red CSS gradient
- [x] 2.5 Update `#bg-floor` gradient from wood-brown to dark blue-grey (`#0d1b2a`/`#1a2e42`)

## 3. Decorative Room Elements

- [x] 3.1 Update `#bg-banner` background from brick-red gradient to deep purple/blue (`#666BCE` tones) with white text border
- [x] 3.2 Update `#bg-door` background from dark wood to dark blue-grey; keep `#door-fu` gold text
- [x] 3.3 Update `#door-knob`, `#bg-door` border color to match `#18B7F6` accent

## 4. Top Bar

- [x] 4.1 Replace all `#d4a843` gold border/shadow references in `#avatar-area` with `#18B7F6`
- [x] 4.2 Update `#avatar-circle` border and background fill from warm cream to `#D7EEF6`
- [x] 4.3 Update `#char-name` color from `#4a2a10` to `#0d2a3a`
- [x] 4.4 Style `#coin-display` in its new top-bar position: border `#18B7F6`, background `rgba(215,238,246,0.90)`, text color `#0d2a3a`
- [x] 4.5 Add `#stat-mini-bar` styles: flex row, gap, compact font size, `--c-text-light` color, subtle `rgba(13,27,42,0.5)` background strip

## 5. Sidebars

- [x] 5.1 Update `.side-item` border from `#d4a843` to `#18B7F6`; background to `rgba(215,238,246,0.88)`
- [x] 5.2 Update `.side-label` color from `#5a3010` to `#0d2a3a`
- [x] 5.3 Update `.right-btn` border from `#d4a843` to `#18B7F6`; background to `rgba(215,238,246,0.80)`

## 6. Character Stage

- [x] 6.1 Update `#context-label` text-shadow warm tones to cool blue-navy equivalents
- [x] 6.2 Update `#mood-tagline` background from `rgba(100,30,0,0.25)` to `rgba(13,27,42,0.35)`; keep gold text
- [x] 6.3 Change `#char-sprite` `mix-blend-mode` from `multiply` to `normal`

## 7. Bottom Nav Plank

- [x] 7.1 Replace `#nav-plank` wood-brown gradient with dark blue-grey gradient (`#1a2e42` → `#0d1b2a`)
- [x] 7.2 Update `#nav-plank` top border from `#c49060` to `#18B7F6`
- [x] 7.3 Update `.nav-icon-bg` background from warm cream to `#f0f8ff`; border from `#d4a843` to `#18B7F6`
- [x] 7.4 Update `.nav-label` color from `#fff8e8` to `#e8f4fb`

## 8. Panels and Backdrop

- [x] 8.1 Update `.panel-card` background gradient from warm cream to cool white (`#f0f8ff` → `#e8f4fb`)
- [x] 8.2 Update `.panel-card` border from `#e8c87a` to `#18B7F6` (or `#666BCE` for softer secondary variant)
- [x] 8.3 Update `.panel-header` background, text color (`#4a2a10` → `#0d2a3a`), and border color
- [x] 8.4 Update `.close-btn` background from `#e8c87a` to `#D7EEF6`; text color to `#0d2a3a`
- [x] 8.5 Update `.stat-label`, `.stat-val`, `.coin-info` text colors from warm brown to `#0d2a3a`/`#1a3a5c`
- [x] 8.6 Update `.food-item` default border from `#e8c87a` to `#18B7F6`; background to `#f0f8ff`
- [x] 8.7 Update `.outfit-item` border and active-state colors to use `#18B7F6` / `#666BCE`
- [x] 8.8 Update `.memory-entry` left border from `#e05c96` to `#666BCE`; `.diary-entry` left border from `#d4a843` to `#18B7F6`

## 9. Popup

- [x] 9.1 Update `.popup-card` border from `#d4a843` to `#18B7F6`; background to cool white gradient
- [x] 9.2 Update `.popup-title`, `.popup-text` text colors to `#0d2a3a`/`#1a3a5c`
- [x] 9.3 Update `.popup-rewards` border from `#e8c87a` to `#18B7F6`; background to `#f0f8ff`

## 10. Toast

- [x] 10.1 Update `#toast` border from `rgba(212,168,67,0.4)` to `rgba(24,191,118,0.4)`; text color from `#ffd8a0` to `#D7EEF6`

## 11. Verify

- [ ] 11.1 Load `index.html` via `python3 -m http.server` and visually confirm all surfaces use the blue/purple/white palette
- [ ] 11.2 Confirm coins appear in top-bar right; stat mini-bar shows live values; 喂食 is in the bottom nav
- [ ] 11.3 Confirm character sprite renders without dark multiply artifacts
- [ ] 11.4 Confirm all panel text is readable (no warm-brown text on cool-white backgrounds)
