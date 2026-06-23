import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'assets', 'logo.png');
const outIcon = path.join(root, 'assets', 'app-icon.png');
const outForeground = path.join(root, 'assets', 'app-icon-foreground.png');
const outSplash = path.join(root, 'assets', 'app-icon-splash.png');

const SIZE = 1024;
// Android/iOS masks clip outer edges — keep emblem well inside the safe zone.
const ICON_EMBLEM_SCALE = 0.46;
const ADAPTIVE_EMBLEM_SCALE = 0.30;
const SPLASH_EMBLEM_SCALE = 0.42;
// Asymmetric padding — extra bottom margin so the book base is not clipped by icon masks.
const ICON_EMBLEM_PAD = { top: 0.12, bottom: 0.22, left: 0.14, right: 0.14 };
const ADAPTIVE_EMBLEM_PAD = { top: 0.18, bottom: 0.34, left: 0.16, right: 0.16 };
// Nudge emblem upward on the canvas (launcher masks often clip the bottom edge).
const ICON_EMBLEM_OFFSET_Y_RATIO = -0.04;
const ADAPTIVE_EMBLEM_OFFSET_Y_RATIO = -0.10;

// Emblem bounds in logo.png — graphic only; height must include full book base (was too short).
const EMBLEM = { left: 152, top: 40, width: 720, height: 645 };

async function extractEmblem(padBackground, emblemPad = ICON_EMBLEM_PAD) {
  const extracted = await sharp(source).extract(EMBLEM).png().toBuffer();
  const meta = await sharp(extracted).metadata();
  const padTop = Math.round(meta.height * emblemPad.top);
  const padBottom = Math.round(meta.height * emblemPad.bottom);
  const padLeft = Math.round(meta.width * emblemPad.left);
  const padRight = Math.round(meta.width * emblemPad.right);
  return sharp(extracted)
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: padBackground,
    })
    .png()
    .toBuffer();
}

async function buildIcon({
  background,
  outPath,
  emblemScale = ICON_EMBLEM_SCALE,
  emblemPad = ICON_EMBLEM_PAD,
  emblemOffsetYRatio = ICON_EMBLEM_OFFSET_Y_RATIO,
}) {
  const emblemSize = Math.round(SIZE * emblemScale);
  const offsetX = Math.round((SIZE - emblemSize) / 2);
  const offsetY = Math.round((SIZE - emblemSize) / 2 + SIZE * emblemOffsetYRatio);

  const emblem = await extractEmblem(background, emblemPad)
    .then((buf) =>
      sharp(buf)
        .resize(emblemSize, emblemSize, { fit: 'contain', background })
        .png()
        .toBuffer()
    );

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background,
    },
  })
    .composite([{ input: emblem, left: offsetX, top: offsetY }])
    .png()
    .toFile(outPath);
}

async function buildForeground() {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const emblemSize = Math.round(SIZE * ADAPTIVE_EMBLEM_SCALE);
  const offsetX = Math.round((SIZE - emblemSize) / 2);
  const offsetY = Math.round((SIZE - emblemSize) / 2 + SIZE * ADAPTIVE_EMBLEM_OFFSET_Y_RATIO);

  const emblem = await extractEmblem(transparent, ADAPTIVE_EMBLEM_PAD)
    .then((buf) =>
      sharp(buf)
        .resize(emblemSize, emblemSize, { fit: 'contain', background: transparent })
        .png()
        .toBuffer()
    );

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: emblem, left: offsetX, top: offsetY }])
    .png()
    .toFile(outForeground);
}

async function main() {
  await buildIcon({
    background: { r: 255, g: 255, b: 255, alpha: 1 },
    outPath: outIcon,
  });
  await buildForeground();
  await buildIcon({
    background: { r: 37, g: 99, b: 235, alpha: 1 },
    outPath: outSplash,
    emblemScale: SPLASH_EMBLEM_SCALE,
  });
  console.log('Generated:', outIcon, outForeground, outSplash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
