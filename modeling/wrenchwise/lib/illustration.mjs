// Static front-elevation schematic of the assembly, generated from the same
// placements and dimensions as the 3D export. It is the illustration shown when
// WebGL is unavailable, and the printable overview of the timing drive.
//
// Looking at the front of the engine: screen X increases to the right as engine
// X decreases (engine left is on the viewer's right), screen Y increases
// downward as engine Y decreases.

// Light tints of the interface's system hues, so "the blue ones" means the same
// thing in the illustration as in the chips and the part callout.
const SYSTEM_FILL = {
  'engine-structure': ['#eceef2', '#8b93a2'],
  'timing-drive': ['#dce8fa', '#2f6fd0'],
  'accessory-drive': ['#dcefe6', '#2d8a63'],
  cooling: ['#f8e9d7', '#c2772a'],
  lubrication: ['#ece6f6', '#7a5bb5'],
  intake: ['#ddeef3', '#3f8fa8'],
  exhaust: ['#f5e4e4', '#a05252'],
  body: ['#eef0f3', '#6b7280'],
};

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildIllustration({ layers, records, engineVariantId, modelRevision, labelSystem = 'timing-drive' }) {
  const shapes = [];
  for (const [layer, objects] of layers) {
    for (const object of objects) {
      const record = records.find((r) => r.meshIds.includes(object.name));
      const min = object.bounds.min.map((v, i) => v + object.translation[i]);
      const max = object.bounds.max.map((v, i) => v + object.translation[i]);
      shapes.push({
        meshId: object.name,
        componentId: object.extras.componentId,
        name: record?.name ?? object.name,
        system: record?.system ?? 'engine-structure',
        layer,
        // Project to the front elevation.
        x: -max[0],
        y: -max[1],
        width: max[0] - min[0],
        height: max[1] - min[1],
        depth: max[2],
      });
    }
  }

  const bounds = shapes.reduce(
    (acc, s) => ({
      minX: Math.min(acc.minX, s.x),
      minY: Math.min(acc.minY, s.y),
      maxX: Math.max(acc.maxX, s.x + s.width),
      maxY: Math.max(acc.maxY, s.y + s.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  const scale = 760 / (bounds.maxX - bounds.minX);
  const pad = 28;
  const labelColumn = 250;
  const drawWidth = (bounds.maxX - bounds.minX) * scale;
  const drawHeight = (bounds.maxY - bounds.minY) * scale;
  const width = Math.round(drawWidth + pad * 2 + labelColumn);
  const height = Math.round(drawHeight + pad * 2 + 54);

  const px = (x) => pad + (x - bounds.minX) * scale;
  const py = (y) => pad + 40 + (y - bounds.minY) * scale;

  // Back to front, so the timing drive sits on top of the block.
  shapes.sort((a, b) => a.depth - b.depth);

  const paint = (system) => SYSTEM_FILL[system] ?? ['#eef0f3', '#6b7280'];

  const parts = shapes
    .map((s) => {
      const [fill, stroke] = paint(s.system);
      return (
        `    <rect x="${px(s.x).toFixed(1)}" y="${py(s.y).toFixed(1)}" ` +
        `width="${Math.max(1, s.width * scale).toFixed(1)}" height="${Math.max(1, s.height * scale).toFixed(1)}" ` +
        `rx="2" fill="${fill}" stroke="${stroke}" stroke-width="0.7" stroke-opacity="0.65" ` +
        `data-component-id="${escape(s.componentId)}"><title>${escape(s.name)}</title></rect>`
      );
    })
    .join('\n');

  const labelled = [];
  const seen = new Set();
  for (const s of shapes) {
    if (s.system !== labelSystem || seen.has(s.componentId)) continue;
    seen.add(s.componentId);
    labelled.push(s);
  }
  labelled.sort((a, b) => a.y - b.y);

  const labelX = pad + drawWidth + 56;
  const labelStep = Math.min(22, (drawHeight - 10) / Math.max(1, labelled.length - 1));
  const labels = labelled
    .map((s, i) => {
      const anchorX = px(s.x + s.width / 2);
      const anchorY = py(s.y + s.height / 2);
      const textY = py(bounds.minY) + 8 + i * labelStep;
      return (
        `    <path d="M ${anchorX.toFixed(1)} ${anchorY.toFixed(1)} L ${(labelX - 10).toFixed(1)} ${textY.toFixed(1)}" ` +
        `fill="none" stroke="#9ca3af" stroke-width="0.6"/>\n` +
        `    <circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="1.8" fill="#374151"/>\n` +
        `    <text x="${labelX.toFixed(1)}" y="${(textY + 3.5).toFixed(1)}" font-size="11" fill="#111827">${escape(s.name)}</text>`
      );
    })
    .join('\n');

  const presentSystems = [...new Set(shapes.map((s) => s.system))].sort();
  const legend = presentSystems
    .map((system, i) => {
      const [fill, stroke] = paint(system);
      const x = pad + i * 150;
      return (
        `    <rect x="${x}" y="${height - 24}" width="10" height="10" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="0.9"/>\n` +
        `    <text x="${x + 15}" y="${height - 15}" font-size="10.5" fill="#374151">${escape(system.replace(/-/g, ' '))}</text>`
      );
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="title">${escape(engineVariantId)} front elevation, model revision ${modelRevision}</title>
  <desc id="desc">Schematic front view generated from the component inventory. Every outline is the projected bounding box of a selectable component. Positions and sizes are estimated from photograph proportions and are not measured, so this drawing is not dimensionally accurate and must not be used for fitment.</desc>
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${pad}" y="${pad - 6}" font-size="13" font-weight="600" fill="#111827">Front elevation — ${escape(engineVariantId)} r${modelRevision}</text>
  <text x="${pad}" y="${pad + 10}" font-size="10.5" fill="#6b7280">Illustrative outlines from estimated placements. Not dimensionally accurate.</text>
  <g id="parts">
${parts}
  </g>
  <g id="labels">
${labels}
  </g>
  <g id="legend">
${legend}
  </g>
</svg>
`;
}
