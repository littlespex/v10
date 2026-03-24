import type { TextTrackInterface, VideoPlayerInterface } from '@cbsinteractive/avia-js';

import { AviaTextTrack } from './text-track';

export class AviaTextTrackList extends EventTarget implements TextTrackList {
  #tracks: AviaTextTrack[] = [];
  #engine: VideoPlayerInterface | null = null;
  #syncing = false;
  #activeTrackId: string | null = null;

  // Legacy event handler properties
  onaddtrack: ((this: TextTrackList, ev: TrackEvent) => void) | null = null;
  onremovetrack: ((this: TextTrackList, ev: TrackEvent) => void) | null = null;
  onchange: ((this: TextTrackList, ev: Event) => void) | null = null;

  constructor() {
    super();

    // Return a Proxy to support indexed access (list[0], list[1], etc.)
    // Use `target` (not `receiver`) as the third arg to Reflect.get so that
    // `this` inside getters/methods resolves to the real instance, which is
    // required for private-field access.
    // biome-ignore lint/correctness/noConstructorReturn: Proxy wrapping requires returning from constructor
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.#tracks[Number(prop)];
        }

        const value = Reflect.get(target, prop, target);

        if (typeof value === 'function') {
          return value.bind(target);
        }

        return value;
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
    enabled: boolean
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
    } else if (!isEnabling && this.#engine) {
      const isActive = this.#activeTrackId === track.id;

      if (isActive) {
        this.#activeTrackId = null;
        this.#engine.textTrackEnabled = false;
      }
    }

    this.#dispatchChange();
  }

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
    // TrackEvent may not exist in all environments (e.g., jsdom), so fall back
    // to a plain Event with a `track` property attached.
    let event: TrackEvent;

    if (typeof TrackEvent !== 'undefined') {
      event = new TrackEvent(type, { track });
    } else {
      const fallback = new Event(type) as TrackEvent;
      (fallback as { track: TextTrack | null }).track = track;
      event = fallback;
    }

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
