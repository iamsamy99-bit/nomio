const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// CRC32 table
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[i] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function createIcon(size) {
  const BG = [2, 8, 23]       // #020817
  const FG = [6, 182, 212]    // #06B6D4 cyan
  const GLOW = [3, 47, 64]    // subtle cyan tint for bg

  const pixels = new Uint8Array(size * size * 3)

  // Background: dark with a very subtle radial gradient
  const cx = size / 2, cy = size / 2, maxDist = size * 0.7
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist
      const t = Math.min(1, d)
      const idx = (y * size + x) * 3
      pixels[idx]     = Math.round(BG[0] + (GLOW[0] - BG[0]) * (1 - t))
      pixels[idx + 1] = Math.round(BG[1] + (GLOW[1] - BG[1]) * (1 - t))
      pixels[idx + 2] = Math.round(BG[2] + (GLOW[2] - BG[2]) * (1 - t))
    }
  }

  // Rounded rect border (subtle cyan glow ring)
  const borderR = Math.floor(size * 0.42)
  const borderW = Math.max(1, Math.floor(size * 0.025))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= borderR - borderW && dist <= borderR) {
        const alpha = 1 - Math.abs(dist - (borderR - borderW / 2)) / (borderW / 2)
        const a = Math.max(0, Math.min(1, alpha)) * 0.3
        const idx = (y * size + x) * 3
        pixels[idx]     = Math.round(pixels[idx]     * (1 - a) + FG[0] * a)
        pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - a) + FG[1] * a)
        pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - a) + FG[2] * a)
      }
    }
  }

  function blend(x, y, alpha) {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const idx = (Math.round(y) * size + Math.round(x)) * 3
    if (idx < 0 || idx + 2 >= pixels.length) return
    const a = Math.min(1, alpha)
    pixels[idx]     = Math.round(pixels[idx]     * (1 - a) + FG[0] * a)
    pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - a) + FG[1] * a)
    pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - a) + FG[2] * a)
  }

  // Draw thick "N" with anti-aliased thick strokes
  const pad  = size * 0.22
  const top  = size * 0.18
  const bot  = size * 0.82
  const lx   = pad                // left bar x-center
  const rx   = size - pad         // right bar x-center
  const barW = size * 0.11        // half-width of bars

  // Helper: fill a thick stroke with soft edges
  function thickLine(x0, y0, x1, y1, halfW) {
    const len = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
    const steps = Math.ceil(len * 2)
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const mx = x0 + (x1 - x0) * t
      const my = y0 + (y1 - y0) * t
      const spread = Math.ceil(halfW + 2)
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          const alpha = Math.max(0, 1 - (dist - halfW + 1) / 1.5)
          if (alpha > 0) blend(mx + dx, my + dy, alpha)
        }
      }
    }
  }

  // Left vertical bar
  thickLine(lx, top, lx, bot, barW)
  // Right vertical bar
  thickLine(rx, top, rx, bot, barW)
  // Diagonal top-left to bottom-right
  thickLine(lx, top, rx, bot, barW)

  // Build PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth 8, color type RGB

  const rowBytes = size * 3
  const raw = Buffer.alloc(size * (rowBytes + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 3
      const d = y * (rowBytes + 1) + 1 + x * 3
      raw[d] = pixels[s]; raw[d + 1] = pixels[s + 1]; raw[d + 2] = pixels[s + 2]
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const pub = path.join(__dirname, '..', 'public')
fs.writeFileSync(path.join(pub, 'icon-192.png'), createIcon(192))
fs.writeFileSync(path.join(pub, 'icon-512.png'), createIcon(512))
console.log('PWA icons generated: public/icon-192.png, public/icon-512.png')
