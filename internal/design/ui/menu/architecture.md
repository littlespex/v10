# Architecture

Core classes, DOM interaction layer, and file structure for the Menu component.

## Core Layer

**Location:** `packages/core/src/core/ui/menu/`

### MenuCore

Follows the `PopoverCore` pattern — a framework-agnostic class that computes state and ARIA attributes from props and input.

```ts
interface MenuProps {
  mode?: 'flyout' | 'panel';
  side?: PopoverSide;
  align?: PopoverAlign;
  open?: boolean;
  defaultOpen?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  /** Initial panel ID for panel mode. Defaults to first Panel's id. */
  defaultPanel?: string;
}

interface MenuInput extends TransitionState {
  /** Index of the currently highlighted item (-1 = none). */
  highlightedIndex: number;
  /** Total number of interactive items. */
  itemCount: number;
}

interface MenuState extends TransitionFlags {
  open: boolean;
  status: TransitionStatus;
  side: PopoverSide;
  align: PopoverAlign;
  mode: 'flyout' | 'panel';
  highlightedIndex: number;
}
```

**Methods:**

- `setProps(props: MenuProps)` — merge with defaults
- `setInput(input: MenuInput)` — accept reactive state
- `getState(): MenuState` — compute derived state
- `getTriggerAttrs(state, contentId?)` — returns `{ 'aria-expanded', 'aria-haspopup': 'menu', 'aria-controls' }`
- `getContentAttrs(state)` — returns `{ role: 'menu', tabIndex: -1, popover: 'manual' }`
- `getItemAttrs(state, index, options?)` — returns `{ role, tabIndex, 'aria-checked', 'aria-disabled', id }`

**Namespace:** `MenuCore.Props`, `MenuCore.State`, `MenuCore.Input`

### PanelNavigationState

Panel stack management, separate from the menu open/close transition:

```ts
interface PanelNavigationState {
  /** Stack of panel IDs. Last entry = visible panel. */
  stack: string[];
  /** Direction of the last navigation. */
  direction: 'forward' | 'back' | null;
  /** Panel ID that is transitioning out (for animation). Null when idle. */
  exitingPanelId: string | null;
  /** Whether a panel transition is in progress. */
  transitioning: boolean;
}
```

### Constants

Following the slider's `*-data-attrs.ts` and `*-css-vars.ts` pattern:

**`menu-data-attrs.ts`** — Content-level data attributes:

```ts
export const MenuDataAttrs = {
  /** Present when the menu is open. */
  open: 'data-open',
  /** Popover positioning side. */
  side: 'data-side',
  /** Popover positioning alignment. */
  align: 'data-align',
  /** Menu interaction mode. */
  mode: 'data-mode',
  /** Present during open transition. */
  startingStyle: 'data-starting-style',
  /** Present during close transition. */
  endingStyle: 'data-ending-style',
} as const;
```

**`menu-item-data-attrs.ts`** — Item-level data attributes:

```ts
export const MenuItemDataAttrs = {
  /** Present when item has keyboard/pointer focus. */
  highlighted: 'data-highlighted',
  /** Present when radio/checkbox item is selected. */
  checked: 'data-checked',
  /** Present when item is disabled. */
  disabled: 'data-disabled',
} as const;
```

**`menu-panel-data-attrs.ts`** — Panel-level data attributes:

```ts
export const MenuPanelDataAttrs = {
  /** Present on the currently visible panel. */
  active: 'data-active',
  /** Present on the panel being animated out. */
  exiting: 'data-exiting',
  /** Direction of current panel transition. */
  direction: 'data-direction',
} as const;
```

**`menu-css-vars.ts`** — CSS custom properties for panel transitions:

```ts
export const MenuCSSVars = {
  /** Measured width of the incoming panel. */
  panelWidth: '--media-menu-panel-width',
  /** Measured height of the incoming panel. */
  panelHeight: '--media-menu-panel-height',
} as const;
```

