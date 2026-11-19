/**
 * Deterministic text steganography engine supporting:
 * 1. Distributed Zero-Width Characters (2-bit ZWC spread evenly across cover text)
 * 2. Mark Letters (single ZWSP \u200B placed after matching letters in cover text)
 * 3. Unicode Homoglyphs (0 = ASCII, 1 = Cyrillic/Greek lookalike)
 */

export const ZWC_BITS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
export const ZWC_DELIMITER = '\u2060';
export const ZWC_MARK = '\u200B';

export const INVISIBLE_CHAR_META = {
  '\u200B': { code: 'U+200B', tag: 'ZWSP', name: 'Zero Width Space', bits: '00' },
  '\u200C': { code: 'U+200C', tag: 'ZWNJ', name: 'Zero Width Non-Joiner', bits: '01' },
  '\u200D': { code: 'U+200D', tag: 'ZWJ', name: 'Zero Width Joiner', bits: '10' },
  '\uFEFF': { code: 'U+FEFF', tag: 'ZWNBSP', name: 'Zero Width No-Break Space', bits: '11' },
  '\u2060': { code: 'U+2060', tag: 'WJ', name: 'Word Joiner (Delimiter)', bits: null },
  '\u00AD': { code: 'U+00AD', tag: 'SHY', name: 'Soft Hyphen', bits: null },
  '\u200E': { code: 'U+200E', tag: 'LRM', name: 'Left-to-Right Mark', bits: null },
  '\u200F': { code: 'U+200F', tag: 'RLM', name: 'Right-to-Left Mark', bits: null },
};

const CHAR_TO_PAIR = {
  '\u200B': 0,
  '\u200C': 1,
  '\u200D': 2,
  '\uFEFF': 3,
};

// ASCII -> visually identical Cyrillic lookalike
export const HOMOGLYPH_MAP = {
  a: 'а', c: 'с', e: 'е', i: 'і', j: 'ј', o: 'о', p: 'р', s: 'ѕ', x: 'х', y: 'у',
  A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', I: 'І', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У',
};

export const REVERSE_HOMOGLYPH = Object.fromEntries(
  Object.entries(HOMOGLYPH_MAP).map(([ascii, homo]) => [homo, ascii])
);

/**
 * Encode secretMessage into coverText using the selected technique.
 * @param {string} coverText
 * @param {string} secretMessage
 * @param {'distributed'|'mark'|'homoglyph'} mode
 */
export function encodeTextStego(coverText, secretMessage, mode = 'distributed') {
  const cover = coverText ?? '';
  const secret = secretMessage ?? '';

  if (!secret) {
    return {
      output: cover,
      hiddenCount: 0,
      note: 'Enter a hidden message to encode.',
      warning: false,
    };
  }

  if (mode === 'mark') {
    return encodeMarkLetters(cover, secret);
  }
  if (mode === 'homoglyph') {
    return encodeHomoglyphs(cover, secret);
  }
  return encodeDistributedZwc(cover, secret);
}

function encodeDistributedZwc(cover, secret) {
  const bytes = new TextEncoder().encode(secret);
  const zwcChars = [ZWC_DELIMITER];

  for (const byte of bytes) {
    zwcChars.push(
      ZWC_BITS[(byte >> 6) & 0b11],
      ZWC_BITS[(byte >> 4) & 0b11],
      ZWC_BITS[(byte >> 2) & 0b11],
      ZWC_BITS[byte & 0b11]
    );
  }
  zwcChars.push(ZWC_DELIMITER);

  if (!cover || cover.length < 2) {
    return {
      output: cover + zwcChars.join(''),
      hiddenCount: zwcChars.length,
      note: `Embedded ${zwcChars.length} invisible characters.`,
      warning: false,
    };
  }

  // Prefer distributing across word spaces if there are enough; otherwise across all internal char gaps
  const spaceIndices = [];
  for (let i = 0; i < cover.length; i++) {
    if (cover[i] === ' ') spaceIndices.push(i);
  }

  const slots =
    spaceIndices.length >= Math.min(zwcChars.length, 6)
      ? spaceIndices
      : Array.from({ length: cover.length - 1 }, (_, i) => i + 1);

  const buckets = new Map();
  zwcChars.forEach((ch, idx) => {
    const slotIdx = Math.floor((idx * slots.length) / zwcChars.length);
    const pos = slots[Math.min(slotIdx, slots.length - 1)];
    buckets.set(pos, (buckets.get(pos) || '') + ch);
  });

  let output = '';
  for (let i = 0; i < cover.length; i++) {
    if (buckets.has(i)) output += buckets.get(i);
    output += cover[i];
  }
  if (buckets.has(cover.length)) output += buckets.get(cover.length);

  return {
    output,
    hiddenCount: zwcChars.length,
    note: `Distributed ${zwcChars.length} invisible characters evenly across ${slots.length} positions.`,
    warning: false,
  };
}

