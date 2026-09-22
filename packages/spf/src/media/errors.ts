/**
 * SPF's slice of the SVTA 2070 (Standardized Error Codes) vocabulary: the shape of a reported condition, the standard
 * codes SPF reports, and the one code the spec leaves to the publisher.
 *
 * The standard codes come from `@svta/cml-error-codes`, the spec's reference implementation, and are re-exported here
 * so this module is the only place SPF imports CML. Producers and adapters keep importing the vocabulary from here, no
 * code is transcribed from the spec PDF, and a spec revision arrives as a dependency bump rather than an edit. What
 * this module defines itself is what CML deliberately doesn't ship: the reporting envelope ({@link SvtaError}) and a
 * publisher-defined code ({@link SVTA_UNSUPPORTED_PLAYBACK_FEATURE}).
 *
 * Two properties of the spec shape the types here:
 *
 * - **Severity is deliberately not part of a code.** Per §Approach, "impact varies with player implementation, breaking
 *   the consistency of a specific error mapping to single code." So an error carries no fatal flag — whether a
 *   condition is fatal depends on the composition observing it, and is decided downstream.
 * - **Reporting is partial and stacked** (Principles 5–6). Errors are reported as encountered, most of them non-fatal,
 *   and the _sequence_ carries causation a single value can't.
 *
 * See `internal/design/spf/features/errors.md`.
 */
import { getSvtaErrorCategory, getSvtaErrorIndex } from '@svta/cml-error-codes';

/**
 * The standard codes SPF reports, one re-export per code rather than `export *` so this list stays the inventory of
 * what the engine can say. A new producer adds its code here.
 *
 * - `SVTA_UNSUPPORTED_VIDEO_FORMAT` (1004) / `SVTA_UNSUPPORTED_AUDIO_FORMAT` (1005) — a rendition in a container this
 *   engine can't append, reported per rendition as a _cause_.
 * - `SVTA_UNSUPPORTED_DRM_SYSTEM` (4008) — an encrypted rendition with no decryption pipeline. Detection, not a license
 *   failure; also a cause.
 * - `SVTA_NO_SUPPORTED_VIDEO_TRACK` (2011) / `SVTA_NO_SUPPORTED_AUDIO_TRACK` (2012) — the _verdict_: a type has nothing
 *   playable, whether every rendition was excluded or the source carried none and the composition said it needs the
 *   type. One code for both, because they are the same answer to a viewer.
 */
export {
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
} from '@svta/cml-error-codes';

/**
 * A reported condition, identified by its SVTA code.
 *
 * Named for the spec rather than the engine because the vocabulary is format- and player-neutral. Not `MediaError` —
 * that name belongs to the `@videojs/media` DOM-facing class this eventually maps _onto_, and the mapping is the point
 * at which severity and user-facing text get decided.
 */
export interface SvtaError {
  /**
   * The SVTA code — see {@link svtaCategory} / {@link svtaIndex}.
   *
   * `number` rather than CML's `SvtaErrorCode` union: that union names only the enumerated codes, and spec-valid codes
   * exist outside it — publisher-defined ones like {@link SVTA_UNSUPPORTED_PLAYBACK_FEATURE}, and embedded HTTP
   * statuses the catalog doesn't enumerate.
   */
  code: number;
  /** Engineer-facing detail. Optional; the code is the identity. */
  message?: string;
  /** Reporter-specific context (track type, url, the constraint that fired). */
  data?: unknown;
}

/**
 * SVTA 99 [Custom] 001 — this engine has no pipeline for something the source requires, so the source is unplayable
 * _here_ rather than broken.
 *
 * Custom rather than standard because the standard codes available describe either narrower or wider things. The causes
 * (1004/1005 unsupported format, 4008 unsupported DRM) say what one rendition hit; the verdicts (2011/2012 no supported
 * track) say a type emptied without saying why it's unfixable. And 2039 "Manifest feature unsupported" covers features
 * that are unsupported but still _playable_ — LL-HLS degrading to standard live is a 2039 — so overloading it for a
 * fatal condition would make it useless for the notices it belongs on.
 *
 * Index `001`: the spec defines only `99000` (Unknown) for the custom category and leaves `99001`–`99999` to the
 * publisher, which is why CML exports nothing for it and SPF defines it here. The first code we define.
 *
 * Five digits, and deliberately not special-cased anywhere: {@link svtaCategory} and {@link svtaIndex} decompose it
 * correctly by arithmetic alone, because every standard category is below `8000` and custom starts at `99000`.
 */
export const SVTA_UNSUPPORTED_PLAYBACK_FEATURE = 99001;

/**
 * The error's domain — `code / 1000`, per the spec's "divide by one thousand to obtain the error category". Works
 * uniformly across the four-digit native form and the five-digit form embedding an external standard: `"03404"` is
 * numerically 3404, which decomposes identically.
 *
 * An alias of CML's {@link getSvtaErrorCategory}, kept so the `@videojs/spf/hls` entry's surface stays stable. Unlike
 * the bare arithmetic it replaced, it answers `undefined` for a code the spec assigns no category to: a non-integer, a
 * negative, or one in the reserved `8`–`98` range.
 */
export const svtaCategory = getSvtaErrorCategory;

/**
 * The specific error within its category — `code % 1000`. For a five-digit code this is the embedded external value (an
 * HTTP status, a VAST code).
 *
 * An alias of CML's {@link getSvtaErrorIndex}; `undefined` for anything but a non-negative integer.
 */
export const svtaIndex = getSvtaErrorIndex;