---

## DOM Layer

**Location:** `packages/core/src/dom/ui/menu/`

### `createMenu()`

Main DOM interaction factory. Composes `createPopover()` internally for open/close behavior, then layers menu-specific keyboard navigation and focus management on top.

```ts
interface MenuOptions {
  transition: TransitionApi;
  mode: () => 'flyout' | 'panel';
  onOpenChange: (open: boolean, details: PopoverChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  closeOnEscape: () => boolean;
  closeOnOutsideClick: () => boolean;
  onHighlightChange?: (index: number) => void;
  onItemActivate?: (index: number, id?: string) => void;
  onPanelChange?: (panel: PanelNavigationState) => void;
}

interface MenuApi {
  input: State<MenuInput>;
  panelState: State<PanelNavigationState>;
  triggerProps: MenuTriggerProps;
  contentProps: MenuContentProps;
  readonly triggerElement: HTMLElement | null;
  setTriggerElement: (el: HTMLElement | null) => void;
  setContentElement: (el: HTMLElement | null) => void;
  open: (reason?: PopoverOpenChangeReason) => void;
  close: (reason?: PopoverOpenChangeReason) => void;
  registerItem: (el: HTMLElement, options?: { disabled?: boolean }) => () => void;
  highlight: (index: number) => void;
  pushPanel: (panelId: string) => void;
  popPanel: () => void;
  destroy: () => void;
}
```

### Keyboard Navigation

`contentProps.onKeyDown` handles all keyboard interaction:

| Key | Action |
| --- | ------ |
| `ArrowDown` | Highlight next item (wraps to first) |
| `ArrowUp` | Highlight previous item (wraps to last) |
| `Home` | Highlight first item |
| `End` | Highlight last item |
| `Enter` / `Space` | Activate highlighted item |
| `Escape` | Close menu (fly-out) or pop panel / close menu (panel) |
| `ArrowRight` | Open submenu (fly-out) or push panel (panel mode) |
| `ArrowLeft` | Close submenu (fly-out) or pop panel (panel mode) |
| Printable character | Type-ahead jump |

### Roving Tabindex

Maintains an ordered collection of registered item elements:

- Only the highlighted item has `tabindex="0"`
- All other items have `tabindex="-1"`
- Content element has `tabindex="-1"` for programmatic focus
- Arrow keys move highlight and focus between items

### Item Collection

Items self-register via `registerItem(el)` which returns a cleanup function (subscribe pattern). The collection is kept sorted by `compareDocumentPosition` to maintain DOM order. When items are added or removed, the internal list recomputes.

This approach:
- Works across Shadow DOM boundaries
- Doesn't couple to ARIA role strings
- Follows the existing subscribe/cleanup pattern

### Type-ahead Search

Internal to `createMenu()`:
- Accumulates typed printable characters into a buffer
- Resets buffer after 500ms of inactivity
- Searches item `textContent` for a match starting from the item after the current highlight
- Wraps around to the beginning if no match found after current position

### Focus Management

| Event | Action |
| ----- | ------ |
| Menu opens | Focus Content, then highlight first (or previously selected) item |
| Menu closes | Return focus to Trigger |
| Submenu opens | Focus first item in submenu content |
| Submenu closes | Return focus to parent SubMenuTrigger |
| Panel push | After transition completes, focus first item in new panel |
| Panel pop | After transition completes, return focus to PanelTrigger that navigated forward |

### `createCarouselTransition()`

Separate from the popover open/close transition. Coordinates panel swap animations.

```ts
interface CarouselTransitionOptions {
  getContentElement: () => HTMLElement | null;
  onTransitionComplete?: () => void;
}

interface CarouselTransitionApi {
  state: State<PanelNavigationState>;
  navigate: (panelId: string) => void;
  back: () => void;
  reset: () => void;
  destroy: () => void;
}
```

**Transition lifecycle:**

