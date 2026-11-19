import { createPRNG } from './prng.js';

export const SCENE_WIDTH = 1200;
export const SCENE_HEIGHT = 675;

export const PALETTES = {
  daylight: {
    name: 'Daylight',
    skyTop: '#4f8fc9',
    skyBottom: '#cbe4f9',
    celestial: '#fff6cc',
    celestialGlow: 'rgba(255, 246, 204, 0.28)',
    farRidge: '#89adc9',
    midHill: '#66996b',
    nearHill: '#3f7048',
    mountainFill: '#5c7c99',
    mountainShade: '#45617a',
    mountainSnow: '#eef6fc',
    treeFill: '#244d32',
    treeHighlight: '#2f6340',
    trunk: '#3b2b20',
    cloudFill: '#ffffff',
    birdStroke: '#1e2c3a',
    fenceFill: '#4a3525',
    fenceHighlight: '#614733',
  },
  golden: {
    name: 'Golden Hour',
    skyTop: '#3e3b6e',
    skyBottom: '#f7a072',
    celestial: '#ffd875',
    celestialGlow: 'rgba(255, 216, 117, 0.3)',
    farRidge: '#7c6587',
    midHill: '#6e525c',
    nearHill: '#3d2c36',
    mountainFill: '#644a63',
    mountainShade: '#4a3449',
    mountainSnow: '#f9cbb0',
    treeFill: '#261e29',
    treeHighlight: '#362b3b',
    trunk: '#1f161b',
    cloudFill: '#ffd4b8',
    birdStroke: '#1e1624',
    fenceFill: '#2e1f24',
    fenceHighlight: '#453037',
  },
  twilight: {
    name: 'Twilight',
    skyTop: '#0d1526',
    skyBottom: '#2d4a6e',
    celestial: '#e6eef8',
    celestialGlow: 'rgba(230, 238, 248, 0.22)',
    farRidge: '#223652',
    midHill: '#1a2d42',
    nearHill: '#101d2b',
    mountainFill: '#253c59',
    mountainShade: '#192a40',
    mountainSnow: '#9ab6d4',
    treeFill: '#0b1621',
    treeHighlight: '#132436',
    trunk: '#081018',
    cloudFill: '#516c8f',
    birdStroke: '#09101a',
    fenceFill: '#121c26',
    fenceHighlight: '#1d2b3b',
  },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) {
      node.setAttribute(k, String(v));
    }
  }
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

/**
 * Render the full SVG scene into a clean standalone <svg> element.
 */