function encodeMarkLetters(cover, secret) {
  let cursor = 0;
  let output = '';
  let marked = 0;
  const missing = [];

  for (const target of secret) {
    const lowerTarget = target.toLowerCase();
    let foundIdx = -1;
    for (let i = cursor; i < cover.length; i++) {
      if (cover[i].toLowerCase() === lowerTarget) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx === -1) {
      missing.push(target === ' ' ? 'space' : target);
    } else {
      output += cover.slice(cursor, foundIdx + 1) + ZWC_MARK;
      cursor = foundIdx + 1;
      marked++;
    }
  }
  output += cover.slice(cursor);

  if (missing.length > 0) {
    return {
      output,
      hiddenCount: marked,
      note: `Cover text ran out of matching letters for: ${missing.join(', ')}`,
      warning: true,
    };
  }

  return {
    output,
    hiddenCount: marked,
    note: `Marked ${marked} visible letters in order with [ZWSP].`,
    warning: false,
  };
}

function encodeHomoglyphs(cover, secret) {
  const bytes = new TextEncoder().encode(secret);
  const bits = [];
  for (const byte of bytes) {
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }
  // 8 zero bits as terminator
  for (let b = 0; b < 8; b++) bits.push(0);

  const slots = [];
  for (let i = 0; i < cover.length; i++) {
    if (cover[i] in HOMOGLYPH_MAP) {
      slots.push(i);
    }
  }

  const maxChars = Math.floor(Math.max(0, slots.length - 8) / 8);
  if (slots.length < bits.length) {
    return {
      output: cover,
      hiddenCount: 0,
      note: `Need ${bits.length} homoglyph-capable letters in cover text, but only ${slots.length} found (max ~${maxChars} chars).`,
      warning: true,
    };
  }

  const chars = [...cover];
  let swapped = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === 1) {
      const pos = slots[i];
      chars[pos] = HOMOGLYPH_MAP[chars[pos]];
      swapped++;
    }
  }

  return {
    output: chars.join(''),
    hiddenCount: swapped,
    note: `Encoded ${bytes.length} bytes (${swapped} homoglyph swaps) across ${bits.length} lookalike letters.`,
    warning: false,
  };
}

/**
 * Inspect text for invisible characters and homoglyphs, and decode any payload.
 */
export function inspectAndDecodeTextStego(inputText) {
  const text = inputText ?? '';
  const segments = [];
  let totalMarkers = 0;
  let hasHomoglyphs = false;
  let hasDelimiter = false;

  for (const ch of text) {
    const meta = INVISIBLE_CHAR_META[ch];
    if (meta) {
      totalMarkers++;
      if (ch === ZWC_DELIMITER) hasDelimiter = true;
      segments.push({ type: 'invisible', char: ch, meta });
    } else if (ch in REVERSE_HOMOGLYPH) {
      totalMarkers++;
      hasHomoglyphs = true;
      segments.push({
        type: 'homoglyph',
        char: ch,
        ascii: REVERSE_HOMOGLYPH[ch],
      });
    } else {
      const last = segments[segments.length - 1];
      if (last && last.type === 'text') {
        last.value += ch;
      } else {
        segments.push({ type: 'text', value: ch });
      }
    }
  }

  let decoded;
  if (hasHomoglyphs && !hasDelimiter) {
    decoded = extractHomoglyphPayload(text);
  } else if (!hasDelimiter && hasOnlyMarkZwsp(text)) {
    decoded = extractMarkedLetters(text);
  } else {
    decoded = extractZwcPayload(text);
  }

  return {
    segments,
    totalMarkers,
    decodedText: decoded.text,
    status: decoded.status,
    mode: decoded.mode,
    rows: decoded.rows,
  };
}

function hasOnlyMarkZwsp(text) {
  let sawZwsp = false;
  for (const ch of text) {
    if (ch === ZWC_MARK) {
      sawZwsp = true;
    } else if (ch in CHAR_TO_PAIR) {
      return false;
    }
  }
  return sawZwsp;
}

