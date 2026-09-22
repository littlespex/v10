import {
  getSvtaErrorCategory,
  getSvtaErrorIndex,
  SVTA_CUSTOM_UNKNOWN,
  SVTA_ERROR_CATEGORY_CUSTOM,
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
} from '@svta/cml-error-codes';
import { describe, expect, it } from 'vite-plus/test';

import { SVTA_UNSUPPORTED_PLAYBACK_FEATURE, svtaCategory, svtaIndex } from '../errors';

describe('SVTA_UNSUPPORTED_PLAYBACK_FEATURE', () => {
  it('sits in the publisher-defined range of the custom category', () => {
    // CML defines only 99000 in the custom category and leaves 99001–99999 to
    // publishers, so the one code SPF owns must stay above the former and
    // within the latter.
    expect(SVTA_UNSUPPORTED_PLAYBACK_FEATURE).toBeGreaterThan(SVTA_CUSTOM_UNKNOWN);
    expect(SVTA_UNSUPPORTED_PLAYBACK_FEATURE).toBeLessThanOrEqual(99999);
    expect(getSvtaErrorCategory(SVTA_UNSUPPORTED_PLAYBACK_FEATURE)).toBe(SVTA_ERROR_CATEGORY_CUSTOM);
  });
});

describe('svtaCategory', () => {
  it("is an alias of CML's getSvtaErrorCategory", () => {
    expect(svtaCategory).toBe(getSvtaErrorCategory);
  });

  it('reads the category from a four-digit native code', () => {
    expect(svtaCategory(SVTA_NO_SUPPORTED_VIDEO_TRACK)).toBe(2);
    expect(svtaCategory(SVTA_NO_SUPPORTED_AUDIO_TRACK)).toBe(2);
  });

  it('reads the category from a five-digit external code', () => {
    // "03404" — an HTTP 404 embedded under the network category, per the spec's
    // external-standard form. Numerically 3404, so the same arithmetic applies.
    expect(svtaCategory(3404)).toBe(3);
  });

  it('reads the two-digit custom category without a digit-length special case', () => {
    // The custom category is `99`, which makes its codes five digits wide. No
    // branch is needed: every standard category is below 8000 and custom starts
    // at 99000, so the same division separates them.
    expect(svtaCategory(SVTA_UNSUPPORTED_PLAYBACK_FEATURE)).toBe(99);
    expect(svtaCategory(99000)).toBe(99);
    expect(svtaCategory(99999)).toBe(99);
  });

  it('reports category 0 for the fully-unknown code', () => {
    expect(svtaCategory(999)).toBe(0);
  });
});

describe('svtaIndex', () => {
  it("is an alias of CML's getSvtaErrorIndex", () => {
    expect(svtaIndex).toBe(getSvtaErrorIndex);
  });

  it('reads the index from a four-digit native code', () => {
    expect(svtaIndex(SVTA_NO_SUPPORTED_VIDEO_TRACK)).toBe(11);
    expect(svtaIndex(SVTA_NO_SUPPORTED_AUDIO_TRACK)).toBe(12);
  });

  it('reads the embedded external code from a five-digit code', () => {
    expect(svtaIndex(3404)).toBe(404);
  });

  it('reads the index from a five-digit custom code', () => {
    expect(svtaIndex(SVTA_UNSUPPORTED_PLAYBACK_FEATURE)).toBe(1);
    expect(svtaIndex(99999)).toBe(999);
  });

  it('reads 999 for the fully-unknown code', () => {
    expect(svtaIndex(999)).toBe(999);
  });
});