export function renderScene({
  encoded,
  targetElement,
  channel,
  paletteKey = 'daylight',
  seed = 42,
  showOverlay = false,
  camouflage = true,
}) {
  const pal = PALETTES[paletteKey] || PALETTES.daylight;
  const rng = createPRNG(seed);

  const svg = el('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`,
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    role: 'img',
    'aria-label': 'Steganographic semagram landscape',
  });

  // Defs: Sky gradient
  const defs = el('defs', {}, [
    el(
      'linearGradient',
      { id: 'skyGrad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
      [
        el('stop', { offset: '0%', 'stop-color': pal.skyTop }),
        el('stop', { offset: '100%', 'stop-color': pal.skyBottom }),
      ]
    ),
  ]);
  svg.appendChild(defs);

  // 1. Sky backdrop
  svg.appendChild(
    el('rect', {
      x: 0,
      y: 0,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      fill: 'url(#skyGrad)',
    })
  );

  // Subtle stars in twilight
  if (paletteKey === 'twilight') {
    const starGroup = el('g', { opacity: '0.65' });
    for (let i = 0; i < 45; i++) {
      starGroup.appendChild(
        el('circle', {
          cx: rng.range(20, SCENE_WIDTH - 20).toFixed(1),
          cy: rng.range(18, 290).toFixed(1),
          r: rng.range(0.8, 2.0).toFixed(1),
          fill: '#e8f1ff',
          opacity: rng.range(0.3, 0.95).toFixed(2),
        })
      );
    }
    svg.appendChild(starGroup);
  }

  // Sun / Moon
  const celX = rng.range(160, SCENE_WIDTH - 160);
  const celY = paletteKey === 'golden' ? rng.range(250, 320) : rng.range(90, 175);
  const celR = paletteKey === 'twilight' ? 32 : 44;
  svg.appendChild(
    el('circle', {
      cx: celX.toFixed(1),
      cy: celY.toFixed(1),
      r: (celR * 1.75).toFixed(1),
      fill: pal.celestialGlow,
    })
  );
  svg.appendChild(
    el('circle', {
      cx: celX.toFixed(1),
      cy: celY.toFixed(1),
      r: celR,
      fill: pal.celestial,
    })
  );

  // 2. Clouds layer (camouflage if not target)
  if (targetElement === 'clouds') {
    svg.appendChild(renderCarrierClouds(encoded, channel, pal));
  } else if (camouflage) {
    svg.appendChild(renderCamoClouds(rng, pal));
  }

  // 3. Mountains / Far ridge layer
  if (targetElement === 'mountains') {
    // Soft far haze ridge behind carrier mountains
    svg.appendChild(renderSmoothHill(0, 460, 420, pal.farRidge, 0.55));
    svg.appendChild(renderCarrierMountains(encoded, channel, pal));
  } else {
    svg.appendChild(renderCamoMountains(rng, pal, camouflage));
  }

  // 4. Midground hill
  svg.appendChild(renderSmoothHill(0, 495, 455, pal.midHill, 1));

  // 5. Birds layer (camouflage if not target)
  if (targetElement === 'birds') {
    svg.appendChild(renderCarrierBirds(encoded, channel, pal));
  } else if (camouflage) {
    svg.appendChild(renderCamoBirds(rng, pal));
  }

  // 6. Trees layer
  if (targetElement === 'trees') {
    svg.appendChild(renderCarrierTrees(encoded, channel, pal));
  } else if (camouflage) {
    svg.appendChild(renderCamoTrees(rng, pal));
  }

  // 7. Foreground hill
  svg.appendChild(renderSmoothHill(0, 560, 520, pal.nearHill, 1));

  // 8. Fence Posts layer (foreground)
  if (targetElement === 'fence') {
    svg.appendChild(renderCarrierFence(encoded, channel, pal));
  }

  // 9. Optional Solution Overlay (excluded on export)
  if (showOverlay && encoded.items.length > 0) {
    svg.appendChild(renderOverlay(encoded, targetElement, channel));
  }

  return svg;
}

function renderSmoothHill(seedOffset, baseY, peakY, fill, opacity = 1) {
  const midY1 = (baseY + peakY) / 2 + (seedOffset % 17);
  const d = [
    `M 0 ${SCENE_HEIGHT}`,
    `L 0 ${baseY}`,
    `C 260 ${peakY}, 480 ${baseY + 18}, 740 ${midY1}`,
    `C 960 ${peakY - 10}, 1090 ${baseY - 12}, ${SCENE_WIDTH} ${baseY - 24}`,
    `L ${SCENE_WIDTH} ${SCENE_HEIGHT} Z`,
  ].join(' ');
  return el('path', { d, fill, opacity });
}

/* -------------------- CARRIER RENDERERS -------------------- */

function getXBounds(targetElement) {
  switch (targetElement) {
    case 'mountains':
      return { left: 120, right: SCENE_WIDTH - 120 };
    case 'clouds':
      return { left: 110, right: SCENE_WIDTH - 110 };
    case 'trees':
      return { left: 90, right: SCENE_WIDTH - 90 };
    case 'fence':
      return { left: 85, right: SCENE_WIDTH - 85 };
    case 'birds':
    default:
      return { left: 100, right: SCENE_WIDTH - 100 };
  }
}

function mapX(xNorm, targetElement) {
  const { left, right } = getXBounds(targetElement);
  return left + xNorm * (right - left);
}

function computeSizeScale(item, channel, minScale, maxScale) {
  if (channel === 'position') {
    return (minScale + maxScale) * 0.5;
  }
  const contrast = item.contrast ?? 1;
  const center = 0.5;
  const adjustedRatio = center + (item.sizeRatio - center) * contrast;
  return minScale + adjustedRatio * (maxScale - minScale);
}

