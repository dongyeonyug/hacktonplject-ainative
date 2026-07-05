#!/usr/bin/env node
// Generates public/icons/icon-192.png and icon-512.png as minimal, valid,
// dependency-free PNGs (AC-5 PWA installability requires these two files to
// exist and match public/manifest.json's icons array). No canvas/sharp/etc —
// just a hand-rolled RGBA -> PNG encoder using Node's built-in zlib for the
// IDAT deflate stream and a small CRC32 implementation for chunk checksums.
//
// Design: solid indigo background (matches manifest.json theme_color
// #4f46e5) with a centered white circle — simple, brand-consistent, and
// safe as a "maskable" icon (the circle sits well within the ~80% safe zone
// maskable icons are cropped to).
//
// Re-run with: node scripts/generate-pwa-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/icons");

const BG = [0x4f, 0x46, 0xe5]; // #4f46e5
const FG = [0xff, 0xff, 0xff]; // white circle

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function buildPng(size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;

  // Raw scanlines: each row prefixed with a filter-type byte (0 = None),
  // followed by `size` RGBA pixels (4 bytes each).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inCircle = dx * dx + dy * dy <= r * r;
      const [rr, gg, bb] = inCircle ? FG : BG;
      const off = rowStart + 1 + x * 4;
      raw[off] = rr;
      raw[off + 1] = gg;
      raw[off + 2] = bb;
      raw[off + 3] = 255;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  const idat = chunk("IDAT", deflateSync(raw));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

for (const size of [192, 512]) {
  const png = buildPng(size);
  const outPath = path.join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}
