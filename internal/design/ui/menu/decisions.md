# Design Decisions

Rationale behind menu component choices.

## Component Structure

### Single Menu with Mode Prop

**Decision:** A single `Menu.Root` with `mode: 'flyout' | 'panel'` rather than separate `DropdownMenu` and `PanelMenu` components.

**Alternatives:**

- Separate `DropdownMenu.*` and `PanelMenu.*` namespaces — clearer mode separation, but duplicates shared parts (Item, RadioGroup, Separator, etc.) and doubles the API surface.
- Separate packages — maximum tree-shaking, but unnecessary complexity for parts that share 80% of their logic.

**Rationale:** Both modes share Trigger, Content, Item, Label, Separator, Group, RadioGroup, RadioItem, CheckboxItem, and ItemIndicator. Only SubMenu parts (fly-out) and Panel parts (carousel) are mode-specific. A single `Menu.*` namespace keeps the API smaller and composition intuitive. Parts that only apply to one mode are simply unused in the other — no error, no overhead. This also leaves room for a future hybrid mode.

### No Default Children

**Decision:** Menu does not render default children. Users compose everything explicitly.

**Alternatives:**

- Bake in a default item layout (icon + label + indicator) — easier to start, but breaks when users need different structures.
- Provide a `Default` export alongside parts — extra API surface without clear benefit.

**Rationale:** Same reasoning as slider — compound components should not assume structure. Different media players need different menu layouts (icons, descriptions, badges, shortcuts). Forcing explicit composition avoids "how do I remove the default indicator" problems.

### Compound Namespace Pattern

**Decision:** Use `Menu.*` namespace exports, matching the `Slider.*` and `TimeSlider.*` pattern.

```tsx
import { Menu } from '@videojs/react';

<Menu.Root>
  <Menu.Trigger>Options</Menu.Trigger>
  <Menu.Content>
    <Menu.Item>Copy Link</Menu.Item>
  </Menu.Content>
</Menu.Root>
```

**Alternatives:**

- Flat exports (`MenuRoot`, `MenuTrigger`, `MenuItem`) — verbose imports, no visual grouping.
- Nested namespaces (`Menu.Flyout.SubTrigger`) — too deep, awkward to use.

**Rationale:** Namespaces make composition readable and imports clean. One import gives access to all parts. Matches the established project convention.

## Popover Integration

### Compose Popover Internally

**Decision:** `createMenu()` creates a `createPopover()` internally for open/close, positioning, and dismiss behavior. The popover is an implementation detail, not exposed in the menu API.

**Alternatives:**

- Extend `PopoverCore` — tight coupling, menu has different ARIA roles and keyboard behavior.
- Require users to wrap Menu in a Popover — leaky abstraction, requires understanding both APIs.
- Duplicate popover logic in menu — maintenance burden.

**Rationale:** Popover handles what it's good at: dismiss layers, Escape handling, outside-click detection, CSS Anchor Positioning with JS fallback, hover intent. Menu adds what's unique to menus: `role="menu"`, roving tabindex, arrow key navigation, type-ahead, panel stack. Composition keeps both focused.

## Keyboard & Focus

### Roving Tabindex

**Decision:** Roving tabindex (`tabindex="0"` on the highlighted item, `tabindex="-1"` on all others) rather than `aria-activedescendant`.

**Alternatives:**

- `aria-activedescendant` on Content — Content keeps focus, `aria-activedescendant` points to the visually highlighted item. Simpler focus management, but inconsistent screen reader support across browsers and platforms.

