// Generates Quiloria brand assets from the canonical mark geometry:
//   public/brand/*.svg           — static + animated marks
//   public/icon-{192,512}.png    — PWA icons (manifest.json already points here)
//   public/icon-maskable-512.png — maskable variant (mark inside 80% safe zone)
//   src/app/icon.png             — favicon (Next App Router)
//   src/app/favicon.ico          — PNG-in-ICO wrapper for legacy requests
// Run: node design/build-brand.mjs
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';

const ROOT = '/home/user/story-platform';

// ── Quill Ring geometry (kept in sync with design/quiloria-logo-concepts.html) ──
const VANE = `M -26 -1
  C -20 -8.5 -8 -10.8 3 -9.8
  C 12 -9 18.5 -6.2 23.5 -2.5
  L 24.5 -0.5
  C 19 4.8 9 7.8 -1 7.2
  C -11.5 6.6 -20.5 4.2 -26 -1 Z`;
const RACHIS = 'M -22.5 -0.7 C -10 -1.8 6 -1 21 -0.6';
const BARB_CUTS = 'M 13 -0.8 L 6.5 7.5 M 3 -0.9 L -3.5 7.4 M -7 -1 L -13 6.2';
const SHAFT = 'M 22 0 L 30 0';
const NIB = 'M 28 -1.9 Q 36 -1.2 39.5 0.6 Q 34.5 1.5 28 1.9 Z';
const DROP = 'M 79.5 76.5 C 79.5 76.5 75.1 82.4 75.1 85.1 a 4.4 4.4 0 0 0 8.8 0 C 83.9 82.4 79.5 76.5 79.5 76.5 Z';
const SPARK = 'M 54.5 22.5 C 55.6 26.7 57.6 28.7 61.8 29.8 C 57.6 30.9 55.6 32.9 54.5 37.1 C 53.4 32.9 51.4 30.9 47.2 29.8 C 51.4 28.7 53.4 26.7 54.5 22.5 Z';

