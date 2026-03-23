---
status: draft
date: 2026-03-23
---

# Menu

Compound, headless menu components for media controls — settings, context actions, and option selection.

## Contents

| Document                           | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| [index.md](index.md)              | Overview, anatomy, quick start                     |
| [architecture.md](architecture.md) | Core classes, DOM interaction, file structure       |
| [parts.md](parts.md)              | All compound parts — props, state, data attributes |
| [decisions.md](decisions.md)       | Design decisions and rationale                     |

## Problem

Media players need menus for three core interactions:

1. **Settings** — quality, playback speed, captions, audio tracks
2. **Context actions** — copy link, report, stats for nerds
3. **Option selection** — single-choice (radio) and multi-choice (checkbox) within groups

These menus come in two distinct interaction patterns:

- **Fly-out menus** — standard dropdown/context menus where submenus open to the side (Base UI Menu, Radix Dropdown Menu)
- **Panel menus** — carousel-style settings menus where clicking an item navigates to a sub-panel with animated transitions (YouTube, Plyr)

Requirements:

- Compound and composable — users assemble parts, omit what they don't need
- Headless — no baked-in styles, CSS custom properties for animation values
- Accessible — `role="menu"`, full keyboard support, roving tabindex, type-ahead
- Two interaction modes with shared primitives (items, radio groups, separators)
- Panel mode with smooth transitions: slide + container resize
- Treeshakeable — parts only imported when used
- Cross-platform — same core logic drives React components and HTML custom elements

## Anatomy

### React — Fly-out

```tsx
import { Menu } from '@videojs/react';

<Menu.Root>
  <Menu.Trigger>Options</Menu.Trigger>
  <Menu.Content>
    <Menu.Item onSelect={() => copyLink()}>Copy Link</Menu.Item>
    <Menu.Separator />
    <Menu.RadioGroup value={quality} onValueChange={setQuality}>
      <Menu.Label>Quality</Menu.Label>
      <Menu.RadioItem value="auto">Auto</Menu.RadioItem>
      <Menu.RadioItem value="1080p">1080p</Menu.RadioItem>
      <Menu.RadioItem value="720p">720p</Menu.RadioItem>
    </Menu.RadioGroup>
    <Menu.SubMenu>
      <Menu.SubMenuTrigger>Speed</Menu.SubMenuTrigger>
      <Menu.SubMenuContent>
        <Menu.RadioGroup value={speed} onValueChange={setSpeed}>
          <Menu.RadioItem value="0.5">0.5x</Menu.RadioItem>
          <Menu.RadioItem value="1">Normal</Menu.RadioItem>
          <Menu.RadioItem value="2">2x</Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.SubMenuContent>
    </Menu.SubMenu>
  </Menu.Content>
</Menu.Root>
```

### React — Panel

```tsx
import { Menu } from '@videojs/react';

<Menu.Root mode="panel">
  <Menu.Trigger>Settings</Menu.Trigger>
  <Menu.Content>
    <Menu.Panel id="main">
      <Menu.PanelTrigger target="quality">Quality</Menu.PanelTrigger>
      <Menu.PanelTrigger target="speed">Speed</Menu.PanelTrigger>
    </Menu.Panel>
    <Menu.Panel id="quality">
      <Menu.PanelBack />
      <Menu.PanelTitle>Quality</Menu.PanelTitle>
      <Menu.RadioGroup value={quality} onValueChange={setQuality}>
        <Menu.RadioItem value="auto">Auto</Menu.RadioItem>
        <Menu.RadioItem value="1080p">1080p</Menu.RadioItem>
        <Menu.RadioItem value="720p">720p</Menu.RadioItem>
      </Menu.RadioGroup>
    </Menu.Panel>
    <Menu.Panel id="speed">
      <Menu.PanelBack />
      <Menu.PanelTitle>Speed</Menu.PanelTitle>
      <Menu.RadioGroup value={speed} onValueChange={setSpeed}>
        <Menu.RadioItem value="0.5">0.5x</Menu.RadioItem>
        <Menu.RadioItem value="1">Normal</Menu.RadioItem>
        <Menu.RadioItem value="2">2x</Menu.RadioItem>
      </Menu.RadioGroup>
    </Menu.Panel>
  </Menu.Content>
</Menu.Root>
```

