/**
 * SMS segment utilities. The portal does not actually send SMS, but the editor
 * surfaces segment counts so authors understand carrier billing implications.
 *
 * Reference: 3GPP TS 23.038 (GSM-7) vs UCS-2.
 */

// Characters representable in the GSM-7 default alphabet (plus the extension table).
// This is intentionally permissive — anything outside this regex forces UCS-2.
const GSM7_RE =
  /^[\u0000-\u007F@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#%&'()*+,\-./0-9:;<=>?A-Z\[\\\]\^_`a-z{|}~€]*$/;

const GSM7_EXT_CHARS = "^{}\\[~]|€";

export function isUnicode(text: string): boolean {
  return !GSM7_RE.test(text);
}

function gsm7Length(text: string): number {
  let n = 0;
  for (const ch of text) {
    n += GSM7_EXT_CHARS.includes(ch) ? 2 : 1;
  }
  return n;
}

export interface SmsSegmentInfo {
  /** Total displayed characters (not encoded units). */
  length: number;
  /** Encoded character units consumed (GSM-7 with extension table or UCS-2). */
  encodedLength: number;
  /** Number of SMS segments required. */
  segments: number;
  /** Per-segment capacity for the detected encoding. */
  perSegment: number;
  unicode: boolean;
}

export function segmentInfo(text: string): SmsSegmentInfo {
  const unicode = isUnicode(text);
  // For UCS-2 we count code points (each costs 2 bytes; per-segment is in code points).
  const encodedLength = unicode ? Array.from(text).length : gsm7Length(text);
  const length = Array.from(text).length;

  if (encodedLength === 0) {
    return {
      length,
      encodedLength,
      segments: 0,
      perSegment: unicode ? 70 : 160,
      unicode,
    };
  }

  if (unicode) {
    const perSegment = encodedLength <= 70 ? 70 : 67;
    return {
      length,
      encodedLength,
      segments: Math.ceil(encodedLength / perSegment),
      perSegment,
      unicode,
    };
  }

  const perSegment = encodedLength <= 160 ? 160 : 153;
  return {
    length,
    encodedLength,
    segments: Math.ceil(encodedLength / perSegment),
    perSegment,
    unicode,
  };
}