function extractMarkedLetters(text) {
  const chars = [...text];
  const rows = [];
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === ZWC_MARK && i > 0) {
      const prev = chars[i - 1];
      out += prev;
      rows.push({
        kind: 'mark',
        tags: ['ZWSP'],
        markedChar: prev,
        char: prev,
      });
    }
  }

  if (rows.length === 0) {
    return { text: '', status: 'none', mode: 'mark', rows: [] };
  }

  return { text: out, status: 'ok', mode: 'mark', rows };
}

function extractHomoglyphPayload(text) {
  const slots = [];
  for (const ch of text) {
    if (ch in HOMOGLYPH_MAP) {
      slots.push({ bit: 0, display: ch, swapped: false });
    } else if (ch in REVERSE_HOMOGLYPH) {
      slots.push({ bit: 1, display: ch, ascii: REVERSE_HOMOGLYPH[ch], swapped: true });
    }
  }

  const byteRecords = [];
  const rawBytes = [];
  for (let i = 0; i + 7 < slots.length; i += 8) {
    const slice = slots.slice(i, i + 8);
    let val = 0;
    for (const s of slice) {
      val = (val << 1) | s.bit;
    }
    if (val === 0) break;
    rawBytes.push(val);
    byteRecords.push({
      bits: slice.map((s) => s.bit).join(''),
      byte: val,
      letters: slice.map((s) => s.display).join(''),
    });
  }

  if (rawBytes.length === 0) {
    return { text: '', status: 'none', mode: 'homoglyph', rows: [] };
  }

  try {
    const textOut = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(rawBytes));
    const encoder = new TextEncoder();
    const rows = [];
    let offset = 0;
    for (const ch of textOut) {
      const len = encoder.encode(ch).length;
      const slice = byteRecords.slice(offset, offset + len);
      offset += len;
      rows.push({
        kind: 'homoglyph',
        bits: slice.map((r) => r.bits).join(' '),
        bytes: slice.map((r) => r.byte),
        letters: slice.map((r) => r.letters).join(' '),
        char: ch,
      });
    }
    return { text: textOut, status: 'ok', mode: 'homoglyph', rows };
  } catch {
    return { text: '', status: 'invalid', mode: 'homoglyph', rows: [] };
  }
}

function extractZwcPayload(text) {
  const start = text.indexOf(ZWC_DELIMITER);
  const end = start !== -1 ? text.lastIndexOf(ZWC_DELIMITER) : -1;

  let rawBitsChars = '';
  const slice = start !== -1 && end > start ? text.slice(start + 1, end) : text;
  for (const ch of slice) {
    if (ch in CHAR_TO_PAIR) rawBitsChars += ch;
  }

  if (rawBitsChars.length === 0) {
    return { text: '', status: 'none', mode: 'zwc', rows: [] };
  }
  if (rawBitsChars.length % 4 !== 0) {
    return { text: '', status: 'partial', mode: 'zwc', rows: [] };
  }

  const bytes = new Uint8Array(rawBitsChars.length / 4);
  const byteRecords = [];
  for (let i = 0; i < bytes.length; i++) {
    const chunk = rawBitsChars.slice(i * 4, i * 4 + 4);
    const b0 = CHAR_TO_PAIR[chunk[0]];
    const b1 = CHAR_TO_PAIR[chunk[1]];
    const b2 = CHAR_TO_PAIR[chunk[2]];
    const b3 = CHAR_TO_PAIR[chunk[3]];
    bytes[i] = (b0 << 6) | (b1 << 4) | (b2 << 2) | b3;
    byteRecords.push({
      tags: [...chunk].map((c) => INVISIBLE_CHAR_META[c].tag),
      bitGroups: [...chunk].map((c) => INVISIBLE_CHAR_META[c].bits),
      byte: bytes[i],
    });
  }

  try {
    const textOut = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const encoder = new TextEncoder();
    const rows = [];
    let offset = 0;
    for (const ch of textOut) {
      const len = encoder.encode(ch).length;
      const s = byteRecords.slice(offset, offset + len);
      offset += len;
      rows.push({
        kind: 'zwc',
        tags: s.flatMap((r) => r.tags),
        bitGroups: s.flatMap((r) => r.bitGroups),
        bytes: s.map((r) => r.byte),
        char: ch,
      });
    }
    return { text: textOut, status: 'ok', mode: 'zwc', rows };
  } catch {
    return { text: '', status: 'invalid', mode: 'zwc', rows: [] };
  }
}