### HTML — Fly-out

```ts
import '@videojs/html/ui/menu';
```

```html
<button commandfor="player-menu">Options</button>
<media-menu id="player-menu" side="bottom" align="start">
  <media-menu-item>Copy Link</media-menu-item>
  <media-menu-separator></media-menu-separator>
  <media-menu-radio-group value="auto" label="Quality">
    <media-menu-label>Quality</media-menu-label>
    <media-menu-radio-item value="auto">Auto</media-menu-radio-item>
    <media-menu-radio-item value="1080p">1080p</media-menu-radio-item>
    <media-menu-radio-item value="720p">720p</media-menu-radio-item>
  </media-menu-radio-group>
</media-menu>
```

### HTML — Panel

```ts
import '@videojs/html/ui/menu';
```

```html
<button commandfor="settings-menu">Settings</button>
<media-menu id="settings-menu" mode="panel" side="top" align="end">
  <media-menu-panel id="main">
    <media-menu-panel-trigger target="quality">Quality</media-menu-panel-trigger>
    <media-menu-panel-trigger target="speed">Speed</media-menu-panel-trigger>
  </media-menu-panel>
  <media-menu-panel id="quality">
    <media-menu-panel-back></media-menu-panel-back>
    <media-menu-radio-group value="auto" label="Quality">
      <media-menu-radio-item value="auto">Auto</media-menu-radio-item>
      <media-menu-radio-item value="1080p">1080p</media-menu-radio-item>
    </media-menu-radio-group>
  </media-menu-panel>
  <media-menu-panel id="speed">
    <media-menu-panel-back></media-menu-panel-back>
    <media-menu-radio-group value="1" label="Speed">
      <media-menu-radio-item value="0.5">0.5x</media-menu-radio-item>
      <media-menu-radio-item value="1">Normal</media-menu-radio-item>
      <media-menu-radio-item value="2">2x</media-menu-radio-item>
    </media-menu-radio-group>
  </media-menu-panel>
</media-menu>
```

## Layers

Three layers, each independently useful:

| Layer | Package | Purpose |
| ----- | ------- | ------- |
| Core | `@videojs/core` | State computation, ARIA attrs, panel stack navigation. No DOM. |
| DOM | `@videojs/core/dom` | Keyboard navigation, type-ahead, panel transitions, focus management. |
| UI | `@videojs/react`, `@videojs/html` | Compound components and custom elements. HTML elements dispatch custom DOM events. |

See [architecture.md](architecture.md) for internals.

## CSS Custom Properties

Panel mode exposes measured dimensions as CSS custom properties on the Content element. Users style container transitions using these — no inline styles are applied.

| Property | Example | Description |
| -------- | ------- | ----------- |
| `--media-menu-panel-width` | `240px` | Measured width of the incoming panel |
| `--media-menu-panel-height` | `320px` | Measured height of the incoming panel |

```css
/* Animate container size between panels */
media-menu[mode="panel"] {
  width: var(--media-menu-panel-width);
  height: var(--media-menu-panel-height);
  overflow: hidden;
  transition:
    width 200ms ease,
    height 200ms ease;
}
```

## Data Attributes

### Content (inherited by all children)

State is exposed through data attributes for CSS targeting. Applied to the Content element **and all children**.

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-open` | present/absent | Menu is open |
| `data-side` | `top` / `bottom` / `left` / `right` | Popover positioning side |
| `data-align` | `start` / `center` / `end` | Popover positioning alignment |
| `data-mode` | `flyout` / `panel` | Menu interaction mode |
| `data-starting-style` | present/absent | Open transition in progress |
| `data-ending-style` | present/absent | Close transition in progress |

```css
/* Show menu content only when open */
media-menu:not([data-open]) {
  display: none;
}

