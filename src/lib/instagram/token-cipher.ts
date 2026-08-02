import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Authenticated encryption for Instagram access tokens at rest.
 *
 * A long-lived Instagram token is a 60-day bearer credential for a creator's
 * account. It is the single most sensitive value this codebase stores, so it
 * never touches the database in plaintext and never leaves the server.
 *
 * AES-256-GCM. GCM rather than CBC because we want tampering to be *detected*:
 * a modified ciphertext fails the auth-tag check and throws, instead of
 * decrypting to garbage that we would then send to Instagram.
 *
 * The `aad` argument binds a ciphertext to the row it belongs to (we pass the
 * ig_user_id). Copying a token blob from one row to another therefore fails to
 * decrypt rather than silently granting access to the wrong account.
 *
 * `server-only` above makes importing this from a Client Component a build
 * error — the key must never be reachable from the browser bundle.
 */

const KEY_ENV = 'INSTAGRAM_TOKEN_ENCRYPTION_KEY'
const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12 // 96-bit nonce, the size GCM is specified for
const VERSION = 'v1'

/**
 * Read and validate the key. Deliberately NOT memoised at module scope: a
 * module-level throw would take down every route that transitively imports
 * this, including ones that never encrypt anything. Failing at call time keeps
 * a misconfigured key a local, legible error.
 */
function getKey(): Buffer {
  const raw = process.env[KEY_ENV]
  if (!raw) {
    throw new Error(
      `${KEY_ENV} is not set. Generate one with: openssl rand -base64 32`
    )
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${KEY_ENV} must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        'Generate one with: openssl rand -base64 32'
    )
  }
  return key
}

/** True when a usable key is configured. Never reveals the key itself. */
export function hasEncryptionKey(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}

/**
 * Encrypt a token. Returns "v1.<iv>.<tag>.<ciphertext>", all base64url.
 *
 * A fresh random IV per call is what makes GCM safe here — reusing an IV under
 * the same key is the one mistake that breaks the mode outright, so the IV is
 * generated inside this function and is never a parameter.
 */
export function encryptToken(plaintext: string, aad: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  cipher.setAAD(Buffer.from(aad, 'utf8'))

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return [
    VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

/**
 * Decrypt a token produced by `encryptToken` with the same `aad`.
 *
 * Throws on a wrong key, a tampered blob, a mismatched aad or a malformed
 * string. Callers should treat any throw as "this connection is unusable, ask
 * the creator to reconnect" — never as a reason to fall back to an unencrypted
 * value, because there is no unencrypted value to fall back to.
 */
export function decryptToken(encoded: string, aad: string): string {
  const parts = encoded.split('.')
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted token: expected 4 dot-separated parts.')
  }

  const [version, ivB64, tagB64, ciphertextB64] = parts
  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted token version: ${version}`)
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, 'base64url')
  )
  decipher.setAAD(Buffer.from(aad, 'utf8'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Constant-time string comparison, for the OAuth `state` check.
 *
 * Lives here because it is the same class of concern and the same import: a
 * `===` on a CSRF token leaks its prefix through timing. Length is compared
 * first (and non-constant-time), which is fine — the length of a random state
 * is not a secret.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
