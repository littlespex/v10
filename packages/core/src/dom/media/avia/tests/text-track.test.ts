import type { TextTrackInterface } from '@cbsinteractive/avia-js';
import { TextTrackKind as AviaTextTrackKind } from '@cbsinteractive/avia-js';
import { describe, expect, it, vi } from 'vitest';
import { AviaTextTrack } from '../text-track';
import type { AviaTextTrackList } from '../text-track-list';

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
      const aviaTrack = createMockAviaTrack({
        id: 'sub-en',
        language: 'en',
        kind: AviaTextTrackKind.SUBTITLES,
        label: 'English',
      });
      const track = new AviaTextTrack(aviaTrack, createMockList());

      expect(track.id).toBe('sub-en');
      expect(track.language).toBe('en');
      expect(track.kind).toBe('subtitles');
      expect(track.label).toBe('English');
    });

    it('defaults label to empty string when undefined', () => {
      const { label: _, ...trackWithoutLabel } = createMockAviaTrack();
      const aviaTrack = trackWithoutLabel as TextTrackInterface;
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
      track.mode = 'disabled';

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
});
