# Avia JS V10 Demo App

**Date:** 2026-03-23
**Status:** Approved

## Goal

Create a standalone React + Vite 8 app (`~/dev/avia-js-v10`) that demonstrates how to build a custom Media component for Video.js 10 using avia-js. Once verified working, the `task/avia-integration` branch of v10 is retired.

## Approach

**Approach A: Minimal wrapper** — Copy only the avia-specific source files into the new app. Import all Video.js abstractions (`DelegateMixin`, `ProxyMixin`, `CustomMediaMixin`, `VideoProvider`, skins, hooks) from published `@videojs/*` packages. Import avia engine from `@cbsinteractive/*` packages.

This makes the dependency boundary clear: copied files = custom code a consumer writes; everything else = library code.

## Project Structure

```
~/dev/avia-js-v10/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                    # Entry — renders App into #root
│   ├── App.tsx                     # VideoProvider → VideoSkin → AviaVideo
│   ├── App.css                     # Centered layout styles
│   └── media/
│       └── avia/
│           ├── index.ts            # AviaMediaDelegateBase, AviaMedia, AviaCustomMedia
│           ├── text-track.ts       # AviaTextTrack proxy
│           └── text-track-list.ts  # AviaTextTrackList proxy
```

## Dependencies

### Runtime

| Package | Import subpath | What's imported |
|---------|---------------|-----------------|
| `react`, `react-dom` (v19) | — | UI framework (`attachMediaElement` uses React 19 ref cleanup) |
| `@videojs/core` | `@videojs/core` | `ProxyMixin` (re-exported from `core/media/proxy`) |
| `@videojs/core` | `@videojs/core/dom/media/custom-media-element` | `CustomMediaMixin` |
| `@videojs/react` | `@videojs/react` | `createPlayer`, `useMediaAttach` |
| `@videojs/react` | `@videojs/react/video` | `videoFeatures`, `VideoSkin` |
| `@videojs/react` | `@videojs/react/video/skin.css` | Player controls CSS |
| `@cbsinteractive/avia-js` | — | `createVideoPlayer`, `Autoplay`, `LogLevel`, `PlayerEvent`, types |
| `@cbsinteractive/avia-js-cmaf` | — | `cmaf` plugin |

### Dev

| Package | Purpose |
|---------|---------|
| `vite` (v8) | Build tool |
| `@vitejs/plugin-react` | React JSX/refresh support |
| `typescript` | Type checking |

### Export Gaps in @videojs packages

The following are **not currently exported** from `@videojs/*` and need new export entries added before this app can import them:

| Module | Current location in v10 | Needed export |
|--------|------------------------|---------------|
| `Delegate`, `DelegateMixin` | `packages/core/src/core/media/delegate.ts` | Not exported from any barrel. Needs a new export entry in `@videojs/core` (e.g., add to `core/index.ts` re-exports). |
| `useDestroy` | `packages/react/src/utils/use-destroy.ts` | Internal utility, not exported from `@videojs/react`. |
| `useComposedRefs` | `packages/react/src/utils/use-composed-refs.ts` | Internal utility, not exported from `@videojs/react`. |
| `attachMediaElement` | `packages/react/src/utils/attach-media-element.ts` | Internal utility, not exported from `@videojs/react`. |
| `mediaProps` | `packages/react/src/utils/media-props.ts` | Internal utility, not exported from `@videojs/react`. |

**Resolution:** Add these as public exports from their respective packages. `DelegateMixin` and `Delegate` should be added to `@videojs/core`'s barrel exports. The four React utilities should be added to `@videojs/react`'s barrel exports.

### `MediaProxyMixin` — created locally

`MediaProxyMixin` is not a standalone export — it's a one-liner that applies `ProxyMixin` to browser globals:

```ts
import { ProxyMixin } from '@videojs/core';
export const MediaProxyMixin = ProxyMixin(
  globalThis.HTMLVideoElement ?? class {},
  globalThis.HTMLMediaElement ?? class {},
  globalThis.EventTarget ?? class {}
);
```

This line lives in the copied `src/media/avia/index.ts` since it's part of the custom media element wiring.

## Copied Files (from v10 `packages/core/src/dom/media/avia/`)

Three files are copied into `src/media/avia/`:

1. **`index.ts`** — `AviaMediaDelegateBase` (implements `Delegate`), `AviaCustomMedia` (web component), `AviaMedia` (React-compatible). Creates `MediaProxyMixin` locally from imported `ProxyMixin`.
2. **`text-track.ts`** — `AviaTextTrack` wrapping avia's `TextTrackInterface` as DOM `TextTrack`
3. **`text-track-list.ts`** — `AviaTextTrackList` with Proxy-based indexed access and bidirectional sync

### Import Rewiring

| v10 relative import | New import | Notes |
|--------------------|-----------|-------|
| `../../../core/media/delegate` | `@videojs/core` | `Delegate`, `DelegateMixin` (after export gap is fixed) |
| `../custom-media-element` | `@videojs/core/dom/media/custom-media-element` | `CustomMediaMixin` (already exported via `./dom/media/*` wildcard) |
| `../proxy` | Inlined in `index.ts` | `MediaProxyMixin` created locally from `ProxyMixin` imported via `@videojs/core` |

Intra-avia imports (`./text-track`, `./text-track-list`) remain relative.

## App Component

**`App.tsx`:**
- Creates a player via `createPlayer({ features: videoFeatures })`, destructures `Provider` as `VideoProvider`
- Renders `VideoProvider` → `VideoSkin` → inline `AviaVideo` component
- `AviaVideo` is a `forwardRef` component (~25 lines) that creates `AviaMedia`, hooks into player context via `useMediaAttach`, and renders a `<video>` element
- Uses `useDestroy`, `useComposedRefs`, `attachMediaElement`, `mediaProps` from `@videojs/react` (after export gap is fixed)
- Hardcoded src: `https://vod-gcs-cedexis-dev.cbsaavideo.com/CBS_Production_Entertainment_VMS/2024/08/14/2363551811915/15848_cmaf_clear_ondemand/stream_adjusted_vtt.mpd`
- Imports `@videojs/react/video/skin.css` for player controls styling

**`App.css`:**
- Dark background, centered player container (max-width 960px)

**`main.tsx`:**
- Standard Vite entry: `createRoot` → `<App />`

## Post-Migration Cleanup

After verifying the new app works:
- The `task/avia-integration` branch of v10 is no longer needed
- Avia sandbox template and references in v10 can be removed
