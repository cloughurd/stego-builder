import { SCENE_WIDTH, SCENE_HEIGHT } from './renderer.js';

function cloneSvg(svgElement, includeOverlay = false) {
  const clone = svgElement.cloneNode(true);
  if (!includeOverlay) {
    clone.querySelectorAll('[data-overlay="true"]').forEach((node) => node.remove());
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return clone;
}

function serializeSvg(svgElement, includeOverlay = false) {
  const clone = cloneSvg(svgElement, includeOverlay);
  const serializer = new XMLSerializer();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadSVG(svgElement, filename = 'semagram.svg', includeOverlay = false) {
  const svgString = serializeSvg(svgElement, includeOverlay);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPNG(svgElement, filename = 'semagram.png', scale = 2, includeOverlay = false) {
  const svgString = serializeSvg(svgElement, includeOverlay);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SCENE_WIDTH * scale;
    canvas.height = SCENE_HEIGHT * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      triggerDownload(pngUrl, filename);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
