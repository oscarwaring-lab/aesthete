import 'server-only'

/**
 * Strip secrets out of anything on its way to a log.
 *
 * Every useful diagnostic in an OAuth integration is also the most dangerous
 * thing to print: the request URL carries `access_token` and `client_secret` in
 * its query string, and Meta's own error bodies echo parameters back. Logs get
 * shipped to Vercel, tailed in terminals and pasted into issues, so a token in
 * a log is a token in far more places than the database ever was.
 *
 * This is applied at the *logging boundary* rather than trusted to discipline
 * at each call site. The patterns cover the query-string form
 * (`access_token=...`) and the JSON form (`"access_token": "..."`).
 */

const SECRET_KEYS = [
  'access_token',
  'client_secret',
  'code',
  'refresh_token',
  'appsecret_proof',
]

const PATTERNS: RegExp[] = [
  // query string / form encoded: access_token=abc123
  new RegExp(`\\b(${SECRET_KEYS.join('|')})=([^&\\s"']+)`, 'gi'),
  // JSON: "access_token": "abc123"
  new RegExp(`("(?:${SECRET_KEYS.join('|')})"\\s*:\\s*")([^"]*)(")`, 'gi'),
]

export function redactSecrets(input: string): string {
  let out = input
  out = out.replace(PATTERNS[0], (_m, key) => `${key}=[REDACTED]`)
  out = out.replace(PATTERNS[1], (_m, head, _val, tail) => `${head}[REDACTED]${tail}`)
  return out
}

/**
 * Redact an unknown thrown value for logging. Errors keep their message and
 * lose nothing else useful; anything else is stringified first.
 */
export function redactError(err: unknown): string {
  if (err instanceof Error) return redactSecrets(err.message)
  return redactSecrets(String(err))
}