function renderCarrierBirds(encoded, channel, pal) {
  const g = el('g', { id: 'carrier-birds' });
  const baseY = 215;

  encoded.items.forEach((item) => {
    const cx = mapX(item.xNorm, 'birds');
    const scale = computeSizeScale(item, channel, 0.52, 1.55);
    // Subtle natural wave in Y that doesn't interfere with size/x-spacing
    const cy = baseY + Math.sin(item.xNorm * Math.PI * 2.2) * 18;
    const span = 22 * scale;
    const dip = 8 * scale;
    const strokeW = Math.max(2.0, 2.6 * Math.sqrt(scale));

    const d = `M ${(cx - span).toFixed(1)} ${(cy - dip * 0.4).toFixed(1)} Q ${(cx - span * 0.45).toFixed(1)} ${(cy - dip * 1.35).toFixed(1)}, ${cx.toFixed(1)} ${(cy + dip * 0.25).toFixed(1)} Q ${(cx + span * 0.45).toFixed(1)} ${(cy - dip * 1.35).toFixed(1)}, ${(cx + span).toFixed(1)} ${(cy - dip * 0.4).toFixed(1)}`;
    g.appendChild(
      el('path', {
        d,
        fill: 'none',
        stroke: pal.birdStroke,
        'stroke-width': strokeW.toFixed(2),
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      })
    );
  });

  return g;
}

function renderCarrierTrees(encoded, channel, pal) {
  const g = el('g', { id: 'carrier-trees' });
  const baseY = 505;

  encoded.items.forEach((item) => {
    const cx = mapX(item.xNorm, 'trees');
    const scale = computeSizeScale(item, channel, 0.48, 1.55);
    const h = 86 * scale;
    const w = 36 * scale;
    const trunkH = 14 * scale;
    const trunkW = Math.max(3, 6 * scale);

    const tree = el('g');
    // Trunk
    tree.appendChild(
      el('rect', {
        x: (cx - trunkW / 2).toFixed(1),
        y: (baseY - trunkH).toFixed(1),
        width: trunkW.toFixed(1),
        height: (trunkH + 6).toFixed(1),
        fill: pal.trunk,
      })
    );
    // Lower tier
    tree.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${(baseY - trunkH - h * 0.58).toFixed(1)} ${(cx - w).toFixed(1)},${(baseY - trunkH).toFixed(1)} ${(cx + w).toFixed(1)},${(baseY - trunkH).toFixed(1)}`,
        fill: pal.treeFill,
      })
    );
    // Upper tier
    tree.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${(baseY - trunkH - h).toFixed(1)} ${(cx - w * 0.72).toFixed(1)},${(baseY - trunkH - h * 0.36).toFixed(1)} ${(cx + w * 0.72).toFixed(1)},${(baseY - trunkH - h * 0.36).toFixed(1)}`,
        fill: pal.treeHighlight,
      })
    );
    g.appendChild(tree);
  });

  return g;
}

