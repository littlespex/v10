# Avia TextTrack Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a proxy that adapts avia-js's `textTracks` API to the DOM `TextTrackList` interface so the store's `textTrackFeature` works transparently with the avia media delegate.

**Architecture:** Two standalone classes — `AviaTextTrack` (implements `TextTrack`) and `AviaTextTrackList` (implements `TextTrackList`) — bridge avia's single-track-selection model to the DOM's multi-track-mode model. The `AviaTextTrackList` is returned from the delegate's `get textTracks()` getter. Mode changes flow bidirectionally with a loop guard. Avia owns cue rendering; the proxy only exposes track metadata and mode.

**Tech Stack:** TypeScript, Vitest, avia-js `VideoPlayerInterface`

**Spec:** `docs/superpowers/specs/2026-03-23-avia-text-track-proxy-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/core/src/dom/media/avia/text-track.ts` | `AviaTextTrack` class — wraps a single avia `TextTrackInterface` as a DOM `TextTrack` |
| `packages/core/src/dom/media/avia/text-track-list.ts` | `AviaTextTrackList` class — collection of `AviaTextTrack` instances, bridges avia events to DOM `TextTrackList` events |
| `packages/core/src/dom/media/avia/index.ts` | Modified — remove `TextTrackListImpl` stub, wire `AviaTextTrackList` into `AviaMediaDelegateBase` |
| `packages/core/src/dom/media/avia/tests/text-track.test.ts` | Tests for `AviaTextTrack` |
| `packages/core/src/dom/media/avia/tests/text-track-list.test.ts` | Tests for `AviaTextTrackList` |

---

## Task 1: AviaTextTrack — Core Properties

**Files:**
- Create: `packages/core/src/dom/media/avia/tests/text-track.test.ts`
- Create: `packages/core/src/dom/media/avia/text-track.ts`

- [ ] **Step 1: Write failing tests for AviaTextTrack construction and readonly properties**

```ts
// packages/core/src/dom/media/avia/tests/text-track.test.ts
import { describe, expect, it } from 'vitest';

import { AviaTextTrack } from '../text-track';
import type { AviaTextTrackList } from '../text-track-list';

import type { TextTrackInterface } from '@cbsinteractive/avia-js';
import { TextTrackKind as AviaTextTrackKind } from '@cbsinteractive/avia-js';

function createMockAviaTrack(overrides: Partial<TextTrackInterface> = {}): TextTrackInterface {
  return {
    id: 'track-1',
    language: 'en',
    kind: AviaTextTrackKind.SUBTITLES,
    ...overrides,
  };
}

function createMockList(): AviaTextTrackList {
  return { handleModeChange: () => {} } as unknown as AviaTextTrackList;
}

describe('AviaTextTrack', () => {
  describe('construction', () => {
    it('exposes readonly properties from avia TextTrackInterface', () => {
      const aviaTrack = createMockAviaTrack({ id: 'sub-en', language: 'en', kind: 'subtitles', label: 'English' });
      const track = new AviaTextTrack(aviaTrack, createMockList());

      expect(track.id).toBe('sub-en');
      expect(track.language).toBe('en');
      expect(track.kind).toBe('subtitles');
      expect(track.label).toBe('English');
    });

    it('defaults label to empty string when undefined', () => {
      const aviaTrack = createMockAviaTrack({ label: undefined });
      const track = new AviaTextTrack(aviaTrack, createMockList());

      expect(track.label).toBe('');
    });

    it('maps FORCED kind to subtitles', () => {
      const aviaTrack = createMockAviaTrack({ kind: AviaTextTrackKind.FORCED });
      const track = new AviaTextTrack(aviaTrack, createMockList());

      expect(track.kind).toBe('subtitles');
    });

    it('starts with mode disabled', () => {
      const track = new AviaTextTrack(createMockAviaTrack(), createMockList());

      expect(track.mode).toBe('disabled');
    });
  });

  describe('cue stubs', () => {
    it('returns null for cues and activeCues', () => {
      const track = new AviaTextTrack(createMockAviaTrack(), createMockList());

      expect(track.cues).toBeNull();
      expect(track.activeCues).toBeNull();
    });

    it('addCue and removeCue are no-ops', () => {
      const track = new AviaTextTrack(createMockAviaTrack(), createMockList());
      const cue = { startTime: 0, endTime: 1 } as VTTCue;

      expect(() => track.addCue(cue)).not.toThrow();
      expect(() => track.removeCue(cue)).not.toThrow();
    });
  });

  describe('DOM stubs', () => {
    it('returns null for sourceBuffer', () => {
      const track = new AviaTextTrack(createMockAviaTrack(), createMockList());

      expect(track.sourceBuffer).toBeNull();
    });

    it('returns empty string for inBandMetadataTrackDispatchType', () => {
      const track = new AviaTextTrack(createMockAviaTrack(), createMockList());

      expect(track.inBandMetadataTrackDispatchType).toBe('');
    });
  });

  describe('EventTarget', () => {
    it('supports addEventListener and removeEventListener', () => {
      const track = new AviaTextTrack(createMockAviaTrack(), createMockList());

      expect(() => {
        const handler = () => {};
        track.addEventListener('cuechange', handler);
        track.removeEventListener('cuechange', handler);
      }).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track.test.ts`