**Rationale:** Roving tabindex is recommended by the [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/). Items receive real DOM focus, so `:focus-visible` works naturally for keyboard-only styling. Both Radix and Base UI use this approach. The tradeoff is more DOM mutations on highlight change (updating two elements' `tabindex`), but this is negligible.

### Item Self-Registration

**Decision:** Items call `registerItem(el)` on mount and return a cleanup function. The collection is maintained in DOM order via `compareDocumentPosition`.

**Alternatives:**

- Query the DOM for `[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]` — simpler, but couples to ARIA role strings, doesn't work across Shadow DOM boundaries, and requires re-querying on every change.
- Track items by React key or index — fragile with conditional rendering and doesn't work in HTML.

**Rationale:** Self-registration follows the existing subscribe/cleanup pattern used throughout the codebase. It works across Shadow DOM boundaries, doesn't couple to attribute strings, and items are naturally sorted by DOM position. Registration/deregistration is O(n log n) at worst (re-sort on change), but n is typically small (5-20 items).

### Type-ahead with 500ms Debounce

**Decision:** Typed printable characters accumulate into a buffer. Search starts from the item after the current highlight. Buffer resets after 500ms of inactivity.

**Alternatives:**

- Single-character search (reset immediately) — faster for single-letter jumps, but can't search multi-word items like "Playback Rate".
- Longer debounce (1000ms) — more forgiving, but feels sluggish for single-letter searches.

**Rationale:** 500ms is the standard debounce window used by Radix, Base UI, and native OS menus. Multi-character accumulation allows searching "1080" to jump to "1080p" rather than cycling through items starting with "1". Matches the [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) recommendation.

## Selection

### RadioGroup Context for Selection State

**Decision:** `RadioGroup` provides its own `RadioGroupContext`. `RadioItem` reads checked state from this context. RadioGroup can be controlled or uncontrolled independently of the menu.

**Alternatives:**

- Menu-level selection state — simpler, but couples selection to the menu. Can't have two independent radio groups in the same menu.
- Item-level `checked` prop — no group concept, users manage exclusivity manually.

**Rationale:** Decouples selection logic from menu navigation. Each RadioGroup manages its own value independently. Same pattern as Radix's `DropdownMenu.RadioGroup`. Controlled and uncontrolled modes both work naturally.

### Auto-back on RadioItem Selection in Panel Mode

**Decision:** When a `RadioItem` is selected in panel mode, automatically navigate back to the parent panel.

**Alternatives:**

- Stay on current panel after selection — user must press back manually. More control but more clicks for the most common workflow.
- Configurable via prop (`closeOnSelect`) — maximum flexibility but adds API surface for a behavior that should have a strong default.

**Rationale:** YouTube and Plyr both auto-navigate back after selecting a quality or speed option. This is the expected behavior for settings menus — you open, pick an option, and you're back at the main panel. The transition animation provides visual feedback that the selection was made. Users who need to stay on the panel can use regular `Item` instead of `RadioItem`.

## Panel Transitions

### Panel Stack as State

**Decision:** Panel navigation is modeled as a stack of `{ panelId, triggerId }` entries stored in `State<PanelNavigationState>`. Push adds to the stack, pop removes.

**Alternatives:**

- Flat `activePanel` string — can't support deep nesting (quality → advanced quality → codec).
- Router-style path matching — over-engineered for a menu component.

**Rationale:** A stack naturally supports arbitrary nesting depth and provides the data needed for focus restoration (which PanelTrigger to return focus to on pop). Both React and HTML layers can subscribe to state changes via `createState()`. The stack is small (typically 2-3 entries), so no performance concern.

### CSS-Driven Panel Animations

**Decision:** Panel transitions are driven by CSS custom properties (`--media-menu-panel-width`, `--media-menu-panel-height`) and data attributes (`data-active`, `data-exiting`, `data-direction`). No imperative DOM animation.

**Alternatives:**

- Web Animations API (`el.animate()`) — more control over timing, but requires imperative cleanup, doesn't compose with user CSS, and is harder to override.
- FLIP technique — overkill for a simple slide + resize.

**Rationale:** Follows the existing project convention — slider uses CSS vars for positioning, popover uses data attrs for transition states. CSS transforms are GPU-composited for 60fps performance. Users can override timing, easing, and even the animation itself via CSS. `getAnimations()` handles completion detection (same pattern as `createTransition()`).

### Container Size Animation via JS Measurement + CSS Transition

**Decision:** Measure panel dimensions with JS (`offsetWidth`, `offsetHeight`), set CSS custom properties, let CSS `transition` animate the container.

**Alternatives:**

- CSS `auto` height transition — not possible, CSS can't transition to/from `auto`.
- `ResizeObserver` only — detects size changes but doesn't provide "from" dimensions for smooth transitions.
- Fixed panel sizes — users define sizes via CSS. Simpler, but doesn't adapt to dynamic content.

**Rationale:** JS measurement is necessary because CSS can't transition to `auto`. The double-RAF pattern (matching `createTransition()`) ensures the browser paints the "from" state before the transition starts. CSS handles the actual interpolation for GPU compositing. The menu sets `overflow: hidden` during transitions to prevent content flash.

### Both Panels in DOM During Transition

**Decision:** During a panel transition, both the outgoing and incoming panels are rendered in the DOM. After the transition completes, only the active panel remains.

**Alternatives:**

- Keep all panels in DOM, toggle visibility — simpler rendering, but wastes DOM weight and may cause issues with duplicate IDs or focusable elements.
- Use `display: contents` on inactive panels — still in DOM for measurement but doesn't affect layout. Browser support concerns.

**Rationale:** CSS transitions require both panels to be present for the slide animation. Removing the outgoing panel after animation completes reduces DOM weight and avoids focus traps (inactive panels should not contain focusable elements). The `data-exiting` attribute lets CSS target the outgoing panel for its exit animation.

### Panel Mode Resets on Menu Close

**Decision:** When the menu closes, the panel stack resets to the root panel immediately. No panel animation plays — the popover's own close animation handles the visual exit. When the menu re-opens, it starts at the root panel.

**Alternatives:**

- Preserve panel state across close/open — user returns to whatever panel they were on. Useful for quick toggles, but unexpected for most settings workflows.
- Configurable via prop — adds API surface for an uncommon need.

**Rationale:** Users expect to see the root settings panel when reopening. YouTube and Plyr both reset. Preserving state would require managing stale panel content (what if a quality level disappears while the menu is closed?). The strong default covers 95% of use cases.

### Rapid Navigation Cancels In-Progress Transition

**Decision:** If the user navigates to a new panel while a transition is still in progress, the current transition is cancelled (skip to end state) and a new transition starts immediately.

**Alternatives:**

- Queue navigations — transitions play in sequence. Feels sluggish for fast users.
- Block navigation during transition — prevents rapid clicking but feels unresponsive.

**Rationale:** Immediate cancellation feels responsive. The user's intent is to reach the target panel, not to watch every intermediate animation. Cancellation reuses the same pattern as `createTransition().cancel()` — patch `status: 'idle'` to skip to end, then start fresh.

## Fly-out Submenus

### SubMenu as Nested Menu Context

**Decision:** `SubMenu` creates its own `createMenu()` instance linked to the parent menu. Each submenu manages its own focus, highlight, and open/close state independently.

**Alternatives:**

- Single flat item list with indentation — simpler navigation, but can't support independent keyboard scopes or positioning.
- SubMenu shares parent's item collection — items from all levels are in one list. Arrow keys navigate everything. Confusing when submenus are visually separated.

**Rationale:** Nested contexts allow each submenu to have its own keyboard scope (arrow keys only navigate within that submenu), its own `role="menu"` for assistive technology, and independent positioning. The parent tracks submenu open state so `ArrowLeft` can close the submenu and return focus. Same architecture as Radix and Base UI.

### Hover-to-Open Submenus on Pointer Devices

**Decision:** Fly-out submenus open on hover (for pointer devices with `(hover: hover)` media query) + `ArrowRight` (keyboard). Click also works as a fallback.

**Alternatives:**

- Click-only — simpler, but doesn't match desktop user expectations for dropdown menus.
- Hover without media query check — would cause issues on touch devices where hover events fire on tap.

**Rationale:** Desktop users expect submenus to open on hover — this is standard behavior for Radix, Base UI, and native OS menus. The `(hover: hover)` media query check ensures touch devices use click-only. Hover uses the composed popover's `openOnHover` with a configurable delay (default 300ms from popover) to prevent accidental opens during pointer transit.

## Styling

### Data Attributes Inherited by Children

**Decision:** Content-level data attributes (`data-open`, `data-side`, `data-align`, `data-mode`, `data-starting-style`, `data-ending-style`) are applied to Content **and all children**, following the slider pattern.

**Alternatives:**

- Content-only — children use ancestor selectors. More verbose CSS.
- Selective inheritance — inconsistent, requires memorizing rules.

**Rationale:** Same reasoning as slider — enables `data-[open]:` Tailwind selectors directly on children, avoids ancestor selector verbosity, consistent with the established project convention. Performance cost of updating attributes on a few extra elements is negligible.

### `data-starting-style` / `data-ending-style` for Open/Close Transitions

**Decision:** Reuse the same transition data attributes as Popover (`data-starting-style`, `data-ending-style`) rather than inventing menu-specific names.

**Alternatives:**

- Menu-specific names (`data-menu-opening`, `data-menu-closing`) — clearer provenance, but fragments the convention.

**Rationale:** Menus use the same `createTransition()` lifecycle as popovers. CSS authors targeting transitions should use the same attributes regardless of whether the element is a popover or a menu. Consistent naming across all transitioning components.

### No Part Identification Attributes

**Decision:** No `data-part` attributes. In HTML, tag names identify parts (`<media-menu-item>`). In React, users apply their own classes.

**Rationale:** Same as slider — HTML custom elements are self-identifying by tag name. React users compose their own elements and provide `className`. Adding `data-part` creates a parallel identification system redundant with both approaches.

## Accessibility

### ARIA Roles

**Decision:** Content uses `role="menu"`, items use `role="menuitem"`, radio items use `role="menuitemradio"`, checkbox items use `role="menuitemcheckbox"`. Trigger uses `aria-haspopup="menu"`.

**Rationale:** Directly follows the [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) and [Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/). Using the correct roles ensures screen readers announce items, selection state, and menu structure correctly.

## RTL Support

### CSS Handles Direction Flip

**Decision:** Panel slide direction is handled in CSS via `[dir="rtl"]` selectors. No JavaScript changes needed for RTL.

`ArrowRight` always pushes a panel (opens submenu), `ArrowLeft` always pops (closes submenu) — these are logical directions independent of text direction. The visual slide direction (which way panels physically move on screen) is a CSS concern.

**Alternatives:**

- Swap `ArrowRight`/`ArrowLeft` behavior in RTL — matches native OS behavior for some menus, but the WAI-ARIA Menu Pattern doesn't mandate this for vertical menus. Would add complexity to the keyboard handler.

**Rationale:** CSS `[dir="rtl"]` selectors can flip `translateX` directions for panel animations. Keeping JS direction-agnostic simplifies the keyboard handler and matches the approach used by the slider component for RTL.
