import { Autoplay, createVideoPlayer, LogLevel, type VideoPlayerInterface } from '@cbsinteractive/avia-js';
import { cmaf } from '@cbsinteractive/avia-js-cmaf';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomMediaMixin } from '../custom-media-element';
import { MediaProxyMixin } from '../proxy';
import { AviaTextTrackList } from './text-track-list';

export class AviaMediaDelegateBase implements Delegate {
  #engine: VideoPlayerInterface | null = null;
  #src: string = '';
  #textTracks = new AviaTextTrackList();

  // TODO: Attach is called twice, which ends up creating two engines.
  #initializing = false;

  get engine(): VideoPlayerInterface | null {
    return this.#engine;
  }

  // TODO: Are there any other workflow entry points other than `attach`?
  //       We need async initialization for the engine to be ready.
  #init = async (target: HTMLMediaElement) => {
    if (!target.parentElement || this.#initializing) {
      return;
    }

    this.#initializing = true;

    // TODO: How can config properties be passed in?
    this.#engine = await createVideoPlayer({
      logLevel: LogLevel.DEBUG,
      autoplay: Autoplay.ATTEMPT_UNMUTED,
      container: target.parentElement,
      plugins: [
        cmaf({
          debug: true,
        }),
      ],
    });

    await this.#applySrc();

    this.#textTracks.connect(this.#engine);

    this.#initializing = false;
  };

  #applySrc = async () => {
    if (!this.#engine || !this.#src) {
      return;
    }

    await this.#engine?.attachResource({
      location: {
        mediaUrl: this.#src,
      },
    });
  };

  attach(target: EventTarget): void {
    // TODO: Attach is called twice, which ends up creating two engines.
    this.#init(target as HTMLMediaElement);
  }

  detach(): void {
    this.#textTracks.disconnect();
  }

  // TODO: We need async destruction. It is vital to await destroy before creating a new player.
  destroy(): void {
    this.#textTracks.disconnect();
    this.#engine?.destroy();
  }

  // TODO: This is too simplistic for our needs. How do we pass in all the other necessary properties?
  //       (DRM, Ads, etc.)
  set src(src: string) {
    // TODO: Is src always set before attach?
    if (!this.#engine) {
      this.#src = src;
    } else {
      // TODO: This is a setter, so there is no way to await.
      this.#applySrc();
    }
  }

  get src(): string {
    return this.#src;
  }

  // Cannot expose currentTime directly because injected ads should not affect the playback position.
  get currentTime(): number {
    return this.#engine?.contentTime ?? 0;
  }

  // Setting currentTime is a protected operation.
  set currentTime(time: number) {
    // TODO: No way to await this async operation.
    this.#engine?.seek(time);
  }

  // Cannot expose duration directly because injected ads should not affect the playback duration.
  get duration(): number {
    return this.#engine?.contentDuration ?? 0;
  }

  // V10 calls play() on the attached media element. Need to override to call play() on the engine.
  async play(): Promise<void> {
    if (!this.#engine) {
      return;
    }

    await this.#engine.play();
  }

  // V10 calls pause() on the attached media element. Need to override to call pause() on the engine.
  async pause(): Promise<void> {
    if (!this.#engine) {
      return;
    }

    await this.#engine.pause();
  }

  get textTracks(): TextTrackList {
    return this.#textTracks;
  }
}

// This is used by the web component because it needs to extend HTMLElement!
export class AviaCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  AviaMediaDelegateBase
) {}

// This is used by the React component.
export class AviaMedia extends DelegateMixin(MediaProxyMixin, AviaMediaDelegateBase) {}