1. `navigate('quality')` called
2. **Measure outgoing panel** — capture `offsetWidth`, `offsetHeight`
3. **Patch state** — `{ stack: [..., 'quality'], direction: 'forward', exitingPanelId: previous, transitioning: true }`
4. **First RAF** — incoming panel is in DOM. Measure its dimensions. Set `--media-menu-panel-width`, `--media-menu-panel-height` on Content.
5. **Second RAF** — browser has painted "from" state. CSS transitions take over: container resizes, panels slide via `transform: translateX(...)`.
6. **Wait for animations** — `getAnimations()` settles on Content element (same pattern as `createTransition()`)
7. **Cleanup** — `{ exitingPanelId: null, transitioning: false }`. Only active panel remains in DOM.

**Rapid navigation:** If user navigates while a transition is in progress, cancel the current transition (skip to end state), start new transition from current visual state.

**Menu close:** `reset()` clears stack to `[defaultPanel]` immediately. No panel animation — the popover close animation handles the visual exit. When the menu re-opens, it starts at the root panel.

**Container size animation:** The Content element uses CSS `transition` on `width` and `height`, reading from `--media-menu-panel-width` and `--media-menu-panel-height`. JS measures the incoming panel dimensions and sets the CSS custom properties. CSS handles the smooth interpolation.

---

## Platform Layer File Structure

### React (`packages/react/src/ui/menu/`)

```text
context.tsx               — MenuContext, RadioGroupContext
index.parts.ts            — Namespace re-exports
index.ts                  — export { Menu }
menu-root.tsx             — Menu.Root
menu-trigger.tsx          — Menu.Trigger
menu-content.tsx          — Menu.Content
menu-item.tsx             — Menu.Item
menu-label.tsx            — Menu.Label
menu-separator.tsx        — Menu.Separator
menu-group.tsx            — Menu.Group
menu-radio-group.tsx      — Menu.RadioGroup
menu-radio-item.tsx       — Menu.RadioItem
menu-checkbox-item.tsx    — Menu.CheckboxItem
menu-item-indicator.tsx   — Menu.ItemIndicator
menu-sub.tsx              — Menu.SubMenu
menu-sub-trigger.tsx      — Menu.SubMenuTrigger
menu-sub-content.tsx      — Menu.SubMenuContent
menu-panel.tsx            — Menu.Panel
menu-panel-trigger.tsx    — Menu.PanelTrigger
menu-panel-back.tsx       — Menu.PanelBack
menu-panel-title.tsx      — Menu.PanelTitle
```

### HTML (`packages/html/src/ui/menu/`)

```text
menu-element.ts               — <media-menu>
menu-item-element.ts          — <media-menu-item>
menu-label-element.ts         — <media-menu-label>
menu-separator-element.ts     — <media-menu-separator>
menu-group-element.ts         — <media-menu-group>
menu-radio-group-element.ts   — <media-menu-radio-group>
menu-radio-item-element.ts    — <media-menu-radio-item>
menu-checkbox-item-element.ts — <media-menu-checkbox-item>
menu-panel-element.ts         — <media-menu-panel>
menu-panel-trigger-element.ts — <media-menu-panel-trigger>
menu-panel-back-element.ts    — <media-menu-panel-back>
```

### HTML Registration

Registration files in `src/define/ui/` exported as `@videojs/html/ui/menu`. Importing registers all menu elements:

```ts
// @videojs/html/ui/menu
// Registers: media-menu, media-menu-item, media-menu-label,
//   media-menu-separator, media-menu-group, media-menu-radio-group,
//   media-menu-radio-item, media-menu-checkbox-item,
//   media-menu-panel, media-menu-panel-trigger, media-menu-panel-back
```

### React Component Patterns