function renderCarrierMountains(encoded, channel, pal) {
  const g = el('g', { id: 'carrier-mountains' });
  const baseY = 485;

  encoded.items.forEach((item) => {
    const cx = mapX(item.xNorm, 'mountains');
    const scale = computeSizeScale(item, channel, 0.45, 1.55);
    const h = 155 * scale;
    const halfW = 88 * scale;
    const peakY = baseY - h;

    const mt = el('g');
    // Left sunlit face
    mt.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${peakY.toFixed(1)} ${(cx - halfW).toFixed(1)},${baseY} ${cx.toFixed(1)},${baseY}`,
        fill: pal.mountainFill,
      })
    );
    // Right shaded face
    mt.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${peakY.toFixed(1)} ${cx.toFixed(1)},${baseY} ${(cx + halfW).toFixed(1)},${baseY}`,
        fill: pal.mountainShade,
      })
    );
    // Snow cap
    const capH = h * 0.26;
    const capW = halfW * 0.26;
    mt.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${peakY.toFixed(1)} ${(cx - capW).toFixed(1)},${(peakY + capH).toFixed(1)} ${(cx + capW * 0.25).toFixed(1)},${(peakY + capH * 0.85).toFixed(1)} ${(cx + capW).toFixed(1)},${(peakY + capH).toFixed(1)}`,
        fill: pal.mountainSnow,
      })
    );

    g.appendChild(mt);
  });

  return g;
}

function renderCarrierClouds(encoded, channel, pal) {
  const g = el('g', { id: 'carrier-clouds', opacity: '0.92' });
  const baseY = 148;

  encoded.items.forEach((item) => {
    const cx = mapX(item.xNorm, 'clouds');
    const scale = computeSizeScale(item, channel, 0.48, 1.48);
    const cy = baseY + Math.cos(item.xNorm * Math.PI * 2.5) * 14;
    g.appendChild(buildCloudShape(cx, cy, scale, pal.cloudFill));
  });

  return g;
}

function buildCloudShape(cx, cy, scale, fill) {
  const r1 = 16 * scale;
  const r2 = 22 * scale;
  const r3 = 15 * scale;
  const w = 52 * scale;
  const h = 18 * scale;

  return el('g', {}, [
    el('rect', {
      x: (cx - w * 0.5).toFixed(1),
      y: (cy - h * 0.25).toFixed(1),
      width: w.toFixed(1),
      height: h.toFixed(1),
      rx: (h * 0.5).toFixed(1),
      fill,
    }),
    el('circle', { cx: (cx - w * 0.24).toFixed(1), cy: (cy - h * 0.25).toFixed(1), r: r1.toFixed(1), fill }),
    el('circle', { cx: cx.toFixed(1), cy: (cy - h * 0.55).toFixed(1), r: r2.toFixed(1), fill }),
    el('circle', { cx: (cx + w * 0.25).toFixed(1), cy: (cy - h * 0.2).toFixed(1), r: r3.toFixed(1), fill }),
  ]);
}

function renderCarrierFence(encoded, channel, pal) {
  const g = el('g', { id: 'carrier-fence' });
  const baseY = 588;

  encoded.items.forEach((item) => {
    const cx = mapX(item.xNorm, 'fence');
    const scale = computeSizeScale(item, channel, 0.45, 1.6);
    const h = 68 * scale;
    const w = 12 * Math.max(0.75, Math.sqrt(scale));
    const topY = baseY - h;

    g.appendChild(
      el('polygon', {
        points: `${(cx - w / 2).toFixed(1)},${baseY} ${(cx - w / 2).toFixed(1)},${(topY + 7).toFixed(1)} ${cx.toFixed(1)},${topY.toFixed(1)} ${(cx + w / 2).toFixed(1)},${(topY + 7).toFixed(1)} ${(cx + w / 2).toFixed(1)},${baseY}`,
        fill: pal.fenceFill,
      })
    );
    g.appendChild(
      el('rect', {
        x: (cx - w / 2).toFixed(1),
        y: (topY + 7).toFixed(1),
        width: (w * 0.35).toFixed(1),
        height: (h - 7).toFixed(1),
        fill: pal.fenceHighlight,
      })
    );
  });

  return g;
}

/* -------------------- CAMOUFLAGE RENDERERS -------------------- */

function renderCamoClouds(rng, pal) {
  const g = el('g', { opacity: '0.72' });
  const count = rng.int(3, 5);
  for (let i = 0; i < count; i++) {
    const cx = rng.range(90, SCENE_WIDTH - 90);
    const cy = rng.range(75, 185);
    const scale = rng.range(0.7, 1.25);
    g.appendChild(buildCloudShape(cx, cy, scale, pal.cloudFill));
  }
  return g;
}

function renderCamoMountains(rng, pal, camouflage) {
  const g = el('g');
  g.appendChild(renderSmoothHill(0, 455, 405, pal.farRidge, 0.7));
  if (!camouflage) return g;

  const count = rng.int(3, 5);
  const baseY = 475;
  for (let i = 0; i < count; i++) {
    const cx = rng.range(100, SCENE_WIDTH - 100);
    const h = rng.range(115, 210);
    const halfW = h * rng.range(0.6, 0.85);
    const peakY = baseY - h;
    g.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${peakY.toFixed(1)} ${(cx - halfW).toFixed(1)},${baseY} ${(cx + halfW).toFixed(1)},${baseY}`,
        fill: pal.mountainFill,
        opacity: '0.5',
      })
    );
  }
  return g;
}