Expected: FAIL — `AviaTextTrack` not found

- [ ] **Step 3: Implement AviaTextTrack**

```ts
// packages/core/src/dom/media/avia/text-track.ts
import { TextTrackKind as AviaTextTrackKind, type TextTrackInterface } from '@cbsinteractive/avia-js';

import type { AviaTextTrackList } from './text-track-list';

export class AviaTextTrack extends EventTarget implements TextTrack {
  readonly #aviaTrack: TextTrackInterface;
  readonly #list: AviaTextTrackList;

  readonly id: string;
  readonly kind: TextTrackKind;
  readonly label: string;
  readonly language: string;

  #mode: TextTrackMode = 'disabled';

  constructor(aviaTrack: TextTrackInterface, list: AviaTextTrackList) {
    super();
    this.#aviaTrack = aviaTrack;
    this.#list = list;
    this.id = aviaTrack.id;
    this.kind = aviaTrack.kind === AviaTextTrackKind.FORCED
      ? 'subtitles'
      : aviaTrack.kind as string as TextTrackKind;
    this.label = aviaTrack.label ?? '';
    this.language = aviaTrack.language;
  }

  get aviaTrack(): TextTrackInterface {
    return this.#aviaTrack;
  }

  get mode(): TextTrackMode {
    return this.#mode;
  }

  set mode(value: TextTrackMode) {
    if (this.#mode === value) return;
    this.#mode = value;
    this.#list.handleModeChange(this, value);
  }

  get cues(): TextTrackCueList | null {
    return null;
  }

  get activeCues(): TextTrackCueList | null {
    return null;
  }

  addCue(_cue: TextTrackCue): void {
    // no-op — avia owns cue rendering
  }

  removeCue(_cue: TextTrackCue): void {
    // no-op — avia owns cue rendering
  }

  get sourceBuffer(): SourceBuffer | null {
    return null;
  }

  get inBandMetadataTrackDispatchType(): string {
    return '';
  }

  get oncuechange(): ((this: TextTrack, ev: Event) => void) | null {
    return null;
  }

  set oncuechange(_handler: ((this: TextTrack, ev: Event) => void) | null) {
    // no-op
  }

  /** @internal — used by AviaTextTrackList to set mode without triggering outbound sync */
  _setModeInternal(value: TextTrackMode): void {
    this.#mode = value;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/dom/media/avia/text-track.ts packages/core/src/dom/media/avia/tests/text-track.test.ts
git commit -m "feat(core): add AviaTextTrack class with DOM TextTrack interface"
```

---

## Task 2: AviaTextTrack — Mode Setter With Outbound Notification

**Files:**
- Modify: `packages/core/src/dom/media/avia/tests/text-track.test.ts`
- (No new implementation needed — mode setter already calls `list.handleModeChange`)

- [ ] **Step 1: Write failing tests for mode setter notifying the list**

Add to the existing test file:

