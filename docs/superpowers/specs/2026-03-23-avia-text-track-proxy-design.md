# Avia TextTrack Proxy Design

## Problem

Avia-js has its own text track API (`VideoPlayerInterface.textTracks`) that differs from the DOM `TextTrackList` API in two key ways:

1. **Single-track selection** — Only one text track can be active at a time, vs the DOM model where each track has an independent `mode`.
2. **Separate visibility toggle** — `textTrackEnabled` controls whether the active track is displayed, independent of track selection.

The store's `textTrackFeature` reads from `media.textTracks` (native `TextTrackList`) and listens for `addtrack`/`removetrack`/`change` events. We need a proxy that implements the DOM `TextTrackList` interface, backed by avia's API, so the store works transparently without modification.

## Approach

Two standalone classes — `AviaTextTrack` and `AviaTextTrackList` — that implement the DOM `TextTrack` and `TextTrackList` interfaces respectively. The delegate's `get textTracks()` returns the `AviaTextTrackList` instance. No native `<track>` elements are created. Avia owns cue rendering.

## Class Design

### AviaTextTrack

Implements `TextTrack`. A lightweight wrapper around avia's `TextTrackInterface` metadata.

**Backing reference:**
- Stores a reference to the original avia `TextTrackInterface` object, used for outbound sync (`player.textTrack = aviaTrackRef`)

**Readonly properties (set at construction from avia `TextTrackInterface`):**
- `id: string`
- `kind: TextTrackKind` — avia's `FORCED` kind is mapped to `'subtitles'` (closest DOM equivalent)
- `label: string` — defaults to `''` when avia's optional `label` is `undefined`
- `language: string`

**Mode:**
- `mode` getter/setter
- The setter notifies the parent `AviaTextTrackList` of mode changes, which routes them back to avia

**Cue stubs (avia owns rendering):**
- `cues` / `activeCues` — return `null`
- `addCue()` / `removeCue()` — no-op

**Other DOM stubs:**
- `sourceBuffer` — returns `null`
- `inBandMetadataTrackDispatchType` — returns `''`

**Inheritance:**
- Extends `EventTarget` for interface compliance (`cuechange` contract)

### AviaTextTrackList

Implements `TextTrackList`. Owns the collection of `AviaTextTrack` instances and bridges avia player events to DOM events.

**Collection interface:**
- `length` and indexed access (`list[0]`, `list[1]`, etc.) via JS `Proxy` trapping numeric property access
- `getTrackById(id)` — lookup by avia track ID
- `item(index)` — returns track at index or `null`
- `[Symbol.iterator]()` — iterates over internal track array

**Events dispatched:**
- `addtrack` — `TrackEvent` with `track` property
- `removetrack` — `TrackEvent` with `track` property
- `change` — plain `Event`

**Legacy event handler properties:**
- `onaddtrack`
- `onremovetrack`
- `onchange`

**Engine reference:**
- Set via `connect(engine)` after async engine initialization (not during `attach()` — the engine is created asynchronously in `#init`)
- Cleared on detach/destroy

## Event Flow

### Inbound (avia -> proxy)

| Avia event | Proxy action |
|---|---|
| `texttrackschange` | Diff `detail.textTracks` against current list by `id`. Create `AviaTextTrack` for new entries, fire `addtrack`. Remove stale entries, fire `removetrack`. New tracks start with `mode: 'disabled'` unless they match the current `player.textTrack` and `player.textTrackEnabled` is true (in which case `mode: 'showing'`). |
| `texttrackchange` | Find matching `AviaTextTrack` by `id` (not object reference — avia may create new objects per event). Update its internal mode to `showing`. Set all others to `disabled`. Fire `change`. |
| `texttrackenabledchange` | If `detail.textTrackEnabled` is `false`, set the active track's mode to `disabled`. Fire `change`. |

### Outbound (proxy -> avia, triggered by `track.mode` setter)

| User action | Proxy behavior |
|---|---|
| Set `track.mode` to `showing` or `hidden` | Set `player.textTrack` to the matching avia `TextTrackInterface`. Set `player.textTrackEnabled = true`. Update all other tracks' internal mode to `disabled` (single-track constraint). Fire `change`. |
| Set `track.mode` to `disabled` on the active track | Set `player.textTrackEnabled = false`. Fire `change`. |
| Set `track.mode` to `disabled` on an inactive track | Update internal state only. Fire `change`. |

