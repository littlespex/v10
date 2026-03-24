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
    this.kind = aviaTrack.kind === AviaTextTrackKind.FORCED ? 'subtitles' : (aviaTrack.kind as string as TextTrackKind);
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
