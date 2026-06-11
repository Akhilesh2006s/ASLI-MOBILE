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
// Android/iOS safe zone: keep emblem within ~62% of canvas
const EMBLEM_SCALE = 0.62;

// Emblem bounds in logo.png (logo only — no wordmark/tagline)
const EMBLEM = { left: 192, top: 71, width: 640, height: 640 };

async function buildIcon({ background, outPath, emblemScale = EMBLEM_SCALE }) {
  const emblemSize = Math.round(SIZE * emblemScale);
  const offset = Math.round((SIZE - emblemSize) / 2);

  const emblem = await sharp(source)
    .extract(EMBLEM)
    .resize(emblemSize, emblemSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

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
  const emblemSize = Math.round(SIZE * EMBLEM_SCALE);
  const offset = Math.round((SIZE - emblemSize) / 2);

  const emblem = await sharp(source)
    .extract(EMBLEM)
    .resize(emblemSize, emblemSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

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
    emblemScale: 0.5,
  });
  console.log('Generated:', outIcon, outForeground, outSplash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
