## Why

The game's config context defines a Blue/Purple/White theme (`#18B7F6`, `#666BCE`, `#D7EEF6`), but the current UI uses an unrelated warm brick-red/gold/brown palette. This mismatch makes the visuals inconsistent with the intended design direction, and updating now aligns the implementation with the established brand before deeper content work begins.

## What Changes

- Redisgn the colors of UI (including fonts, buttons...) based on the given three theme color. If needed, can have some extended colors (e.g. transition colors and gradients) that is close to the three colors to make the whole UI looks harmonious
- Replace all warm-tone color values (brick reds, gold `#d4a843`, wood browns) based on the config theme colors across `style.css`
- Update the layout (top-bar, sidebars, button-bars...) based on what's designed in config context.
- Update background, top-bar, sidebars, nav plank, panels, and popup to use blue/purple/white palette
- Adjust text and shadow colors for readability against the new cooler tones
- Keep the animations, and structure unchanged 

## Capabilities

### New Capabilities
- `config-theme-colors`: Defines and applies the canonical Blue/Purple/White color tokens (`#18B7F6`, `#666BCE`, `#D7EEF6`) consistently across all UI surfaces

### Modified Capabilities
<!-- No existing spec-level capability requirements are changing; this is a new visual design baseline -->

## Impact

- `style.css` — primary file; all color changes go here
- `index.html` — layout changes
- `game.js` — no logic changes needed
- Assets remain unchanged
