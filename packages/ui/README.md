# @vextis/ui

Internal design system for SafeConfig. All components use inline styles driven by a theme token object (`T`) — no CSS files, no class names.

## Usage

```jsx
import { useTheme, Btn, Badge, Input, FONTS } from '@vextis/ui';

function MyComponent() {
  const { T } = useTheme();
  return <Btn T={T} variant="primary">save</Btn>;
}
```

Every component requires a `T` prop. Get it from `useTheme()` — never hardcode colors.

## Components

| Component | Description |
|-----------|-------------|
| `Btn` | Button — variants: `primary`, `secondary`, `danger`, `ghost`. Sizes: `sm`, `md` |
| `Badge` | Inline label — variants: `default`, `success`, `info`, `warning`, `danger` |
| `Input` | Text input — supports `label`, `hint`, `prefix`, `suffix`, `readOnly` |
| `Card` | Surface container with border and padding |
| `NavItem` | Sidebar navigation item with active state |
| `Stat` | Key/value stat display (dashboard cards) |
| `SecretRow` | Masked secret value with reveal/copy actions |
| `Toast` | Ephemeral notification |
| `AppTreeA/B/C` | App hierarchy tree visualizations (three layout variants) |
| `TermBlock` | Terminal-style output block |
| `TermLine` | Single line within a TermBlock |
| `Typewriter` | Animated text reveal |
| `Cursor` | Blinking terminal cursor |

## Theming

```jsx
import { ThemeProvider, useTheme } from '@vextis/ui';

// Wrap your app once
<ThemeProvider>
  <App />
</ThemeProvider>

// Inside any component
const { T, mode, toggle } = useTheme();
// mode: 'dark' | 'light'
// toggle(): switches theme
```

Key token conventions:

| Token | Use |
|-------|-----|
| `T.textPrimary` | Primary text (white in dark, black in light) |
| `T.textMuted` | Secondary / hint text |
| `T.surface` | Card / panel background |
| `T.overlay` | Slightly elevated surface (inputs, rows) |
| `T.border` | Default border color |
| `T.termGreen` | Terminal accents only — focus rings, prompts, status indicators |
| `T.amber` | Secret / sensitive value reveals |
| `T.red` / `T.redBorder` / `T.redBg` | Danger zones and error states |

## Typography

```js
import { FONTS } from '@vextis/ui';

FONTS.display  // DM Sans — headings, prose, readable text
FONTS.mono     // JetBrains Mono — keys, values, badges, labels, data
```

## Adding a component

1. Create `src/components/MyComponent.jsx` with a named export
2. `T` prop is required
3. Add the export to `index.js`
4. No business logic, no API calls, no global state
