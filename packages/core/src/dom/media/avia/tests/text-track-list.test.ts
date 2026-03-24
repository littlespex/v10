import {
  TextTrackKind as AviaTextTrackKind,
  type TextTrackInterface,
  type VideoPlayerInterface,
} from '@cbsinteractive/avia-js';
import { describe, expect, it, vi } from 'vitest';

import { AviaTextTrack } from '../text-track';
import { AviaTextTrackList } from '../text-track-list';

function createMockAviaTrack(overrides: Partial<TextTrackInterface> = {}): TextTrackInterface {
  return {
    id: 'track-1',
    language: 'en',
    kind: AviaTextTrackKind.SUBTITLES,
    ...overrides,
  };
}

function createMockEngine(tracks: TextTrackInterface[] = []) {
  return {
    textTrack: null as TextTrackInterface | null,
    textTrackEnabled: false,
    textTracks: tracks,
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as VideoPlayerInterface;
}

describe('AviaTextTrackList', () => {
  describe('collection interface', () => {
    it('starts with length 0', () => {
      const list = new AviaTextTrackList();

      expect(list.length).toBe(0);
    });

    it('supports indexed access after adding tracks', () => {
      const list = new AviaTextTrackList();
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
      list.syncTracks(
        [createMockAviaTrack({ id: 'sub-en' }), createMockAviaTrack({ id: 'sub-fr', language: 'fr' })],
        null,
        false
      );

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
      list.syncTracks([createMockAviaTrack({ id: 'a' }), createMockAviaTrack({ id: 'b' })], null, false);

      const ids = [];
      for (const track of list) {
        ids.push(track.id);
      }

      expect(ids).toEqual(['a', 'b']);
    });

    it('works with Array.from', () => {
      const list = new AviaTextTrackList();
      list.syncTracks([createMockAviaTrack({ id: 'a' }), createMockAviaTrack({ id: 'b' })], null, false);

      const arr = Array.from(list);

      expect(arr).toHaveLength(2);
      expect(arr[0].id).toBe('a');
    });
  });

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

      expect(list[0].mode).toBe('showing');
      expect(list[1].mode).toBe('disabled');

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

      list.syncTracks([aviaTrack], aviaTrack, true);

      expect(engine.textTrack).toBeNull();
    });
  });
});
