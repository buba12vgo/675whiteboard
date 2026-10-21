import { mkdir, writeFile, rm } from "node:fs/promises";
import sharp from "sharp";

/**
 * logo675.jpg is a rounded tile on a blue-grey margin. The cream artwork
 * starts inside that curve. This crop sits fully on the cream so iOS can
 * round a square icon instead of rounding an already-rounded picture.
 * Measured from the source: origin (64, 60), side 164, then 6 px inset.
 */
const CROP = { left: 70, top: 66, width: 152, height: 152 };
const CREAM = { r: 238, g: 235, b: 226 };

const source = sharp("scripts/logo675.jpg").extract(CROP).flatten({ background: CREAM });
const master = await source.png().toBuffer();

await mkdir("public/icons", { recursive: true });

async function png(size, file) {
  await sharp(master)
    .resize(size, size, { fit: "fill" })
    .flatten({ background: CREAM })
    .png()
    .toFile(file);
}

await png(180, "public/icons/apple-touch-icon.png");
await png(192, "public/icons/icon-192.png");
await png(512, "public/icons/icon-512.png");
await png(512, "public/icons/icon-512-maskable.png");
await png(32, "public/favicon-32.png");

const favicon = await sharp(master).resize(32, 32, { fit: "fill" }).flatten({ background: CREAM }).png().toBuffer();
await writeFile("public/favicon.ico", icoFromPng(favicon, 32));
await rm("public/favicon.svg", { force: true });
await rm("public/icons/icon-source.svg", { force: true });
console.log("icons ready", CROP);

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
