import { encodeMessage } from './encoder.js';
import { renderScene } from './renderer.js';
import { downloadPNG, downloadSVG } from './exporter.js';

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

// Event listeners
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
