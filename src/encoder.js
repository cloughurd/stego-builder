/**
 * Deterministic semagram encoder for Morse and Alphabetic (A1Z26)
 * across Size and Spacing (Position) channels.
 */

export const MORSE_TABLE = {
  A: '.-',    B: '-...',  C: '-.-.',  D: '-..',   E: '.',
  F: '..-.',  G: '--.',   H: '....',  I: '..',    J: '.---',
  K: '-.-',   L: '.-..',  M: '--',    N: '-.',    O: '---',
  P: '.--.',  Q: '--.-',  R: '.-.',   S: '...',   T: '-',
  U: '..-',   V: '...-',  W: '.--',   X: '-..-',  Y: '-.--',
  Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
};

/**
 * Sanitize input message for the selected cipher.
 */
export function sanitizeMessage(raw, cipher) {
  const upper = (raw || '').toUpperCase();
  if (cipher === 'morse') {
    return upper
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // Alphabetic (A1Z26)
  return upper
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute deterministic carrier items with normalized x positions [0..1]
 * and normalized size ratios [0..1], plus metadata for the UI and overlay.
 *
 * @param {Object} options
 * @param {string} options.message
 * @param {'morse'|'alphabetic'} options.cipher
 * @param {'size'|'position'} options.channel
 * @param {number} options.subtlety - 0 (obvious) to 1 (subtle)
 */
export function encodeMessage({ message, cipher, channel, subtlety = 0.35 }) {
  const clean = sanitizeMessage(message, cipher);
  if (!clean) {
    return {
      cleanMessage: '',
      items: [],
      tokens: [],
      summary: 'Enter a short message (A–Z) to encode.',
      note: '',
    };
  }

  if (cipher === 'morse' && channel === 'size') {
    return encodeMorseSize(clean, subtlety);
  }
  if (cipher === 'morse' && channel === 'position') {
    return encodeMorseSpacing(clean, subtlety);
  }
  if (cipher === 'alphabetic' && channel === 'size') {
    return encodeAlphabeticSize(clean, subtlety);
  }
  return encodeAlphabeticSpacing(clean, subtlety);
}

function encodeMorseSize(clean, subtlety) {
  const tokens = [];
  const rawUnits = [];
  let cursor = 0;

  const symbolStep = 1.0;
  const letterGap = 2.1;
  const wordGap = 3.8;

  const words = clean.split(' ');
  words.forEach((word, wIdx) => {
    for (let cIdx = 0; cIdx < word.length; cIdx++) {
      const ch = word[cIdx];
      const code = MORSE_TABLE[ch];
      if (!code) continue;

      tokens.push({ char: ch, code });

      for (let sIdx = 0; sIdx < code.length; sIdx++) {
        const sym = code[sIdx];
        rawUnits.push({
          xUnit: cursor,
          sizeRatio: sym === '-' ? 1 : 0,
          label: sym,
          char: ch,
          isAnchor: false,
          symbolIndex: sIdx,
        });
        if (sIdx < code.length - 1) {
          cursor += symbolStep;
        }
      }

      if (cIdx < word.length - 1) {
        cursor += letterGap;
      }
    }
    if (wIdx < words.length - 1) {
      cursor += wordGap;
    }
  });

  const items = normalizePositions(rawUnits, cursor);
  const scaleContrast = 1 - subtlety * 0.45; // 1.0 down to 0.55

  return {
    cleanMessage: clean,
    items: items.map((it) => ({
      ...it,
      // Keep sizeRatio 0 or 1 in metadata, renderer applies contrast
      contrast: scaleContrast,
    })),
    tokens,
    summary: tokens.map((t) => `${t.char} (${t.code})`).join(' · '),
    note: 'Small = dot (·), Large = dash (−). Wider gaps separate letters and words.',
  };
}

function encodeMorseSpacing(clean, subtlety) {
  const tokens = [];
  const rawUnits = [];
  let cursor = 0;

  // Dot vs dash gap contrast scales with subtlety
  const dotGap = 1.0;
  const dashGap = 2.8 - subtlety * 0.9; // 2.8 down to 1.9
  const letterGap = dashGap * 1.85;
  const wordGap = dashGap * 3.0;

  const words = clean.split(' ');
  words.forEach((word, wIdx) => {
    for (let cIdx = 0; cIdx < word.length; cIdx++) {
      const ch = word[cIdx];
      const code = MORSE_TABLE[ch];
      if (!code) continue;

      tokens.push({ char: ch, code });

      // Anchor element starts each letter cluster so every symbol is a gap
      rawUnits.push({
        xUnit: cursor,
        sizeRatio: 0.5,
        label: `${ch} start`,
        char: ch,
        isAnchor: true,
      });

      for (let sIdx = 0; sIdx < code.length; sIdx++) {
        const sym = code[sIdx];
        const gap = sym === '-' ? dashGap : dotGap;
        cursor += gap;
        rawUnits.push({
          xUnit: cursor,
          sizeRatio: 0.5,
          label: sym,
          char: ch,
          isAnchor: false,
          gapUnits: Number(gap.toFixed(2)),
        });
      }

      if (cIdx < word.length - 1) {
        cursor += letterGap;
      }
    }
    if (wIdx < words.length - 1) {
      cursor += wordGap;
    }
  });

  const items = normalizePositions(rawUnits, cursor);

  return {
    cleanMessage: clean,
    items,
    tokens,
    summary: tokens.map((t) => `${t.char} (${t.code})`).join(' · '),
    note: 'Each letter starts with an anchor element; short gap = dot (·), wide gap = dash (−).',
  };
}

function encodeAlphabeticSize(clean, subtlety) {
  const tokens = [];
  const rawUnits = [];
  let cursor = 0;

  const letterStep = 1.0;
  const wordGap = 2.2;

  const words = clean.split(' ');
  words.forEach((word, wIdx) => {
    for (let cIdx = 0; cIdx < word.length; cIdx++) {
      const ch = word[cIdx];
      const index = ch.charCodeAt(0) - 64; // A=1..Z=26
      if (index < 1 || index > 26) continue;

      tokens.push({ char: ch, value: index });
      rawUnits.push({
        xUnit: cursor,
        sizeRatio: (index - 1) / 25,
        label: `${ch}=${index}`,
        char: ch,
        value: index,
        isAnchor: false,
      });

      if (cIdx < word.length - 1) {
        cursor += letterStep;
      }
    }
    if (wIdx < words.length - 1) {
      cursor += wordGap;
    }
  });

  const items = normalizePositions(rawUnits, cursor);
  const scaleContrast = 1 - subtlety * 0.4;

  return {
    cleanMessage: clean,
    items: items.map((it) => ({
      ...it,
      contrast: scaleContrast,
    })),
    tokens,
    summary: tokens.map((t) => `${t.char}=${t.value}`).join(' · '),
    note: 'Element size is quantized into 26 steps (A=1 smallest, Z=26 largest).',
  };
}

function encodeAlphabeticSpacing(clean, subtlety) {
  const lettersOnly = clean.replace(/\s+/g, '');
  if (!lettersOnly) {
    return {
      cleanMessage: '',
      items: [],
      tokens: [],
      summary: 'Enter letters A–Z to encode.',
      note: '',
    };
  }

  const tokens = [];
  const rawUnits = [];
  let cursor = 0;

  // Base gap ensures A=1 doesn't collide with the previous element
  const baseGap = 2.0 + subtlety * 2.5;
  const unitScale = 1.0;

  // Initial anchor element
  rawUnits.push({
    xUnit: 0,
    sizeRatio: 0.5,
    label: 'Anchor',
    char: '',
    isAnchor: true,
  });

  for (let i = 0; i < lettersOnly.length; i++) {
    const ch = lettersOnly[i];
    const index = ch.charCodeAt(0) - 64; // A=1..Z=26
    if (index < 1 || index > 26) continue;

    tokens.push({ char: ch, value: index });
    cursor += baseGap + index * unitScale;

    rawUnits.push({
      xUnit: cursor,
      sizeRatio: 0.5,
      label: `${ch}=${index}`,
      char: ch,
      value: index,
      gapUnits: index,
      isAnchor: false,
    });
  }

  const items = normalizePositions(rawUnits, cursor);

  return {
    cleanMessage: lettersOnly,
    items,
    tokens,
    summary: tokens.map((t) => `${t.char}=${t.value}`).join(' · '),
    note: 'Starts with 1 anchor element; each horizontal gap = base + (A=1..Z=26) units. Spaces omitted.',
  };
}

function normalizePositions(rawUnits, totalUnits) {
  if (rawUnits.length === 0) return [];
  if (rawUnits.length === 1 || totalUnits === 0) {
    return rawUnits.map((u) => ({ ...u, xNorm: 0.5 }));
  }
  return rawUnits.map((u) => ({
    ...u,
    xNorm: u.xUnit / totalUnits,
  }));
}
