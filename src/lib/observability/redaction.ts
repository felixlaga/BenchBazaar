const sensitiveKey =
  /authorization|cookie|secret|token|password|api[-_]?key|private[-_]?key|prompt|answer|sealed|body|response/i

export type OperationalEvent = {
  event: string
  requestId: string
  status: 'ok' | 'error'
  durationMs?: number
  actorId?: string
  targetId?: string
  errorCode?: string
  method?: string
  route?: string
  counts?: Record<string, number>
}

export function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? '[REDACTED]' : redactUnknown(item),
      ]),
    )
  }
  if (typeof value === 'string') {
    return value
      .replace(/\b(?:sk|pk)_[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_KEY]')
      .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/gi, 'Bearer [REDACTED]')
  }
  return value
}

export function serializeOperationalEvent(event: OperationalEvent) {
  return JSON.stringify(redactUnknown(event))
}

export function logOperationalEvent(event: OperationalEvent) {
  const serialized = serializeOperationalEvent(event)
  if (event.status === 'error') console.error(serialized)
  else console.info(serialized)
}