**`Menu.Root`** follows `PopoverRoot`:
- `useState(() => new MenuCore())` and `useState(() => createMenu(...))`
- `useSnapshot(menu.input)` for open/close re-renders
- `useSnapshot(menu.panelState)` for panel mode
- `useLatestRef` for callback props to avoid stale closures
- `useDestroy(menu)` for cleanup

**`Menu.Content`** follows `PopoverPopup`:
- Uses Popover positioning (CSS Anchor Positioning with JS fallback)
- Adds `contentProps` (`onKeyDown` for arrow nav, type-ahead)
- In panel mode: wraps children in overflow container with measured dimensions

**`Menu.Item`** registers with `menu.registerItem()` on mount:
- `useEffect` calls `registerItem(el)`, returns cleanup
- `data-highlighted` when index matches `highlightedIndex`
- `onPointerEnter` highlights, `onPointerLeave` clears
- `onClick` activates

**`Menu.RadioGroup`** provides its own context:
- Controlled: `value` + `onValueChange`
- Uncontrolled: `defaultValue` + internal state

**`Menu.Panel`** (panel mode):
- Renders children only when `active` or `exiting` (for animation)
- Applies panel data attributes
- Measures own dimensions, reports to parent

**`Menu.PanelTrigger`** extends `Menu.Item`:
- `onClick` calls `menu.pushPanel(target)` where `target` is a prop

### Context Shape

```ts
interface MenuContextValue {
  core: MenuCore;
  menu: MenuApi;
  state: MenuCore.State;
  stateAttrMap: StateAttrMap<MenuCore.State>;
  contentId: string;
  mode: 'flyout' | 'panel';
}

interface MenuRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}
```

`Menu.SubMenu` creates a nested `MenuContextValue` with its own `createMenu()` instance, linked to the parent for hover-to-open and arrow-key triggering.

---

## Domain Menu Roots (Future Work)

Similar to how `TimeSlider` extends `Slider`, domain menus compose `Menu.*` parts with media store connections. These are outlined here for direction but are not in scope for the initial `Menu` implementation.

### SettingsMenu

Top-level settings menu using panel mode. Connects to the media store to auto-discover available settings.

- `SettingsMenu.Root` — Composes `Menu.Root` with `mode="panel"`. Reads available features from the store.
- Namespace re-exports all generic `Menu.*` parts.
- React: `import { SettingsMenu } from '@videojs/react'`
- HTML: `<media-settings-menu>`

### QualityMenu

Quality/resolution selection. Connects to `selectQuality` from the store.

- `QualityMenu.Root` — Provides quality levels as `RadioItem` children. Handles `onValueChange` → `quality.setLevel()`.
- Can be used standalone (fly-out) or as a panel within `SettingsMenu`.
- React: `import { QualityMenu } from '@videojs/react'`
- HTML: `<media-quality-menu>`

### PlaybackRateMenu

Playback speed selection. Connects to `selectPlaybackRate`.

- `PlaybackRateMenu.Root` — Provides rate options. Handles `onValueChange` → `playbackRate.set()`.
- React: `import { PlaybackRateMenu } from '@videojs/react'`
- HTML: `<media-playback-rate-menu>`

### CaptionsMenu

Caption/subtitle track selection. Connects to `selectTextTracks`.

- `CaptionsMenu.Root` — Lists available text tracks plus "Off" option. Handles selection → `textTracks.setActive()`.
- React: `import { CaptionsMenu } from '@videojs/react'`
- HTML: `<media-captions-menu>`

### Domain Pattern

Domain menus only customize Root. All other parts are generic `Menu.*` re-exported under the domain namespace — same pattern as `TimeSlider.Track` = `Slider.Track`.

```ts
// settings-menu/index.parts.ts
export { Root } from './settings-menu-root';
// Re-export all generic parts
export {
  Trigger, Content, Item, Label, Separator, Group,
  RadioGroup, RadioItem, CheckboxItem, ItemIndicator,
  Panel, PanelTrigger, PanelBack, PanelTitle,
} from '../menu/index.parts';
```