### Loop guard

When an inbound avia event updates track modes, the proxy sets an internal flag to suppress the outbound path. The `AviaTextTrack` mode setter checks this flag before calling back into avia.

### Mode mapping

- `showing` and `hidden` both mean "enabled" in avia terms (`textTrackEnabled = true`)
- `disabled` means disabled (`textTrackEnabled = false` if it's the active track)
- The distinction between `showing` and `hidden` maps to avia's `renderTextTrackNatively` option, which is set at player creation time and not per-track
- **Inbound events always set the active track to `showing`** (not `hidden`), because the store's `textTrackFeature` checks `track.mode === 'showing'` to derive `subtitlesShowing`. Using `hidden` would break the subtitle toggle UI.

### Batch mode changes

The store's `toggleSubtitles` iterates all subtitle/caption tracks and sets their mode in a loop. Under single-track semantics, each `showing` assignment disables the previous track — the last one wins. This is acceptable behavior and does not require batching.

## Store Feature Compatibility

The store's `textTrackFeature` will work with the proxy for its primary use cases, with known limitations:

**Works:**
- Track list enumeration (kind, label, language, mode)
- `addtrack` / `removetrack` / `change` events
- `subtitlesShowing` state (via `track.mode === 'showing'`)
- Track selection via mode setter

**Accepted limitations:**
- **Chapter cues** — The store reads `track.cues` on chapter tracks to populate `chaptersCues`. Since `cues` returns `null`, chapter cue data will not be available through the proxy. If avia exposes chapter data through a different mechanism, a separate integration path would be needed.
- **Thumbnail cues** — Same as chapters: `thumbnailCues` will be empty, `thumbnailTrackSrc` will be `null` (no `<track>` elements to query).
- **`<track>` element queries** — `findTrackElement` returns `null` since no native `<track>` elements exist. This is a no-op path and does not cause errors.

## Lifecycle

### Attach

The engine is created asynchronously in `#init`, not during `attach()`. Once `#init` resolves and the engine is ready:

1. Call `AviaTextTrackList.connect(engine)`
2. Subscribe to `texttrackschange`, `texttrackchange`, `texttrackenabledchange` on the engine via `engine.on()`. Use an `AbortController` — register `engine.off()` calls in the abort handler for cleanup (avia uses `on()`/`off()`, not DOM `addEventListener` with signal support).
3. Read `engine.textTracks` to populate the initial list

### Detach / Destroy

1. Abort the `AbortController` (unsubscribes all engine listeners)
2. Clear the engine reference
3. Clear all `AviaTextTrack` instances from the list (fire `removetrack` for each)
4. Reset internal state

### Engine readiness

The list starts empty and populates reactively when avia fires `texttrackschange`. The store's `textTrackFeature` already handles this — it listens for `addtrack` events, so asynchronous track availability works without special handling.

## File Structure

### New files

| File | Contents |
|---|---|
| `packages/core/src/dom/media/avia/text-track.ts` | `AviaTextTrack` class |
| `packages/core/src/dom/media/avia/text-track-list.ts` | `AviaTextTrackList` class |

### Modified files

| File | Change |
|---|---|
| `packages/core/src/dom/media/avia/index.ts` | Remove empty `TextTrackListImpl` stub. Instantiate `AviaTextTrackList` in `AviaMediaDelegateBase`. Wire engine reference on attach/detach. |

### Test files

| File | Coverage |
|---|---|
| `packages/core/src/dom/media/avia/tests/text-track.test.ts` | Mode getter/setter, readonly properties, no-op cue methods |
| `packages/core/src/dom/media/avia/tests/text-track-list.test.ts` | Indexed access, `length`, `getTrackById`, event dispatching, legacy `on*` handlers, inbound avia event handling, outbound mode sync, loop guard, diffing logic |

Tests mock the avia `VideoPlayerInterface` — specifically `textTracks`, `textTrack` setter, `textTrackEnabled` setter, and event subscription.
