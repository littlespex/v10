---
status: decided
date: 2026-03-19
participants: Heff, David, Rahim, Sam, Dar, Wesley
---

# Gesture Component API Shape

## Decision

Use a single generic `<MediaGesture>` component with `type` and `action` props instead of separate specialized components per gesture type.

### React

```tsx
<MediaGesture type="doubletap" action="toggleFullscreen" />
<MediaGesture type="doubletap" action="seek" value={10} />
```

### HTML

```html
<media-gesture type="doubletap" action="toggleFullscreen"></media-gesture>
<media-gesture type="doubletap" action="seek" value="10"></media-gesture>
```

The component accepts additional props as needed. For example, `value` can specify an offset for a seek action.

## Context

Following the earlier decision that [gestures should be UI components](./gestures-as-components.md), the question became what shape the component API should take — one generic component or multiple specialized ones per gesture type or action.

## Alternatives Considered

- **Specialized components per gesture type** (e.g. `<DoubleTapGesture>`, `<TapGesture>`) — Would allow tree-shaking unused gesture types for smaller bundles, but the action logic that each gesture triggers adds minimal weight. The bundle size savings don't justify the API fragmentation.

- **Specialized components per action** (e.g. `<TogglePauseGesture>`, `<SeekGesture>`) — Even more granular, but creates many components for a narrow domain. Harder to discover and compose. Larger API surface.

## Rationale

The action handlers are lightweight — the added weight of bundling all actions together is unlikely to justify splitting into multiple components for tree-shaking benefits. A single component with `type`/`action` props is simpler to learn, easier to document, and keeps the API surface small. If bundle size becomes a real concern later, we can revisit.