```ts
describe('mode setter', () => {
  it('notifies list on mode change', () => {
    const list = createMockList();
    const spy = vi.fn();
    list.handleModeChange = spy;

    const track = new AviaTextTrack(createMockAviaTrack(), list);
    track.mode = 'showing';

    expect(spy).toHaveBeenCalledWith(track, 'showing');
  });

  it('does not notify list when mode is unchanged', () => {
    const list = createMockList();
    const spy = vi.fn();
    list.handleModeChange = spy;

    const track = new AviaTextTrack(createMockAviaTrack(), list);
    track.mode = 'disabled'; // same as initial

    expect(spy).not.toHaveBeenCalled();
  });

  it('_setModeInternal updates mode without notifying list', () => {
    const list = createMockList();
    const spy = vi.fn();
    list.handleModeChange = spy;

    const track = new AviaTextTrack(createMockAviaTrack(), list);
    track._setModeInternal('showing');

    expect(track.mode).toBe('showing');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

Import `vi` from vitest at the top of the file:
```ts
import { describe, expect, it, vi } from 'vitest';
```

- [ ] **Step 2: Run tests to verify they pass**

These tests should pass immediately since the implementation already handles this.

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dom/media/avia/tests/text-track.test.ts
git commit -m "test(core): add AviaTextTrack mode setter and internal mode tests"
```

---

## Task 3: AviaTextTrackList — Collection Interface

**Files:**
- Create: `packages/core/src/dom/media/avia/tests/text-track-list.test.ts`
- Create: `packages/core/src/dom/media/avia/text-track-list.ts`

- [ ] **Step 1: Write failing tests for collection interface**

```ts
// packages/core/src/dom/media/avia/tests/text-track-list.test.ts
import { describe, expect, it, vi } from 'vitest';

import { AviaTextTrack } from '../text-track';
import { AviaTextTrackList } from '../text-track-list';

import type { TextTrackInterface } from '@cbsinteractive/avia-js';
import { TextTrackKind as AviaTextTrackKind } from '@cbsinteractive/avia-js';

function createMockAviaTrack(overrides: Partial<TextTrackInterface> = {}): TextTrackInterface {
  return {
    id: 'track-1',
    language: 'en',
    kind: AviaTextTrackKind.SUBTITLES,
    ...overrides,
  };
}

describe('AviaTextTrackList', () => {
  describe('collection interface', () => {
    it('starts with length 0', () => {
      const list = new AviaTextTrackList();

      expect(list.length).toBe(0);
    });

    it('supports indexed access after adding tracks', () => {
      const list = new AviaTextTrackList();
      // Simulate inbound sync with one track
      list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

      expect(list.length).toBe(1);
      expect(list[0]).toBeInstanceOf(AviaTextTrack);
      expect(list[0].id).toBe('sub-en');
    });

    it('returns undefined for out-of-bounds index', () => {
      const list = new AviaTextTrackList();

      expect(list[0]).toBeUndefined();
    });

    it('getTrackById returns matching track', () => {
      const list = new AviaTextTrackList();
      list.syncTracks([
        createMockAviaTrack({ id: 'sub-en' }),
        createMockAviaTrack({ id: 'sub-fr', language: 'fr' }),
      ], null, false);

      const track = list.getTrackById('sub-fr');

      expect(track).not.toBeNull();
      expect(track!.language).toBe('fr');
    });

    it('getTrackById returns null for unknown id', () => {
      const list = new AviaTextTrackList();

      expect(list.getTrackById('nonexistent')).toBeNull();
    });

    it('item returns track at index', () => {
      const list = new AviaTextTrackList();
      list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

      expect(list.item(0)).toBeInstanceOf(AviaTextTrack);
      expect(list.item(1)).toBeNull();
    });

    it('is iterable with for...of', () => {
      const list = new AviaTextTrackList();
      list.syncTracks([
        createMockAviaTrack({ id: 'a' }),
        createMockAviaTrack({ id: 'b' }),
      ], null, false);

      const ids = [];
      for (const track of list) {
        ids.push(track.id);
      }

      expect(ids).toEqual(['a', 'b']);
    });

    it('works with Array.from', () => {
      const list = new AviaTextTrackList();
      list.syncTracks([
        createMockAviaTrack({ id: 'a' }),
        createMockAviaTrack({ id: 'b' }),
      ], null, false);

      const arr = Array.from(list);

      expect(arr).toHaveLength(2);
      expect(arr[0].id).toBe('a');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: FAIL — `AviaTextTrackList` not found

- [ ] **Step 3: Implement AviaTextTrackList collection interface**

```ts
// packages/core/src/dom/media/avia/text-track-list.ts
import type { TextTrackInterface, VideoPlayerInterface } from '@cbsinteractive/avia-js';

