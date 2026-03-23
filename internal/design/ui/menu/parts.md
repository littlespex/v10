# Parts

Full API for every compound part across shared, fly-out, and panel menu modes.

## Shared Parts

These parts are used in both fly-out and panel modes. In React, they're accessed via `Menu.*`. In HTML, they're `<media-menu-*>` elements.

---

### Root

Context provider. Owns menu state, creates `MenuCore` + `createMenu()`, provides context to children. Does not render a DOM element in React — Content is the rendered container. In HTML, `<media-menu>` serves as both Root and Content.

#### React

```tsx
import { Menu } from '@videojs/react';

<Menu.Root
  mode="flyout"
  side="bottom"
  align="start"
  onOpenChange={(open) => {}}
>
  <Menu.Trigger>Options</Menu.Trigger>
  <Menu.Content>
    {/* children */}
  </Menu.Content>
</Menu.Root>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `mode` | `'flyout' \| 'panel'` | `'flyout'` | Menu interaction mode. |
| `side` | `PopoverSide` | `'bottom'` | Which side of the trigger the popup appears on. |
| `align` | `PopoverAlign` | `'start'` | Alignment of the popup along the trigger's edge. |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Initial open state (uncontrolled). |
| `closeOnEscape` | `boolean` | `true` | Close the menu when Escape is pressed. |
| `closeOnOutsideClick` | `boolean` | `true` | Close the menu when clicking outside. |
| `defaultPanel` | `string` | First Panel's `id` | Initial panel for panel mode. |

#### Callbacks

| Callback | Signature | Description |
| -------- | --------- | ----------- |
| `onOpenChange` | `(open: boolean) => void` | Fired when the menu opens or closes. |

#### Renders

React: No DOM element (provider only).
HTML: `<media-menu>` serves as the root and content container.

---

### Trigger

Button that opens and closes the menu. Clicking toggles the menu. Carries ARIA attributes that link to Content.

#### React

```tsx
<Menu.Trigger>Settings</Menu.Trigger>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `aria-haspopup` | `"menu"` |
| `aria-expanded` | `"true"` when menu is open, `"false"` when closed. |
| `aria-controls` | ID of the Content element. |

#### Renders

React: `<button>` with ARIA attributes and click/keyboard handlers.
HTML: Discovered via `commandfor` attribute on any element (same as Popover).

---

### Content

Popup container for menu items. Handles keyboard navigation (arrow keys, type-ahead, Escape), popover positioning, and in panel mode acts as the overflow container for panel transitions.

#### React

```tsx
<Menu.Content>
  <Menu.Item>Copy Link</Menu.Item>
</Menu.Content>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menu"` |
| `tabIndex` | `-1` |
| `popover` | `"manual"` |
| `id` | Auto-generated, referenced by Trigger's `aria-controls`. |

#### Data Attributes

Defined in `MenuDataAttrs`. Set on Content **and inherited by all children**.

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-open` | present/absent | Menu is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Popover positioning side. |
| `data-align` | `start` / `center` / `end` | Popover positioning alignment. |
| `data-mode` | `flyout` / `panel` | Menu interaction mode. |
| `data-starting-style` | present/absent | Open transition in progress. |
| `data-ending-style` | present/absent | Close transition in progress. |

#### CSS Custom Properties (panel mode)

Set on Content when in panel mode:

| Property | Description |
| -------- | ----------- |
| `--media-menu-panel-width` | Measured width of the incoming panel. |
| `--media-menu-panel-height` | Measured height of the incoming panel. |

#### Keyboard

See [index.md — Keyboard](index.md#keyboard) for the full key mapping.

#### Events (HTML)

`<media-menu>` dispatches custom DOM events. All events bubble.

| Event | Detail | Fires when |
| ----- | ------ | ---------- |
| `open-change` | `{ open: boolean }` | Menu opens or closes. |

#### Renders

React: `<div>` with `role="menu"`, keyboard handler, popover positioning.
HTML: `<media-menu>` custom element.

---

### Item

Standard menu item for actions (not selection). Activating an item fires `onSelect` and closes the menu.

#### React

```tsx
<Menu.Item onSelect={() => navigator.clipboard.writeText(url)}>
  Copy Link
</Menu.Item>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `disabled` | `boolean` | `false` | Disables the item. |
| `onSelect` | `() => void` | — | Fired when the item is activated (click, Enter, Space). |
| `render` | `RenderProp<MenuItemState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menuitem"` |
| `tabIndex` | `0` when highlighted, `-1` otherwise (roving tabindex). |
| `aria-disabled` | Present when disabled. |

#### Data Attributes