function renderCamoBirds(rng, pal) {
  const g = el('g', { opacity: '0.75' });
  const count = rng.int(2, 4);
  for (let i = 0; i < count; i++) {
    const cx = rng.range(120, SCENE_WIDTH - 120);
    const cy = rng.range(130, 260);
    const span = rng.range(10, 17);
    const dip = span * 0.36;
    const d = `M ${(cx - span).toFixed(1)} ${(cy - dip * 0.4).toFixed(1)} Q ${(cx - span * 0.45).toFixed(1)} ${(cy - dip * 1.3).toFixed(1)}, ${cx.toFixed(1)} ${(cy + dip * 0.2).toFixed(1)} Q ${(cx + span * 0.45).toFixed(1)} ${(cy - dip * 1.3).toFixed(1)}, ${(cx + span).toFixed(1)} ${(cy - dip * 0.4).toFixed(1)}`;
    g.appendChild(
      el('path', {
        d,
        fill: 'none',
        stroke: pal.birdStroke,
        'stroke-width': '2',
        'stroke-linecap': 'round',
      })
    );
  }
  return g;
}

function renderCamoTrees(rng, pal) {
  const g = el('g', { opacity: '0.88' });
  const count = rng.int(6, 10);
  const baseY = 505;
  for (let i = 0; i < count; i++) {
    const cx = rng.range(50, SCENE_WIDTH - 50);
    const scale = rng.range(0.55, 0.95);
    const h = 75 * scale;
    const w = 28 * scale;
    g.appendChild(
      el('polygon', {
        points: `${cx.toFixed(1)},${(baseY - h).toFixed(1)} ${(cx - w).toFixed(1)},${baseY} ${(cx + w).toFixed(1)},${baseY}`,
        fill: pal.treeFill,
      })
    );
  }
  return g;
}

/* -------------------- SOLUTION OVERLAY -------------------- */

function renderOverlay(encoded, targetElement, channel) {
  const overlay = el('g', {
    'data-overlay': 'true',
    'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
  });

  const labelY =
    targetElement === 'clouds'
      ? 210
      : targetElement === 'birds'
        ? 272
        : targetElement === 'mountains'
          ? 515
          : targetElement === 'trees'
            ? 535
            : 618;

  encoded.items.forEach((item, idx) => {
    const cx = mapX(item.xNorm, targetElement);

    // Vertical guide tick
    overlay.appendChild(
      el('line', {
        x1: cx.toFixed(1),
        y1: (labelY - 26).toFixed(1),
        x2: cx.toFixed(1),
        y2: (labelY - 12).toFixed(1),
        stroke: '#ffeb3b',
        'stroke-width': '1.5',
        'stroke-dasharray': '3,2',
      })
    );

    const text = item.isAnchor ? '★' : item.label;
    const pillW = Math.max(22, text.length * 8 + 10);

    overlay.appendChild(
      el('rect', {
        x: (cx - pillW / 2).toFixed(1),
        y: (labelY - 10).toFixed(1),
        width: pillW.toFixed(1),
        height: '18',
        rx: '4',
        fill: 'rgba(15, 23, 42, 0.86)',
        stroke: item.isAnchor ? '#38bdf8' : '#ffeb3b',
        'stroke-width': '1',
      })
    );

    const txt = el('text', {
      x: cx.toFixed(1),
      y: (labelY + 3).toFixed(1),
      'text-anchor': 'middle',
      'font-size': '11',
      'font-weight': '600',
      fill: item.isAnchor ? '#38bdf8' : '#ffeb3b',
    });
    txt.textContent = text;
    overlay.appendChild(txt);

    // Draw gap bracket in Spacing mode
    if (channel === 'position' && idx > 0 && !item.isAnchor && item.gapUnits !== undefined) {
      const prevX = mapX(encoded.items[idx - 1].xNorm, targetElement);
      const midX = (prevX + cx) / 2;
      const bracketY = labelY + 20;
      overlay.appendChild(
        el('line', {
          x1: prevX.toFixed(1),
          y1: bracketY,
          x2: cx.toFixed(1),
          y2: bracketY,
          stroke: '#38bdf8',
          'stroke-width': '1.2',
        })
      );
      const gapTxt = el('text', {
        x: midX.toFixed(1),
        y: bracketY + 12,
        'text-anchor': 'middle',
        'font-size': '10',
        fill: '#e2e8f0',
      });
      gapTxt.textContent = `${item.gapUnits}u`;
      overlay.appendChild(gapTxt);
    }
  });

  return overlay;
}
