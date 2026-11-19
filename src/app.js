import { encodeMessage } from './encoder.js';
import { renderScene } from './renderer.js';
import { downloadPNG, downloadSVG } from './exporter.js';
import { encodeTextStego, inspectAndDecodeTextStego } from './zwc.js';

const state = {
  message: 'SOS',
  cipher: 'morse',
  channel: 'size',
  targetElement: 'birds',
  paletteKey: 'daylight',
  subtlety: 0.35,
  camouflage: true,
  showOverlay: false,
  seed: 42,
};

const els = {
  messageInput: document.getElementById('message-input'),
  charCount: document.getElementById('char-count'),
  encodingNote: document.getElementById('encoding-note'),
  encodingSummary: document.getElementById('encoding-summary'),
  canvasStage: document.getElementById('canvas-stage'),
  paletteSelect: document.getElementById('palette-select'),
  subtletySlider: document.getElementById('subtlety-slider'),
  subtletyLabel: document.getElementById('subtlety-label'),
  toggleCamo: document.getElementById('toggle-camouflage'),
  toggleOverlay: document.getElementById('toggle-overlay'),
  btnRandomize: document.getElementById('btn-randomize'),
  seedDisplay: document.getElementById('seed-display'),
  btnDownloadSvg: document.getElementById('btn-download-svg'),
  btnDownloadPng: document.getElementById('btn-download-png'),
  cipherBtns: document.querySelectorAll('[data-cipher]'),
  channelBtns: document.querySelectorAll('[data-channel]'),
  elementBtns: document.querySelectorAll('[data-element]'),
};

let currentSvg = null;

function formatSubtlety(val) {
  if (val <= 0.2) return 'Obvious';
  if (val <= 0.55) return 'Balanced';
  if (val <= 0.8) return 'Subtle';
  return 'Hard';
}

function update() {
  const encoded = encodeMessage({
    message: state.message,
    cipher: state.cipher,
    channel: state.channel,
    subtlety: state.subtlety,
  });

  currentSvg = renderScene({
    encoded,
    targetElement: state.targetElement,
    channel: state.channel,
    paletteKey: state.paletteKey,
    seed: state.seed,
    showOverlay: state.showOverlay,
    camouflage: state.camouflage,
  });

  els.canvasStage.replaceChildren(currentSvg);
  els.charCount.textContent = `${encoded.items.length} elements`;
  els.encodingNote.textContent = encoded.note;
  els.encodingSummary.textContent = encoded.summary;
  els.subtletyLabel.textContent = formatSubtlety(state.subtlety);
  els.seedDisplay.textContent = state.seed;
}

function setActive(buttons, attr, value) {
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset[attr] === value);
  });
}

// Semagram event listeners
els.messageInput.addEventListener('input', (e) => {
  state.message = e.target.value;
  update();
});

els.cipherBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.cipher = btn.dataset.cipher;
    setActive(els.cipherBtns, 'cipher', state.cipher);
    update();
  });
});

els.channelBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.channel = btn.dataset.channel;
    setActive(els.channelBtns, 'channel', state.channel);
    update();
  });
});

els.elementBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.targetElement = btn.dataset.element;
    setActive(els.elementBtns, 'element', state.targetElement);
    update();
  });
});

els.paletteSelect.addEventListener('change', (e) => {
  state.paletteKey = e.target.value;
  update();
});

els.subtletySlider.addEventListener('input', (e) => {
  state.subtlety = parseFloat(e.target.value);
  update();
});

els.toggleCamo.addEventListener('change', (e) => {
  state.camouflage = e.target.checked;
  update();
});

els.toggleOverlay.addEventListener('change', (e) => {
  state.showOverlay = e.target.checked;
  update();
});

els.btnRandomize.addEventListener('click', () => {
  state.seed = Math.floor(Math.random() * 90000) + 1000;
  update();
});

els.btnDownloadSvg.addEventListener('click', () => {
  if (!currentSvg) return;
  const suffix = state.showOverlay ? '-solution' : '';
  downloadSVG(
    currentSvg,
    `semagram-${state.cipher}-${state.channel}-${state.targetElement}${suffix}.svg`,
    state.showOverlay
  );
});

els.btnDownloadPng.addEventListener('click', () => {
  if (!currentSvg) return;
  const suffix = state.showOverlay ? '-solution' : '';
  downloadPNG(
    currentSvg,
    `semagram-${state.cipher}-${state.channel}-${state.targetElement}${suffix}.png`,
    2,
    state.showOverlay
  );
});

update();

/* -------------------- TAB SWITCHING -------------------- */

const tabBtns = document.querySelectorAll('[data-tab]');
const tabPanels = document.querySelectorAll('[data-tab-panel]');

