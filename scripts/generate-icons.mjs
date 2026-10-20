import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const LINE = "#173454";
const COURT = 15;
const HALF = 14;

function courtSvg(size, pad) {
  const scale = Math.min((size - pad * 2) / COURT, (size - pad * 2) / HALF);
  const w = COURT * scale;
  const h = HALF * scale;
  const ox = (size - w) / 2;
  const oy = (size - h) / 2;
  const pt = (mx, my) => [ox + (my / COURT) * w, oy + (mx / HALF) * h];
  const path = (points) =>
    points.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(" ");
  const arc = (cx, cy, r, a0, a1, steps = 28) => {
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = a0 + ((a1 - a0) * i) / steps;
      points.push(pt(cx + Math.cos(t) * r, cy + Math.sin(t) * r));
    }
    return path(points);
  };

  const basketX = 1.575;
  const mid = 7.5;
  const keyEnd = 5.8;
  const lane = 2.45;
  const threeDx = Math.sqrt(6.75 ** 2 - 6.6 ** 2);
  const alpha = Math.atan2(6.6, threeDx);
  const [bx, by] = pt(basketX, mid);
  const rim = 0.225 * scale;
  const tokens = [
    [11.15, 7.5, "#0f766e", "1"],
    [8.55, 2.3, "#1d4ed8", "2"],
    [8.55, 12.7, "#c2410c", "3"],
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#141210"/>
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="#e8d2b0"/>
  <rect x="${pt(0, mid - lane)[0]}" y="${pt(0, mid - lane)[1]}" width="${(lane * 2 * scale)}" height="${(keyEnd * scale)}" fill="rgba(36,76,120,0.18)"/>
  <g fill="none" stroke="${LINE}" stroke-width="${Math.max(size / 90, 3)}" stroke-linejoin="round" stroke-linecap="round">
    <rect x="${ox}" y="${oy}" width="${w}" height="${h}"/>
    <path d="${path([pt(0, mid - lane), pt(keyEnd, mid - lane), pt(keyEnd, mid + lane), pt(0, mid + lane), pt(0, mid - lane)])}"/>
    <path d="${arc(keyEnd, mid, 1.8, -Math.PI / 2, Math.PI / 2)}"/>
    <path d="${path([pt(0, 0.9), pt(basketX + threeDx, 0.9)])}"/>
    <path d="${path([pt(0, 14.1), pt(basketX + threeDx, 14.1)])}"/>
    <path d="${arc(basketX, mid, 6.75, -alpha, alpha)}"/>
    <path d="${arc(14, mid, 1.8, Math.PI, Math.PI * 2)}"/>
  </g>
  <path d="${path([pt(1.2, mid - 0.9), pt(1.2, mid + 0.9)])}" stroke="#1c1916" stroke-width="${Math.max(size / 70, 4)}" stroke-linecap="round"/>
  <circle cx="${bx}" cy="${by}" r="${rim}" fill="none" stroke="#ef5d24" stroke-width="${Math.max(size / 80, 3)}"/>
  ${tokens
    .map(([mx, my, color, label]) => {
      const [x, y] = pt(mx, my);
      const r = scale * 0.42;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="rgba(255,255,255,.35)" stroke-width="${r * 0.12}"/><text x="${x}" y="${y + r * 0.12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${r * 1.05}" font-weight="700" fill="white">${label}</text>`;
    })
    .join("\n  ")}
  <circle cx="${pt(10.2, 6.7)[0]}" cy="${pt(10.2, 6.7)[1]}" r="${scale * 0.28}" fill="#e86b1f" stroke="#1a120c" stroke-width="${scale * 0.04}"/>
</svg>`;
}

await mkdir("public/icons", { recursive: true });
const full = courtSvg(512, 46);
const maskable = courtSvg(512, 78);
await writeFile("public/icons/icon-source.svg", full);
await sharp(Buffer.from(full)).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(full)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(maskable)).png().toFile("public/icons/icon-512-maskable.png");
await sharp(Buffer.from(full)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");

const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#141210"/>
  <rect x="6" y="4" width="20" height="24" fill="#e8d2b0"/>
  <rect x="6" y="4" width="20" height="24" fill="none" stroke="#173454" stroke-width="1.4"/>
  <path d="M11 4.6h10v7H11z" fill="none" stroke="#173454" stroke-width="1.1"/>
  <path d="M8 18.5a8 8 0 0 0 16 0" fill="none" stroke="#173454" stroke-width="1.1"/>
  <circle cx="16" cy="8.2" r="1.3" fill="none" stroke="#ef5d24" stroke-width="1"/>
</svg>`;
await writeFile("public/favicon.svg", favicon);
console.log("icons ready");
