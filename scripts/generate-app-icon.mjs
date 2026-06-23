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
const ICON_EMBLEM_SCALE = 0.5;
const ADAPTIVE_EMBLEM_SCALE = 0.4;
const SPLASH_EMBLEM_SCALE = 0.45;
// Extra transparent/white margin around extracted graphic so orbital rings are not clipped.
const EMBLEM_PAD_RATIO = 0.14;

// Emblem bounds in logo.png — graphic only; must not include wordmark below
const EMBLEM = { left: 152, top: 40, width: 720, height: 590 };

async function extractEmblem(padBackground) {
  const extracted = await sharp(source).extract(EMBLEM).png().toBuffer();
  const meta = await sharp(extracted).metadata();
  const padX = Math.round(meta.width * EMBLEM_PAD_RATIO);
  const padY = Math.round(meta.height * EMBLEM_PAD_RATIO);
  return sharp(extracted)
    .extend({
      top: padY,
      bottom: padY,
      left: padX,
      right: padX,
      background: padBackground,
    })
    .png()
    .toBuffer();
}

async function buildIcon({ background, outPath, emblemScale = ICON_EMBLEM_SCALE }) {
  const emblemSize = Math.round(SIZE * emblemScale);
  const offset = Math.round((SIZE - emblemSize) / 2);

  const emblem = await extractEmblem(background)
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
    .composite([{ input: emblem, left: offset, top: offset }])
    .png()
    .toFile(outPath);
}

async function buildForeground() {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const emblemSize = Math.round(SIZE * ADAPTIVE_EMBLEM_SCALE);
  const offset = Math.round((SIZE - emblemSize) / 2);

  const emblem = await extractEmblem(transparent)
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
    .composite([{ input: emblem, left: offset, top: offset }])
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