function switchTab(targetTab) {
  tabBtns.forEach((btn) => {
    const active = btn.dataset.tab === targetTab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== targetTab;
  });
}

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* -------------------- TEXT STEGANOGRAPHY -------------------- */

let zwcMode = 'distributed';

const zwcEls = {
  modeBtns: document.querySelectorAll('[data-zwc-mode]'),
  coverInput: document.getElementById('zwc-cover-input'),
  secretInput: document.getElementById('zwc-secret-input'),
  encodeNote: document.getElementById('zwc-encode-note'),
  output: document.getElementById('zwc-output'),
  embedBadge: document.getElementById('zwc-embed-badge'),
  btnCopy: document.getElementById('btn-zwc-copy'),
  decodeInput: document.getElementById('zwc-decode-input'),
  btnClear: document.getElementById('btn-zwc-clear'),
  inspectBadge: document.getElementById('zwc-inspect-badge'),
  decodeStatus: document.getElementById('zwc-decode-status'),
  decodedOutput: document.getElementById('zwc-decoded-output'),
  markedOutput: document.getElementById('zwc-marked-output'),
  translationRows: document.getElementById('zwc-translation-rows'),
};

function updateZwcEncode() {
  const result = encodeTextStego(zwcEls.coverInput.value, zwcEls.secretInput.value, zwcMode);
  zwcEls.output.value = result.output;
  const unit = zwcMode === 'homoglyph' ? 'swapped glyphs' : 'hidden chars';
  zwcEls.embedBadge.textContent = `${result.hiddenCount} ${unit}`;
  zwcEls.encodeNote.textContent = result.note;
  zwcEls.encodeNote.classList.toggle('warning', Boolean(result.warning));
}