import { AviaTextTrack } from './text-track';

export class AviaTextTrackList extends EventTarget implements TextTrackList {
  #tracks: AviaTextTrack[] = [];
  #engine: VideoPlayerInterface | null = null;
  #syncing = false;

  // Legacy event handler properties
  onaddtrack: ((this: TextTrackList, ev: TrackEvent) => void) | null = null;
  onremovetrack: ((this: TextTrackList, ev: TrackEvent) => void) | null = null;
  onchange: ((this: TextTrackList, ev: Event) => void) | null = null;

  constructor() {
    super();

    // Return a Proxy to support indexed access (list[0], list[1], etc.)
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.#tracks[Number(prop)];
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }

  get length(): number {
    return this.#tracks.length;
  }

  getTrackById(id: string): TextTrack | null {
    return this.#tracks.find((t) => t.id === id) ?? null;
  }

  item(index: number): TextTrack | null {
    return this.#tracks[index] ?? null;
  }

  [Symbol.iterator](): IterableIterator<AviaTextTrack> {
    return this.#tracks[Symbol.iterator]();
  }

  // Indexed access signature for TextTrackList interface compliance
  [index: number]: TextTrack;

  /**
   * Sync the proxy's track list against a new list of avia tracks.
   * Diffs by `id`. Fires `addtrack`/`removetrack` events as needed.
   */
  syncTracks(
    aviaTracks: readonly TextTrackInterface[],
    activeTrack: TextTrackInterface | null,
    enabled: boolean,
  ): void {
    const prevSyncing = this.#syncing;
    this.#syncing = true;

    const newIds = new Set(aviaTracks.map((t) => t.id));
    const existingIds = new Set(this.#tracks.map((t) => t.id));

    // Remove stale tracks
    const removed = this.#tracks.filter((t) => !newIds.has(t.id));

    for (const track of removed) {
      this.#tracks.splice(this.#tracks.indexOf(track), 1);
      this.#dispatchTrackEvent('removetrack', track);
    }

    // Add new tracks
    for (const aviaTrack of aviaTracks) {
      if (!existingIds.has(aviaTrack.id)) {
        const track = new AviaTextTrack(aviaTrack, this);
        const isActive = activeTrack?.id === aviaTrack.id && enabled;

        if (isActive) {
          this.#activeTrackId = aviaTrack.id;
        }

        track._setModeInternal(isActive ? 'showing' : 'disabled');
        this.#tracks.push(track);
        this.#dispatchTrackEvent('addtrack', track);
      }
    }

    this.#syncing = prevSyncing;
  }

  /** Called by AviaTextTrack when its mode setter is invoked by a consumer. */
  handleModeChange(track: AviaTextTrack, mode: TextTrackMode): void {
    if (this.#syncing) return;

    const isEnabling = mode === 'showing' || mode === 'hidden';

    if (isEnabling && this.#engine) {
      // Set all other tracks to disabled (single-track constraint)
      this.#syncing = true;

      for (const t of this.#tracks) {
        if (t !== track) {
          t._setModeInternal('disabled');
        }
      }

      this.#syncing = false;
      this.#activeTrackId = track.id;

      // Outbound: tell avia which track is selected
      this.#engine.textTrack = track.aviaTrack;
      this.#engine.textTrackEnabled = true;
    }
    else if (!isEnabling && this.#engine) {
      const isActive = this.#activeTrackId === track.id;

      if (isActive) {
        this.#activeTrackId = null;
        this.#engine.textTrackEnabled = false;
      }
    }

    this.#dispatchChange();
  }

  #activeTrackId: string | null = null;

  /** Connect to an avia engine. Called after async engine init. */
  connect(engine: VideoPlayerInterface): void {
    this.disconnect();
    this.#engine = engine;
    // Event subscriptions added in Task 6
  }

  /** Disconnect from the avia engine. */
  disconnect(): void {
    this.#engine = null;
    this.#activeTrackId = null;
  }

  #dispatchTrackEvent(type: 'addtrack' | 'removetrack', track: AviaTextTrack): void {
    const event = new TrackEvent(type, { track });

    this.dispatchEvent(event);

    const handler = type === 'addtrack' ? this.onaddtrack : this.onremovetrack;
    handler?.call(this, event);
  }

  #dispatchChange(): void {
    const event = new Event('change');

    this.dispatchEvent(event);
    this.onchange?.call(this, event);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/dom/media/avia/text-track-list.ts packages/core/src/dom/media/avia/tests/text-track-list.test.ts
git commit -m "feat(core): add AviaTextTrackList with collection interface"
```

---

## Task 4: AviaTextTrackList — Event Dispatching and Legacy Handlers

**Files:**
- Modify: `packages/core/src/dom/media/avia/tests/text-track-list.test.ts`

- [ ] **Step 1: Write tests for event dispatching**

Add to the existing test file:

```ts
describe('events', () => {
  it('fires addtrack event with TrackEvent when tracks are added', () => {
    const list = new AviaTextTrackList();
    const handler = vi.fn();
    list.addEventListener('addtrack', handler);

    list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as TrackEvent;
    expect(event.type).toBe('addtrack');
    expect(event.track).toBeInstanceOf(AviaTextTrack);
  });

  it('fires removetrack event when tracks are removed', () => {
    const list = new AviaTextTrackList();
    list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

    const handler = vi.fn();
    list.addEventListener('removetrack', handler);

    list.syncTracks([], null, false);

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as TrackEvent;
    expect(event.type).toBe('removetrack');
  });

  it('fires change event when track mode changes', () => {
    const list = new AviaTextTrackList();
    list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

    const handler = vi.fn();
    list.addEventListener('change', handler);

    list[0].mode = 'showing';

    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls legacy onaddtrack handler', () => {
    const list = new AviaTextTrackList();
    const handler = vi.fn();
    list.onaddtrack = handler;

    list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls legacy onremovetrack handler', () => {
    const list = new AviaTextTrackList();
    list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

    const handler = vi.fn();
    list.onremovetrack = handler;

    list.syncTracks([], null, false);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls legacy onchange handler', () => {
    const list = new AviaTextTrackList();
    list.syncTracks([createMockAviaTrack({ id: 'sub-en' })], null, false);

    const handler = vi.fn();
    list.onchange = handler;

    list[0].mode = 'showing';

    expect(handler).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

These tests should pass with the existing implementation.

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dom/media/avia/tests/text-track-list.test.ts
git commit -m "test(core): add AviaTextTrackList event dispatching tests"
```

---

## Task 5: AviaTextTrackList — Outbound Mode Sync and Loop Guard

**Files:**
- Modify: `packages/core/src/dom/media/avia/tests/text-track-list.test.ts`

- [ ] **Step 1: Write tests for outbound sync and loop guard**

Add to the existing test file. These tests need a mock engine:

```ts
function createMockEngine(tracks: ReturnType<typeof createMockAviaTrack>[] = []) {
  return {
    textTrack: null as ReturnType<typeof createMockAviaTrack> | null,
    textTrackEnabled: false,
    textTracks: tracks,
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as VideoPlayerInterface;
}
```

Import `VideoPlayerInterface` at the top:
```ts
import type { VideoPlayerInterface } from '@cbsinteractive/avia-js';
```

Tests:

```ts
describe('outbound mode sync', () => {
  it('sets engine textTrack and textTrackEnabled when mode set to showing', () => {
    const aviaTrack = createMockAviaTrack({ id: 'sub-en' });
    const engine = createMockEngine([aviaTrack]);
    const list = new AviaTextTrackList();

    list.connect(engine);
    list.syncTracks([aviaTrack], null, false);

    list[0].mode = 'showing';

    expect(engine.textTrack).toBe(aviaTrack);
    expect(engine.textTrackEnabled).toBe(true);
  });

  it('sets engine textTrack and textTrackEnabled when mode set to hidden', () => {
    const aviaTrack = createMockAviaTrack({ id: 'sub-en' });
    const engine = createMockEngine([aviaTrack]);
    const list = new AviaTextTrackList();

    list.connect(engine);
    list.syncTracks([aviaTrack], null, false);

    list[0].mode = 'hidden';

    expect(engine.textTrack).toBe(aviaTrack);
    expect(engine.textTrackEnabled).toBe(true);
  });

  it('disables engine when active track mode set to disabled', () => {
    const aviaTrack = createMockAviaTrack({ id: 'sub-en' });
    const engine = createMockEngine([aviaTrack]);
    engine.textTrack = aviaTrack;
    engine.textTrackEnabled = true;

    const list = new AviaTextTrackList();
    list.connect(engine);
    list.syncTracks([aviaTrack], aviaTrack, true);

    list[0].mode = 'disabled';

    expect(engine.textTrackEnabled).toBe(false);
  });

  it('enforces single-track constraint — disables other tracks when one is set to showing', () => {
    const trackA = createMockAviaTrack({ id: 'a' });
    const trackB = createMockAviaTrack({ id: 'b', language: 'fr' });
    const engine = createMockEngine([trackA, trackB]);

    const list = new AviaTextTrackList();
    list.connect(engine);
    list.syncTracks([trackA, trackB], trackA, true);

    // Track A is showing, track B is disabled
    expect(list[0].mode).toBe('showing');
    expect(list[1].mode).toBe('disabled');

    // Select track B
    list[1].mode = 'showing';

    expect(list[0].mode).toBe('disabled');
    expect(list[1].mode).toBe('showing');
  });
});

describe('loop guard', () => {
  it('does not call engine during syncTracks', () => {
    const aviaTrack = createMockAviaTrack({ id: 'sub-en' });
    const engine = createMockEngine([aviaTrack]);

    const list = new AviaTextTrackList();
    list.connect(engine);

    // syncTracks sets modes internally — should not trigger outbound sync
    list.syncTracks([aviaTrack], aviaTrack, true);

    // textTrack should not have been set by the outbound path
    // (the engine mock started with textTrack = null, and syncTracks should not change it)
    expect(engine.textTrack).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

`connect` and `handleModeChange` are already implemented in Task 3 with `#engine` and `#activeTrackId` support.

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dom/media/avia/text-track-list.ts packages/core/src/dom/media/avia/tests/text-track-list.test.ts
git commit -m "feat(core): add outbound mode sync and loop guard to AviaTextTrackList"
```

---

## Task 6: AviaTextTrackList — Inbound Event Handling

**Files:**
- Modify: `packages/core/src/dom/media/avia/tests/text-track-list.test.ts`
- Modify: `packages/core/src/dom/media/avia/text-track-list.ts`

- [ ] **Step 1: Write tests for inbound avia event handling**

```ts
describe('inbound event handling', () => {
  function connectWithTracks(aviaTracks: ReturnType<typeof createMockAviaTrack>[]) {
    const handlers = new Map<string, Function>();
    const engine = {
      ...createMockEngine(aviaTracks),
      on: vi.fn((type: string, handler: Function) => handlers.set(type, handler)),
      off: vi.fn(),
      textTracks: aviaTracks,
    } as unknown as VideoPlayerInterface;

    const list = new AviaTextTrackList();
    list.connect(engine);

    return { list, engine, fire: (type: string, detail: unknown) => handlers.get(type)?.({ detail }) };
  }

  it('populates tracks on connect from engine.textTracks', () => {
    const { list } = connectWithTracks([
      createMockAviaTrack({ id: 'sub-en' }),
      createMockAviaTrack({ id: 'sub-fr', language: 'fr' }),
    ]);

    expect(list.length).toBe(2);
  });

  it('handles texttrackschange — adds new tracks', () => {
    const { list, fire } = connectWithTracks([createMockAviaTrack({ id: 'sub-en' })]);
    expect(list.length).toBe(1);

    const addHandler = vi.fn();
    list.addEventListener('addtrack', addHandler);

    fire('texttrackschange', {
      textTracks: [
        createMockAviaTrack({ id: 'sub-en' }),
        createMockAviaTrack({ id: 'sub-fr', language: 'fr' }),
      ],
    });

    expect(list.length).toBe(2);
    expect(addHandler).toHaveBeenCalledOnce();
  });

  it('handles texttrackschange — removes stale tracks', () => {
    const { list, fire } = connectWithTracks([
      createMockAviaTrack({ id: 'sub-en' }),
      createMockAviaTrack({ id: 'sub-fr', language: 'fr' }),
    ]);

    const removeHandler = vi.fn();
    list.addEventListener('removetrack', removeHandler);

    fire('texttrackschange', {
      textTracks: [createMockAviaTrack({ id: 'sub-en' })],
    });

    expect(list.length).toBe(1);
    expect(removeHandler).toHaveBeenCalledOnce();
  });

  it('handles texttrackchange — sets active track to showing', () => {
    const trackA = createMockAviaTrack({ id: 'a' });
    const trackB = createMockAviaTrack({ id: 'b', language: 'fr' });
    const { list, fire } = connectWithTracks([trackA, trackB]);

    const changeHandler = vi.fn();
    list.addEventListener('change', changeHandler);

    fire('texttrackchange', { textTrack: trackB });

    expect(list[0].mode).toBe('disabled');
    expect(list[1].mode).toBe('showing');
    expect(changeHandler).toHaveBeenCalled();
  });

  it('handles texttrackenabledchange — disables active track when enabled=false', () => {
    const track = createMockAviaTrack({ id: 'sub-en' });
    const { list, fire } = connectWithTracks([track]);

    // First make track active
    fire('texttrackchange', { textTrack: track });
    expect(list[0].mode).toBe('showing');

    const changeHandler = vi.fn();
    list.addEventListener('change', changeHandler);

    fire('texttrackenabledchange', { textTrackEnabled: false });

    expect(list[0].mode).toBe('disabled');
    expect(changeHandler).toHaveBeenCalled();
  });

  it('does not fire outbound sync during inbound event handling', () => {
    const track = createMockAviaTrack({ id: 'sub-en' });
    const { list, engine, fire } = connectWithTracks([track]);

    // Make it active via inbound event
    fire('texttrackchange', { textTrack: track });

    // Engine's textTrack should NOT have been set by the outbound path
    expect(engine.textTrack).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: FAIL — `connect` doesn't subscribe to events yet

- [ ] **Step 3: Implement inbound event handling in connect/disconnect**

Update `connect` and `disconnect` in `text-track-list.ts`. Import `PlayerEvent`:

```ts
import { PlayerEvent, type TextTrackInterface, type VideoPlayerInterface } from '@cbsinteractive/avia-js';
```

Replace `connect` and `disconnect` (which currently have minimal implementations from Task 3). Add a `#disconnect` field:

```ts
#disconnect: AbortController | null = null;

connect(engine: VideoPlayerInterface): void {
  this.disconnect();
  this.#engine = engine;
  this.#disconnect = new AbortController();

  const onTracksChange = (event: { detail: { textTracks: TextTrackInterface[] } }) => {
    this.syncTracks(event.detail.textTracks, engine.textTrack, engine.textTrackEnabled);
  };

  const onTrackChange = (event: { detail: { textTrack: TextTrackInterface } }) => {
    this.#syncing = true;
    const activeId = event.detail.textTrack.id;
    this.#activeTrackId = activeId;

    for (const track of this.#tracks) {
      track._setModeInternal(track.id === activeId ? 'showing' : 'disabled');
    }

    this.#syncing = false;
    this.#dispatchChange();
  };

  const onEnabledChange = (event: { detail: { textTrackEnabled: boolean } }) => {
    if (!event.detail.textTrackEnabled && this.#activeTrackId) {
      this.#syncing = true;
      const activeTrack = this.#tracks.find((t) => t.id === this.#activeTrackId);
      activeTrack?._setModeInternal('disabled');
      this.#activeTrackId = null;
      this.#syncing = false;
      this.#dispatchChange();
    }
  };

  engine.on(PlayerEvent.TEXT_TRACKS_CHANGE, onTracksChange);
  engine.on(PlayerEvent.TEXT_TRACK_CHANGE, onTrackChange);
  engine.on(PlayerEvent.TEXT_TRACK_ENABLED_CHANGE, onEnabledChange);

  // Cleanup via abort
  this.#disconnect.signal.addEventListener('abort', () => {
    engine.off(PlayerEvent.TEXT_TRACKS_CHANGE, onTracksChange);
    engine.off(PlayerEvent.TEXT_TRACK_CHANGE, onTrackChange);
    engine.off(PlayerEvent.TEXT_TRACK_ENABLED_CHANGE, onEnabledChange);
  });

  // Populate from current engine state
  this.syncTracks(engine.textTracks, engine.textTrack, engine.textTrackEnabled);
}

disconnect(): void {
  this.#disconnect?.abort();
  this.#disconnect = null;

  // Remove all tracks
  this.#syncing = true;
  const tracks = [...this.#tracks];
  this.#tracks.length = 0;

  for (const track of tracks) {
    this.#dispatchTrackEvent('removetrack', track);
  }

  this.#syncing = false;
  this.#engine = null;
  this.#activeTrackId = null;
}
```

`handleModeChange` already uses `#activeTrackId` from Task 3 — no changes needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/dom/media/avia/text-track-list.ts packages/core/src/dom/media/avia/tests/text-track-list.test.ts
git commit -m "feat(core): add inbound avia event handling to AviaTextTrackList"
```

---

## Task 7: AviaTextTrackList — Disconnect and Cleanup

**Files:**
- Modify: `packages/core/src/dom/media/avia/tests/text-track-list.test.ts`

- [ ] **Step 1: Write tests for disconnect behavior**

```ts
describe('disconnect', () => {
  it('removes all tracks and fires removetrack for each', () => {
    const { list, engine } = connectWithTracks([
      createMockAviaTrack({ id: 'a' }),
      createMockAviaTrack({ id: 'b', language: 'fr' }),
    ]);

    const handler = vi.fn();
    list.addEventListener('removetrack', handler);

    list.disconnect();

    expect(list.length).toBe(0);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes from engine events', () => {
    const { list, engine } = connectWithTracks([createMockAviaTrack({ id: 'a' })]);

    list.disconnect();

    expect(engine.off).toHaveBeenCalledTimes(3);
  });

  it('clears engine reference — mode changes become local-only', () => {
    const { list } = connectWithTracks([createMockAviaTrack({ id: 'a' })]);
    list.disconnect();

    // Re-add a track without engine
    list.syncTracks([createMockAviaTrack({ id: 'b' })], null, false);
    // Mode change should not throw even without engine
    expect(() => { list[0].mode = 'showing'; }).not.toThrow();
  });
});
```

Note: Move `connectWithTracks` helper to the top-level of the describe block (or module scope) so it's available to both `inbound event handling` and `disconnect` describe blocks.

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm -F @videojs/core test src/dom/media/avia/tests/text-track-list.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dom/media/avia/tests/text-track-list.test.ts
git commit -m "test(core): add AviaTextTrackList disconnect and cleanup tests"
```

---

## Task 8: Wire Into AviaMediaDelegateBase

**Files:**
- Modify: `packages/core/src/dom/media/avia/index.ts`

- [ ] **Step 1: Update AviaMediaDelegateBase to use AviaTextTrackList**

Replace the `TextTrackListImpl` stub and wire the list into the delegate:

In `packages/core/src/dom/media/avia/index.ts`:

1. Add import: `import { AviaTextTrackList } from './text-track-list';`
2. Replace `#textTracks: TextTrackList = new TextTrackListImpl();` with `#textTracks = new AviaTextTrackList();`
3. In `#init`, after `this.#engine = await createVideoPlayer(...)` and `await this.#applySrc()`, add: `this.#textTracks.connect(this.#engine);`
4. In `detach()`, replace the no-op with `this.#textTracks.disconnect();`
5. In `destroy()`, add `this.#textTracks.disconnect();` before `this.#engine?.destroy();`
6. Remove the `TextTrackListImpl` class at the bottom of the file
7. Remove the TODO comment on line 8 about text tracks
8. Remove the TODO comment on lines 125-126 about text tracks

The `get textTracks()` getter already returns `this.#textTracks` and doesn't need changes.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: No errors related to the avia text track changes

- [ ] **Step 3: Run all avia-related tests**

Run: `pnpm -F @videojs/core test src/dom/media/avia/`
Expected: All PASS

- [ ] **Step 4: Lint**

Run: `pnpm lint:fix:file packages/core/src/dom/media/avia/index.ts packages/core/src/dom/media/avia/text-track.ts packages/core/src/dom/media/avia/text-track-list.ts`
Expected: No errors, or auto-fixable issues resolved

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/dom/media/avia/index.ts
git commit -m "feat(core): wire AviaTextTrackList into AviaMediaDelegateBase"
```

---

## Task 9: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite for @videojs/core**

Run: `pnpm -F @videojs/core test`
Expected: All PASS

- [ ] **Step 2: Build the core package**

Run: `pnpm -F @videojs/core build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Typecheck across repo**

Run: `pnpm typecheck`
Expected: No type errors