function quillRing({ ink = 'currentColor', accent = ink, id = 'qr' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <mask id="${id}-cuts" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect width="100" height="100" fill="white"/>
      <g transform="translate(46 44) rotate(45)">
        <path d="${RACHIS}" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
        <path d="${BARB_CUTS}" fill="none" stroke="black" stroke-width="1.5"/>
      </g>
    </mask>
  </defs>
  <circle cx="46" cy="44" r="30" fill="none" stroke="${ink}" stroke-width="3.2"/>
  <g mask="url(#${id}-cuts)">
    <path d="${VANE}" fill="${ink}" transform="translate(46 44) rotate(45)"/>
  </g>
  <g transform="translate(46 44) rotate(45)">
    <path d="${SHAFT}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="${NIB}" fill="${ink}"/>
  </g>
  <path d="${DROP}" fill="${accent}"/>
  <path d="${SPARK}" fill="${accent}"/>
</svg>`;
}

// Animated: ring draws itself, feather settles in, the drop drips from the
// nib, the spark pops and keeps twinkling. Self-contained CSS so it animates
// inside a plain <img>.
function quillRingAnimated({ ink = '#F3EBDB', accent = '#E0A93E' } = {}) {
  const C = (2 * Math.PI * 30).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <style>
    .qra-ring {
      stroke-dasharray: ${C}; stroke-dashoffset: ${C};
      animation: qra-draw 1.1s cubic-bezier(.55,.06,.35,1) .15s forwards;
    }
    .qra-feather {
      opacity: 0; transform-box: fill-box; transform-origin: center;
      animation: qra-settle .7s cubic-bezier(.2,.8,.3,1.15) 1s forwards;
    }
    .qra-drop {
      opacity: 0; transform-box: fill-box; transform-origin: top center;
      animation: qra-drip .65s cubic-bezier(.3,1.4,.5,1) 1.8s forwards;
    }
    .qra-spark {
      opacity: 0; transform-box: fill-box; transform-origin: center;
      animation: qra-pop .5s cubic-bezier(.2,.9,.3,1.3) 2.2s forwards,
                 qra-twinkle 2.6s ease-in-out 2.7s infinite alternate;
    }
    @keyframes qra-draw { to { stroke-dashoffset: 0; } }
    @keyframes qra-settle {
      from { opacity: 0; transform: translate(-5px,-5px) rotate(-10deg) scale(.92); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes qra-drip {
      from { opacity: 0; transform: translateY(-9px) scale(.25); }
      55%  { opacity: 1; }
      to   { opacity: 1; transform: none; }
    }
    @keyframes qra-pop {
      from { opacity: 0; transform: scale(0) rotate(-90deg); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes qra-twinkle {
      from { opacity: 1; transform: scale(1); }
      to   { opacity: .72; transform: scale(.86); }
    }
  </style>
  <defs>
    <mask id="qra-cuts" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect width="100" height="100" fill="white"/>
      <g transform="translate(46 44) rotate(45)">
        <path d="${RACHIS}" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
        <path d="${BARB_CUTS}" fill="none" stroke="black" stroke-width="1.5"/>
      </g>
    </mask>
  </defs>
  <circle class="qra-ring" cx="46" cy="44" r="30" fill="none" stroke="${ink}" stroke-width="3.2" transform="rotate(45 46 44)"/>
  <g class="qra-feather">
    <g mask="url(#qra-cuts)">
      <path d="${VANE}" fill="${ink}" transform="translate(46 44) rotate(45)"/>
    </g>
    <g transform="translate(46 44) rotate(45)">
      <path d="${SHAFT}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="${NIB}" fill="${ink}"/>
    </g>
  </g>
  <path class="qra-drop" d="${DROP}" fill="${accent}"/>
  <path class="qra-spark" d="${SPARK}" fill="${accent}"/>
</svg>`;
}

function dropBook({ ink = 'currentColor', id = 'db' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <mask id="${id}-book" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect width="100" height="100" fill="white"/>
      <path d="M 50 56.5 C 45.5 52.5 38.5 52 34 53.8 L 34 68.5 C 38.5 67 45.5 67.6 50 71.8 C 54.5 67.6 61.5 67 66 68.5 L 66 53.8 C 61.5 52 54.5 52.5 50 56.5 Z" fill="black"/>
    </mask>
  </defs>
  <path d="M 50 9 C 50 9 26.5 41.5 26.5 61 C 26.5 75 37 84.5 50 84.5 C 63 84.5 73.5 75 73.5 61 C 73.5 41.5 50 9 50 9 Z" fill="${ink}" mask="url(#${id}-book)"/>
  <path d="M 50 57.5 L 50 70.5" stroke="${ink}" stroke-width="1.8"/>
</svg>`;
}

function weave({ ink = 'currentColor', id = 'wv' } = {}) {
  const negatives = [0, 120, 240].map(a => `
      <g transform="rotate(${a} 50 50)">
        <path d="M 50 41 L 50 27" stroke="black" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="50" cy="24" r="2" fill="black"/>
      </g>`).join('');
  const bodies = [0, 120, 240].map(a => `
    <path d="M 50 42 C 46.5 37.5 44.5 32.5 44.5 27.5 L 44.5 16.5 Q 44.5 14.5 46.5 14.5 L 53.5 14.5 Q 55.5 14.5 55.5 16.5 L 55.5 27.5 C 55.5 32.5 53.5 37.5 50 42 Z" fill="${ink}" transform="rotate(${a} 50 50)"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <mask id="${id}-slits" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect width="100" height="100" fill="white"/>${negatives}
    </mask>
  </defs>
  <g mask="url(#${id}-slits)">${bodies}
  </g>
  <path d="M 50 45.2 C 50.7 48 52 49.3 54.8 50 C 52 50.7 50.7 52 50 54.8 C 49.3 52 48 50.7 45.2 50 C 48 49.3 49.3 48 50 45.2 Z" fill="${ink}"/>
</svg>`;
}

// ── write SVGs ──
mkdirSync(`${ROOT}/public/brand`, { recursive: true });
writeFileSync(`${ROOT}/public/brand/quill-ring.svg`, quillRing());
writeFileSync(`${ROOT}/public/brand/quill-ring-lamplight.svg`, quillRing({ ink: '#F3EBDB', accent: '#E0A93E' }));
writeFileSync(`${ROOT}/public/brand/quill-ring-animated.svg`, quillRingAnimated());
writeFileSync(`${ROOT}/public/brand/drop-book.svg`, dropBook());
writeFileSync(`${ROOT}/public/brand/weave.svg`, weave());
console.log('SVGs written to public/brand/');

// ── icon PNGs via playwright ──
// Lamplight tile: deep void with a faint candle-glow behind the mark.
function iconTile(px, markScale) {
  const m = Math.round(px * markScale);
  return `<div class="tile" style="width:${px}px;height:${px}px">
    <div class="mark" style="width:${m}px;height:${m}px">${quillRing({ ink: '#F3EBDB', accent: '#E0A93E', id: `i${px}${Math.round(markScale * 100)}` })}</div>
  </div>`;
}
const page_html = `<!DOCTYPE html><html><head><style>
  body { margin: 0; display: flex; flex-direction: column; align-items: flex-start; background: #555; }
  .tile {
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 42%, rgba(224,169,62,.18), rgba(224,169,62,0) 62%), #110E09;
  }
  .mark svg { display: block; width: 100%; height: 100%; }
</style></head><body>
  ${iconTile(512, 0.74)}
  ${iconTile(512, 0.58)}
  ${iconTile(192, 0.74)}
  ${iconTile(64, 0.78)}
  ${iconTile(32, 0.8)}
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 1400 }, deviceScaleFactor: 1 });
await page.setContent(page_html);
const tiles = await page.$$('.tile');
const outs = [
  `${ROOT}/public/icon-512.png`,
  `${ROOT}/public/icon-maskable-512.png`,
  `${ROOT}/public/icon-192.png`,
  `${ROOT}/src/app/icon.png`,
  `${ROOT}/design/favicon-32.png`,
];
for (let i = 0; i < tiles.length; i++) await tiles[i].screenshot({ path: outs[i] });

// Transparent mark for HTML email headers (email clients can't render the
// SVG mask/CSS-var version): cream feather + gold accents, no tile.
await page.setContent(`<!DOCTYPE html><html><head><style>
  body { margin: 0; }
  #m { width: 120px; height: 120px; }
  #m svg { display: block; width: 100%; height: 100%; }
</style></head><body><div id="m">${quillRing({ ink: '#F3EBDB', accent: '#E0A93E', id: 'email' })}</div></body></html>`);
await page.locator('#m').screenshot({ path: `${ROOT}/public/email-logo.png`, omitBackground: true });

// Next.js requires the PNG inside favicon.ico to be RGBA; screenshots are
// RGB, so round-trip through a canvas (canvas PNG export is always RGBA).
const b64 = readFileSync(`${ROOT}/design/favicon-32.png`).toString('base64');
const rgbaB64 = await page.evaluate(async (data) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + data;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png').split(',')[1];
}, b64);
await browser.close();
console.log('PNG icons written');

// ── favicon.ico: a single 32px RGBA PNG wrapped in an ICO container ──
const png = Buffer.from(rgbaB64, 'base64');
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0); entry.writeUInt8(32, 1);          // w, h
entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);      // planes, bpp
entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12); // size, offset
writeFileSync(`${ROOT}/src/app/favicon.ico`, Buffer.concat([header, entry, png]));
console.log('favicon.ico written');