function updateZwcDecode() {
  const input = zwcEls.decodeInput.value;
  const inspection = inspectAndDecodeTextStego(input);

  zwcEls.inspectBadge.textContent = `${inspection.totalMarkers} markers found`;

  // Decoded message summary
  zwcEls.decodedOutput.replaceChildren();
  if (!input) {
    zwcEls.decodeStatus.textContent = 'Waiting';
    const placeholder = document.createElement('span');
    placeholder.className = 'zwc-placeholder';
    placeholder.textContent = 'Decoded message will appear here...';
    zwcEls.decodedOutput.appendChild(placeholder);
  } else if (inspection.status === 'ok') {
    const modeLabel =
      inspection.mode === 'mark'
        ? 'Marked Letters'
        : inspection.mode === 'homoglyph'
          ? 'Homoglyphs'
          : 'Zero-Width';
    zwcEls.decodeStatus.textContent = `Decoded (${modeLabel})`;
    zwcEls.decodedOutput.textContent = inspection.decodedText;
  } else if (inspection.status === 'partial') {
    zwcEls.decodeStatus.textContent = 'Incomplete bits';
    const placeholder = document.createElement('span');
    placeholder.className = 'zwc-placeholder';
    placeholder.textContent = 'Invisible characters found, but not a complete 4-char byte sequence.';
    zwcEls.decodedOutput.appendChild(placeholder);
  } else if (inspection.status === 'invalid') {
    zwcEls.decodeStatus.textContent = 'Invalid UTF-8';
    const placeholder = document.createElement('span');
    placeholder.className = 'zwc-placeholder';
    placeholder.textContent = 'Markers found, but could not decode as UTF-8 text.';
    zwcEls.decodedOutput.appendChild(placeholder);
  } else {
    zwcEls.decodeStatus.textContent = 'No payload';
    const placeholder = document.createElement('span');
    placeholder.className = 'zwc-placeholder';
    placeholder.textContent = 'No hidden message detected.';
    zwcEls.decodedOutput.appendChild(placeholder);
  }

  // Marked invisible / homoglyph character map
  zwcEls.markedOutput.replaceChildren();
  zwcEls.translationRows.replaceChildren();
  if (!input) {
    const placeholder = document.createElement('span');
    placeholder.className = 'zwc-placeholder';
    placeholder.textContent = 'Invisible characters and homoglyphs will be highlighted inline here...';
    zwcEls.markedOutput.appendChild(placeholder);
    return;
  }

  const knownTags = new Set(['ZWSP', 'ZWNJ', 'ZWJ', 'ZWNBSP', 'WJ']);
  for (const seg of inspection.segments) {
    if (seg.type === 'text') {
      zwcEls.markedOutput.appendChild(document.createTextNode(seg.value));
    } else if (seg.type === 'homoglyph') {
      const marker = document.createElement('span');
      marker.className = 'zwc-marker zwc-marker-HOMO';
      marker.textContent = `${seg.char} [HOMO→${seg.ascii}]`;
      marker.title = `Homoglyph lookalike for ASCII '${seg.ascii}' (U+${seg.char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`;
      zwcEls.markedOutput.appendChild(marker);
    } else {
      const marker = document.createElement('span');
      const tagClass = knownTags.has(seg.meta.tag) ? seg.meta.tag : 'other';
      marker.className = `zwc-marker zwc-marker-${tagClass}`;
      marker.textContent = `[${seg.meta.tag}]`;
      marker.title = `${seg.meta.name} (${seg.meta.code})${seg.meta.bits ? ` • bits: ${seg.meta.bits}` : ''}`;
      zwcEls.markedOutput.appendChild(marker);
    }
  }

  // Vertical character-by-character translation rows
  for (const row of inspection.rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'zwc-trans-row';

    if (row.kind === 'mark') {
      const srcEl = document.createElement('span');
      srcEl.className = 'zwc-trans-bits';
      srcEl.textContent = row.markedChar === ' ' ? '␣' : row.markedChar;

      const badge = document.createElement('span');
      badge.className = 'zwc-marker zwc-marker-ZWSP';
      badge.textContent = '[ZWSP]';

      const arrow = document.createElement('span');
      arrow.className = 'zwc-trans-arrow';
      arrow.textContent = '→';

      const charEl = document.createElement('span');
      charEl.className = 'zwc-trans-char';
      charEl.textContent = row.char === ' ' ? '␣ (space)' : row.char;

      rowEl.append(srcEl, badge, arrow, charEl);
    } else if (row.kind === 'homoglyph') {
      const lettersEl = document.createElement('span');
      lettersEl.className = 'zwc-trans-bytes';
      lettersEl.textContent = row.letters;

      const arrow1 = document.createElement('span');
      arrow1.className = 'zwc-trans-arrow';
      arrow1.textContent = '→';

      const bitsEl = document.createElement('span');
      bitsEl.className = 'zwc-trans-bits';
      bitsEl.textContent = row.bits;

      const bytesEl = document.createElement('span');
      bytesEl.className = 'zwc-trans-bytes';
      bytesEl.textContent = `(${row.bytes.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(' ')})`;

      const arrow2 = document.createElement('span');
      arrow2.className = 'zwc-trans-arrow';
      arrow2.textContent = '→';

      const charEl = document.createElement('span');
      charEl.className = 'zwc-trans-char';
      charEl.textContent = row.char === ' ' ? '␣ (space)' : row.char;

      rowEl.append(lettersEl, arrow1, bitsEl, bytesEl, arrow2, charEl);
    } else {
      const tagsWrap = document.createElement('span');
      for (const tag of row.tags) {
        const m = document.createElement('span');
        const tagClass = knownTags.has(tag) ? tag : 'other';
        m.className = `zwc-marker zwc-marker-${tagClass}`;
        m.textContent = `[${tag}]`;
        tagsWrap.appendChild(m);
      }

      const arrow1 = document.createElement('span');
      arrow1.className = 'zwc-trans-arrow';
      arrow1.textContent = '→';

      const bitsEl = document.createElement('span');
      bitsEl.className = 'zwc-trans-bits';
      bitsEl.textContent = row.bitGroups.join(' ');

      const bytesEl = document.createElement('span');
      bytesEl.className = 'zwc-trans-bytes';
      bytesEl.textContent = `(${row.bytes.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(' ')})`;

      const arrow2 = document.createElement('span');
      arrow2.className = 'zwc-trans-arrow';
      arrow2.textContent = '→';

      const charEl = document.createElement('span');
      charEl.className = 'zwc-trans-char';
      charEl.textContent = row.char === ' ' ? '␣ (space)' : row.char;

      rowEl.append(tagsWrap, arrow1, bitsEl, bytesEl, arrow2, charEl);
    }

    zwcEls.translationRows.appendChild(rowEl);
  }
}

zwcEls.modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    zwcMode = btn.dataset.zwcMode;
    setActive(zwcEls.modeBtns, 'zwcMode', zwcMode);
    updateZwcEncode();
  });
});

zwcEls.coverInput.addEventListener('input', updateZwcEncode);
zwcEls.secretInput.addEventListener('input', updateZwcEncode);
zwcEls.decodeInput.addEventListener('input', updateZwcDecode);

zwcEls.btnClear.addEventListener('click', () => {
  zwcEls.decodeInput.value = '';
  updateZwcDecode();
});

zwcEls.btnCopy.addEventListener('click', async () => {
  const text = zwcEls.output.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    zwcEls.output.select();
    document.execCommand('copy');
  }
  const prev = zwcEls.btnCopy.textContent;
  zwcEls.btnCopy.textContent = 'Copied!';
  setTimeout(() => {
    zwcEls.btnCopy.textContent = prev;
  }, 1400);
});

updateZwcEncode();
updateZwcDecode();