Defined in `MenuItemDataAttrs`:

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-highlighted` | present/absent | Item has keyboard/pointer focus. |
| `data-disabled` | present/absent | Item is disabled. |

#### Behavior

- Self-registers with `menu.registerItem(el)` on mount, cleanup on unmount.
- `onPointerEnter` highlights the item (pointer-based).
- `onPointerLeave` clears highlight.
- `onClick` / `Enter` / `Space` activates: fires `onSelect`, closes menu.
- Disabled items are skipped by keyboard navigation.

#### Renders

React: `<div>` with `role="menuitem"`.
HTML: `<media-menu-item>`.

---

### Label

Non-interactive heading within a group. Not focusable, not navigable by keyboard.

#### React

```tsx
<Menu.Label>Quality</Menu.Label>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"presentation"` |

#### Renders

React: `<div>` with `role="presentation"`.
HTML: `<media-menu-label>`.

---

### Separator

Visual divider between groups or items. Not focusable.

#### React

```tsx
<Menu.Separator />
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"separator"` |

#### Renders

React: `<div>` with `role="separator"`.
HTML: `<media-menu-separator>`.

---

### Group

Groups related items together. Provides a semantic label for assistive technology.

#### React

```tsx
<Menu.Group label="Playback">
  <Menu.Item>Loop</Menu.Item>
  <Menu.Item>Shuffle</Menu.Item>
</Menu.Group>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `label` | `string` | — | Accessible label for the group. Sets `aria-label`. |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"group"` |
| `aria-label` | From `label` prop. |

#### Renders

React: `<div>` with `role="group"`.
HTML: `<media-menu-group>`.

---

### RadioGroup

Single-selection group. Manages selection state — controlled or uncontrolled. Children `RadioItem` components read the selected value from this context.

In panel mode, selecting a RadioItem automatically navigates back to the parent panel. See [decisions.md](decisions.md#auto-back-on-radioitem-selection-in-panel-mode).

#### React

```tsx
<Menu.RadioGroup value={quality} onValueChange={setQuality} label="Quality">
  <Menu.RadioItem value="auto">Auto</Menu.RadioItem>
  <Menu.RadioItem value="1080p">1080p</Menu.RadioItem>
</Menu.RadioGroup>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `value` | `string` | — | Controlled selected value. |
| `defaultValue` | `string` | — | Initial value (uncontrolled). |
| `onValueChange` | `(value: string) => void` | — | Fired when selection changes. |
| `label` | `string` | — | Accessible label for the group. Sets `aria-label`. |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"group"` |
| `aria-label` | From `label` prop. |

#### Renders

React: `<div>` with `role="group"`.
HTML: `<media-menu-radio-group>`.

---

### RadioItem

Item within a RadioGroup. Represents a single selectable option. Shows checked state via `aria-checked` and `data-checked`.

#### React

```tsx
<Menu.RadioItem value="1080p">1080p</Menu.RadioItem>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `value` | `string` | — | The value this item represents. Compared against RadioGroup's value. |
| `disabled` | `boolean` | `false` | Disables the item. |
| `render` | `RenderProp<MenuRadioItemState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menuitemradio"` |
| `aria-checked` | `"true"` when value matches RadioGroup's value, `"false"` otherwise. |
| `tabIndex` | `0` when highlighted, `-1` otherwise. |
| `aria-disabled` | Present when disabled. |

#### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-highlighted` | present/absent | Item has keyboard/pointer focus. |
| `data-checked` | present/absent | Item is the selected option. |
| `data-disabled` | present/absent | Item is disabled. |

#### Behavior

- Reads checked state from `RadioGroupContext`.
- Activating (click, Enter, Space) calls `onValueChange` on the parent RadioGroup.
- In panel mode: after selection, automatically navigates back to the parent panel.
- Self-registers as a menu item for keyboard navigation.

#### Renders

React: `<div>` with `role="menuitemradio"`.
HTML: `<media-menu-radio-item>`.

---

### CheckboxItem

Toggle item with checked/unchecked state. Independent of RadioGroup — each CheckboxItem manages its own state.

#### React

```tsx
<Menu.CheckboxItem
  checked={loop}
  onCheckedChange={setLoop}
>
  Loop
</Menu.CheckboxItem>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `checked` | `boolean` | — | Controlled checked state. |
| `defaultChecked` | `boolean` | `false` | Initial checked state (uncontrolled). |
| `onCheckedChange` | `(checked: boolean) => void` | — | Fired when checked state toggles. |
| `disabled` | `boolean` | `false` | Disables the item. |
| `render` | `RenderProp<MenuCheckboxItemState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menuitemcheckbox"` |
| `aria-checked` | `"true"` or `"false"`. |
| `tabIndex` | `0` when highlighted, `-1` otherwise. |
| `aria-disabled` | Present when disabled. |

#### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-highlighted` | present/absent | Item has keyboard/pointer focus. |
| `data-checked` | present/absent | Item is checked. |
| `data-disabled` | present/absent | Item is disabled. |

#### Renders

React: `<div>` with `role="menuitemcheckbox"`.
HTML: `<media-menu-checkbox-item>`.

---

### ItemIndicator

Visual indicator that renders when the parent radio or checkbox item is checked. Typically used to show a checkmark or dot.

#### React

```tsx
<Menu.RadioItem value="1080p">
  <Menu.ItemIndicator>✓</Menu.ItemIndicator>
  1080p
</Menu.RadioItem>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<{ checked: boolean }>` | — | Custom render element. |

#### Behavior

- Reads checked state from the nearest RadioItem or CheckboxItem context.
- Renders children only when the parent item is checked.
- Hidden from assistive technology (`aria-hidden="true"`) — the parent item's `aria-checked` handles the semantic.

#### Renders

React: `<span>` with `aria-hidden="true"`. Conditionally rendered.
HTML: `<media-menu-item-indicator>`. Hidden via `display: none` when unchecked.

---

## Fly-out Parts

These parts are used in fly-out mode for nested submenus.

---

### SubMenu

Context provider for a nested submenu. Creates its own `createMenu()` instance linked to the parent menu for coordinated open/close behavior. Does not render a DOM element.

#### React

```tsx
<Menu.SubMenu>
  <Menu.SubMenuTrigger>Speed</Menu.SubMenuTrigger>
  <Menu.SubMenuContent>
    {/* submenu items */}
  </Menu.SubMenuContent>
</Menu.SubMenu>
```

#### Behavior

- Creates a nested `MenuApi` linked to the parent.
- Parent tracks whether this submenu is open.
- `ArrowLeft` on the parent closes this submenu and returns focus.

#### Renders

React: No DOM element (provider only).
HTML: Nesting is implicit — no separate element.

---

### SubMenuTrigger

Menu item that opens a submenu. Renders as a `menuitem` with submenu-related ARIA.

#### React

```tsx
<Menu.SubMenuTrigger>Speed</Menu.SubMenuTrigger>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `disabled` | `boolean` | `false` | Disables the trigger. |
| `render` | `RenderProp<MenuSubMenuTriggerState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menuitem"` |
| `aria-haspopup` | `"menu"` |
| `aria-expanded` | `"true"` when submenu is open, `"false"` when closed. |
| `tabIndex` | `0` when highlighted, `-1` otherwise. |

#### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-highlighted` | present/absent | Trigger has keyboard/pointer focus. |
| `data-open` | present/absent | Submenu is open. |
| `data-disabled` | present/absent | Trigger is disabled. |

#### Behavior

