import { mkdir, writeFile, rm } from "node:fs/promises";
import sharp from "sharp";

/**
 * scripts/logo675.jpg is the cream tile: navy court lines, orange "675".
 * The file is a 1024² export of a rounded-square icon on a white margin.
 * The largest square that stays on the cream (inside the corner arcs) is
 * 856² at (84, 86). Every output is a downsample of that crop.
 */
const CROP = { left: 84, top: 86, width: 856, height: 856 };
const CREAM = { r: 250, g: 244, b: 232 };

const meta = await sharp("scripts/logo675.jpg").metadata();
if (meta.width !== 1024 || meta.height !== 1024) {
  throw new Error(`logo675.jpg debe ser 1024×1024; llegó ${meta.width}×${meta.height}`);
}

const cropped = sharp("scripts/logo675.jpg").extract(CROP);
const master = await cropped.png().toBuffer();
await assertCourtLogo(master);

await mkdir("public/icons", { recursive: true });

async function png(size, file) {
  if (size > CROP.width) throw new Error(`no se amplía el logo a ${size}`);
  await sharp(master)
    .resize(size, size, { fit: "fill", kernel: "lanczos3", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

await png(180, "public/icons/apple-touch-icon.png");
await png(192, "public/icons/icon-192.png");
await png(512, "public/icons/icon-512.png");
await png(32, "public/favicon-32.png");

const maskableArt = await sharp(master)
  .resize(410, 410, { fit: "fill", kernel: "lanczos3", withoutEnlargement: true })
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 3, background: CREAM },
})
  .composite([{ input: maskableArt, gravity: "centre" }])
  .png({ compressionLevel: 9 })
  .toFile("public/icons/icon-512-maskable.png");

const favicon = await sharp(master)
  .resize(32, 32, { fit: "fill", kernel: "lanczos3", withoutEnlargement: true })
  .png()
  .toBuffer();
await writeFile("public/favicon.ico", icoFromPng(favicon, 32));
await rm("public/favicon.svg", { force: true });
await rm("public/icons/icon-source.svg", { force: true });
console.log("icons ready", CROP);

async function assertCourtLogo(png) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 856) throw new Error("recorte inesperado");
  let cream = 0;
  let orange = 0;
  let navy = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 220 && g > 200 && b > 180) cream += 1;
    else if (r > 160 && r > g + 40 && b < 120) orange += 1;
    else if (r < 80 && b > r + 15 && b > 50 && g < 130) navy += 1;
  }
  const center = info.width / 2 | 0;
  const o = (center * info.width + center) * info.channels;
  const cr = data[o];
  const cg = data[o + 1];
  const cb = data[o + 2];
  if (cream < 200_000 || orange < 20_000 || navy < 8_000) {
    throw new Error(`el archivo no es el logo de la pista (crema ${cream}, naranja ${orange}, marino ${navy})`);
  }
  if (!(cr > 160 && cr > cg + 30 && cb < 120)) {
    throw new Error(`el centro no es el 675 naranja (${cr},${cg},${cb})`);
  }
}

function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}
