import 'server-only'
import { createHmac } from 'crypto'
import QRCode from 'qrcode'

const APP_NAME = 'Painel Coral'
// Dígitos do código e janela de tolerância (passos de 30s antes/depois)
const DIGITS = 6
const STEP = 30
const WINDOW = 1

// Alfabeto base32 (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(s: string): Buffer {
  const str = s.toUpperCase().replace(/=+$/, '')
  let bits = 0, value = 0
  const bytes: number[] = []
  for (const ch of str) {
    const idx = BASE32_CHARS.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function hotp(secret: string, counter: bigint): string {
  const key = base32Decode(secret)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(counter)
  const hmac = createHmac('sha1', key).update(msg).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff)
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0')
}

export function gerarSecret(): string {
  // 20 bytes = 160 bits — padrão RFC 6238
  return base32Encode(Buffer.from(crypto.getRandomValues(new Uint8Array(20))))
}

export function verificarCodigo(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, '')
  if (normalized.length !== DIGITS) return false
  const t = BigInt(Math.floor(Date.now() / 1000 / STEP))
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (hotp(secret, t + BigInt(i)) === normalized) return true
  }
  return false
}

export async function gerarQrDataUrl(email: string, secret: string): Promise<string> {
  const uri = `otpauth://totp/${encodeURIComponent(APP_NAME)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(APP_NAME)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`
  return QRCode.toDataURL(uri, { width: 200, margin: 2 })
}