- Opens submenu on click, `ArrowRight` (keyboard), or hover (pointer devices with `(hover: hover)` media query).
- Hover uses a delay (composed from popover's `openOnHover` + `delay`).
- Touch devices fall back to click-only.
- Self-registers as a menu item for keyboard navigation.

#### Renders

React: `<div>` with `role="menuitem"` and submenu ARIA.
HTML: Discovered via children of `<media-menu>` with submenu nesting.

---

### SubMenuContent

Popup container for submenu items. Positioned to the side of SubMenuTrigger. Has its own `role="menu"` scope.

#### React

```tsx
<Menu.SubMenuContent>
  <Menu.RadioGroup value={speed} onValueChange={setSpeed}>
    <Menu.RadioItem value="1">Normal</Menu.RadioItem>
    <Menu.RadioItem value="2">2x</Menu.RadioItem>
  </Menu.RadioGroup>
</Menu.SubMenuContent>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menu"` |
| `tabIndex` | `-1` |

#### Behavior

- Positioned relative to SubMenuTrigger using popover positioning.
- Keyboard navigation scoped to this submenu's items.
- `Escape` or `ArrowLeft` closes the submenu, returns focus to parent.

#### Renders

React: `<div>` with `role="menu"`.
HTML: Nested `<media-menu>` element.

---

## Panel Parts

These parts are used in panel mode for carousel-style navigation.

---

### Panel

Container for a single panel in the carousel stack. Identified by a unique `id` prop. Only rendered in the DOM when active (top of panel stack) or exiting (animating out during a transition).

#### React

```tsx
<Menu.Panel id="quality">
  <Menu.PanelBack />
  <Menu.PanelTitle>Quality</Menu.PanelTitle>
  <Menu.RadioGroup value={quality} onValueChange={setQuality}>
    <Menu.RadioItem value="auto">Auto</Menu.RadioItem>
    <Menu.RadioItem value="1080p">1080p</Menu.RadioItem>
  </Menu.RadioGroup>
</Menu.Panel>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `id` | `string` | — | **Required.** Unique identifier for this panel. Referenced by PanelTrigger's `target`. |
| `render` | `RenderProp<MenuPanelState>` | — | Custom render element. |

#### Data Attributes

Defined in `MenuPanelDataAttrs`:

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-active` | present/absent | Panel is the currently visible panel. |
| `data-exiting` | present/absent | Panel is animating out. |
| `data-direction` | `forward` / `back` | Direction of the current panel transition. |

#### Behavior

- Renders children only when panel is active or exiting.
- Measures own dimensions (`offsetWidth`, `offsetHeight`) for container size animation.
- During transition: both the active and exiting panel are in the DOM simultaneously.
- After transition: only the active panel remains.

#### Renders

React: `<div>` with panel data attributes.
HTML: `<media-menu-panel>`.

---

### PanelTrigger

Menu item that navigates forward to a target panel. Extends Item behavior with panel navigation.

#### React

```tsx
<Menu.PanelTrigger target="quality">Quality</Menu.PanelTrigger>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `target` | `string` | — | **Required.** ID of the panel to navigate to. |
| `disabled` | `boolean` | `false` | Disables the trigger. |
| `render` | `RenderProp<MenuItemState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `role` | `"menuitem"` |
| `tabIndex` | `0` when highlighted, `-1` otherwise. |
| `aria-disabled` | Present when disabled. |

#### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-highlighted` | present/absent | Trigger has keyboard/pointer focus. |
| `data-disabled` | present/absent | Trigger is disabled. |

#### Behavior

- `onClick` / `Enter` / `Space` calls `menu.pushPanel(target)`.
- `ArrowRight` also calls `menu.pushPanel(target)`.
- Self-registers as a menu item for keyboard navigation.
- After pushing a panel, focus moves to the first item in the new panel (after transition completes).
- The panel stack tracks which PanelTrigger navigated forward, so popPanel can return focus here.

#### Renders

React: `<div>` with `role="menuitem"`.
HTML: `<media-menu-panel-trigger>`.

---

### PanelBack

Button that navigates back to the previous panel. Typically placed at the top of a sub-panel.

#### React

```tsx
<Menu.PanelBack />
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `label` | `string` | `'Back'` | Accessible label. Sets `aria-label`. |
| `render` | `RenderProp<MenuPanelState>` | — | Custom render element. |

#### ARIA (automatic)

| Attribute | Value |
| --------- | ----- |
| `aria-label` | From `label` prop (default `"Back"`). |

#### Behavior

- `onClick` calls `menu.popPanel()`.
- `ArrowLeft` anywhere in the panel also pops (handled by Content's `onKeyDown`).
- After popping, focus returns to the PanelTrigger that navigated to this panel.
- Not rendered (or disabled) when the panel stack is at root depth.

#### Renders

React: `<button>` with `aria-label`.
HTML: `<media-menu-panel-back>`.

---

### PanelTitle

Title for the current panel. Announced by screen readers when navigating between panels via `aria-live`.

#### React

```tsx
<Menu.PanelTitle>Quality</Menu.PanelTitle>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<MenuPanelState>` | — | Custom render element. |

#### Behavior

- Provides a visual heading for the current panel.
- Content updates are announced via `aria-live="polite"` on a visually hidden region within Content.

#### Renders

React: `<div>`.
HTML: Rendered as text within `<media-menu-panel>`.

---

## HTML Element Tags

| Component | Tag |
| --------- | --- |
| Content | `<media-menu>` |
| Item | `<media-menu-item>` |
| Label | `<media-menu-label>` |
| Separator | `<media-menu-separator>` |
| Group | `<media-menu-group>` |
| RadioGroup | `<media-menu-radio-group>` |
| RadioItem | `<media-menu-radio-item>` |
| CheckboxItem | `<media-menu-checkbox-item>` |
| ItemIndicator | `<media-menu-item-indicator>` |
| Panel | `<media-menu-panel>` |
| PanelTrigger | `<media-menu-panel-trigger>` |
| PanelBack | `<media-menu-panel-back>` |

## React Namespace Re-exports

All parts are exported under the `Menu.*` namespace. Users need a single import:

```ts
import { Menu } from '@videojs/react';

// All parts available:
// Menu.Root, Menu.Trigger, Menu.Content,
// Menu.Item, Menu.Label, Menu.Separator, Menu.Group,
// Menu.RadioGroup, Menu.RadioItem, Menu.CheckboxItem, Menu.ItemIndicator,
// Menu.SubMenu, Menu.SubMenuTrigger, Menu.SubMenuContent,
// Menu.Panel, Menu.PanelTrigger, Menu.PanelBack, Menu.PanelTitle
```

`SubMenu.*` parts are only used in fly-out mode. `Panel*` parts are only used in panel mode. Using parts from the wrong mode is a no-op (no error, just unused).
