## ADDED Requirements

### Requirement: Theme color tokens are applied to all UI surfaces
The game UI SHALL use the canonical theme palette — Blue (`#18B7F6`), Purple (`#666BCE`), and White (`#D7EEF6`) — as the basis for all color values in `style.css`, extended with derived light/dark/mid tokens for visual harmony. No warm-tone legacy colors (brick reds, golds, wood browns) SHALL remain as primary surface colors.

#### Scenario: Game container has dark navy background
- **WHEN** the page loads
- **THEN** `#game-container` displays a dark navy background derived from the theme (approx. `#0d1b2a`) rather than the former warm brick-red

#### Scenario: Top bar uses theme accent border
- **WHEN** `#avatar-area` and `#coin-display` elements are rendered
- **THEN** their borders use `#18B7F6` (or a close variant) instead of gold `#d4a843`

#### Scenario: Bottom nav plank uses theme dark tone
- **WHEN** `#nav-plank` is rendered
- **THEN** it displays a dark blue-grey gradient derived from `#0d1b2a`/`#1a2e42` instead of the wood-brown gradient

#### Scenario: Panels use light theme background
- **WHEN** any `.panel-card` is opened
- **THEN** the panel background is a cool near-white (`#f0f8ff` or `#D7EEF6` derived) instead of warm cream

### Requirement: Character sprite renders correctly on dark background
The `#char-sprite` element SHALL use `mix-blend-mode: normal` (not `multiply`) so that sprites with true transparency render correctly against the dark navy background.

#### Scenario: Sprite visible on dark stage
- **WHEN** `#char-sprite` is displayed and `#char-stage` has a dark background
- **THEN** the sprite image is fully visible without darkening artifacts from multiply blend mode

### Requirement: Text colors maintain readability on new palette
All primary text SHALL use dark navy (`#0d2a3a`) on light surfaces, and light blue-white (`#e8f4fb`) on dark surfaces, ensuring sufficient contrast.

#### Scenario: Panel text is readable
- **WHEN** `.panel-header`, `.stat-label`, `.food-name`, `.outfit-name` are rendered inside open panels
- **THEN** text color contrasts clearly against the cool light panel background

#### Scenario: Nav labels are readable on dark plank
- **WHEN** `.nav-label` elements are rendered on `#nav-plank`
- **THEN** text uses a light color (`#e8f4fb` or equivalent) with sufficient contrast against the dark blue-grey background

### Requirement: Layout matches config context spec
The game UI layout SHALL match the canonical layout defined in the config context: coins in the top-bar right, a stat mini-bar visible below the top-bar, and 喂食 in the bottom nav.

#### Scenario: Coins display is in the top-bar
- **WHEN** the page loads
- **THEN** `#coin-display` is rendered inside `#top-bar` on the right side, not as a floating overlay

#### Scenario: Stat mini-bar shows live values on screen
- **WHEN** the page loads and `renderAll()` runs
- **THEN** `#stat-mini-bar` is visible below the top-bar and displays current Hunger, Energy, and Mood values from the `G` state object

#### Scenario: Bottom nav contains 喂食 button
- **WHEN** `#nav-plank` is rendered
- **THEN** a `#nav-feed` button triggering `openPanel('feed')` is present in the bottom navigation with label `喂食`

#### Scenario: Remove 挖宝
- **WHEN** anytime
- **THEN** 挖宝 replaced by 外出, should be triggered randomly and automatically, instead of being manually triggered (to be implemented in future change)