/* Fade-in animation */
media-menu[data-starting-style] {
  opacity: 0;
  transform: scale(0.95);
}
```

### Items

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-highlighted` | present/absent | Item has keyboard/pointer focus |
| `data-checked` | present/absent | Radio/checkbox item is selected |
| `data-disabled` | present/absent | Item is disabled |

```css
/* Highlight style */
media-menu-item[data-highlighted] {
  background: rgba(255, 255, 255, 0.1);
}

/* Checked indicator */
media-menu-radio-item[data-checked]::before {
  content: '✓';
}
```

### Panels (panel mode)

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-active` | present/absent | Panel is the currently visible panel |
| `data-exiting` | present/absent | Panel is animating out |
| `data-direction` | `forward` / `back` | Direction of the current panel transition |

```css
/* Panel slide transitions */
media-menu-panel {
  transition: transform 200ms ease;
}

/* Forward: incoming slides in from right */
media-menu-panel[data-active][data-direction="forward"] {
  animation: slide-in-right 200ms ease;
}
media-menu-panel[data-exiting][data-direction="forward"] {
  animation: slide-out-left 200ms ease;
}

/* Back: incoming slides in from left */
media-menu-panel[data-active][data-direction="back"] {
  animation: slide-in-left 200ms ease;
}
media-menu-panel[data-exiting][data-direction="back"] {
  animation: slide-out-right 200ms ease;
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slide-out-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
@keyframes slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
```

## Keyboard

Keyboard events are handled by the **Content** element. Focus management uses **roving tabindex** — only the highlighted item has `tabindex="0"`, all others have `tabindex="-1"`.

| Key | Fly-out | Panel |
| --- | ------- | ----- |
| `ArrowDown` | Next item (wraps) | Next item (wraps) |
| `ArrowUp` | Previous item (wraps) | Previous item (wraps) |
| `ArrowRight` | Open submenu | Push panel (if panel trigger) |
| `ArrowLeft` | Close submenu | Pop panel (go back) |
| `Home` | First item | First item in current panel |
| `End` | Last item | Last item in current panel |
| `Enter` / `Space` | Activate item | Activate item |
| `Escape` | Close menu or submenu | Close menu or pop panel |
| `a-z, 0-9` | Type-ahead search | Type-ahead in current panel |

Type-ahead: characters accumulate and match item text content. Buffer resets after 500ms of inactivity. Search starts from the item after the current highlight.

## Accessibility

The menu follows the [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) and [Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).

```html
<button
  aria-haspopup="menu"
  aria-expanded="true"
  aria-controls="settings-menu">
  Settings
</button>
<div id="settings-menu" role="menu" tabindex="-1">
  <div role="menuitem" tabindex="0">Copy Link</div>
  <div role="separator"></div>
  <div role="group" aria-label="Quality">
    <div role="menuitemradio" aria-checked="true" tabindex="-1">Auto</div>
    <div role="menuitemradio" aria-checked="false" tabindex="-1">1080p</div>
  </div>
</div>
```

**Focus management:**

- On open: focus moves to Content, then to first (or previously selected) item
- On close: focus returns to Trigger
- Submenu open: focus moves to first item in submenu
- Submenu close (`ArrowLeft`): focus returns to parent submenu trigger
- Panel push: focus moves to first item in new panel (after transition)
- Panel pop: focus returns to the PanelTrigger that navigated forward

**Screen reader announcements:**

- `aria-checked` changes on radio/checkbox items are announced natively
- Panel title changes use `aria-live="polite"` on a visually hidden region within Content

## Related Docs

- [architecture.md](architecture.md) — Core classes, file structure, data flow
- [parts.md](parts.md) — Full API for every compound part
- [decisions.md](decisions.md) — Design rationale
- [Popover design](../popover/) — Underlying positioning and dismiss behavior
- [Slider design](../slider/) — Related compound component pattern
