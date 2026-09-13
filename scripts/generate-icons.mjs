import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

function crc32(buffer) {
  let crc = ~0
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function paint(x, y, size) {
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const dx = x - cx
  const dy = y - cy
  const radius = size * 0.42
  const inner = size * 0.22
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > radius) return [28, 23, 18, 255]
  if (dist > radius - size * 0.06) return [194, 65, 12, 255]
  const pillar = Math.abs(dx) < size * 0.07 && dy > -inner && dy < inner * 1.15
  const lintel = Math.abs(dy + inner * 0.7) < size * 0.07 && Math.abs(dx) < inner
  if (pillar || lintel) return [255, 250, 242, 255]
  return [194, 65, 12, 255]
}

function createPng(size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size)
      const i = y * stride + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png)
}

for (const size of [16, 32, 48, 128]) {
  createPng(size)
}

console.log('Wrote icons to', outDir)
