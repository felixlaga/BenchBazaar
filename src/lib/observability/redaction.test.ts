import { describe, expect, it, vi } from 'vitest'

import {
  logOperationalEvent,
  redactUnknown,
  serializeOperationalEvent,
} from './redaction'

describe('operational logging redaction', () => {
  it('redacts sensitive keys and secret-shaped strings recursively', () => {
    const result = redactUnknown({
      requestId: 'request-1',
      authorization: 'Bearer should-never-survive',
      nested: {
        providerApiKey: 'sk_live_abcdefghijklmnopqrstuvwxyz',
        safeErrorCode: 'TIMEOUT',
      },
      note: 'Bearer abcdefghijklmnop',
    })
    expect(JSON.stringify(result)).not.toContain('should-never-survive')
    expect(JSON.stringify(result)).not.toContain('sk_live_')
    expect(JSON.stringify(result)).not.toContain('abcdefghijklmnop')
    expect(result).toMatchObject({
      requestId: 'request-1',
      authorization: '[REDACTED]',
      nested: {
        providerApiKey: '[REDACTED]',
        safeErrorCode: 'TIMEOUT',
      },
    })
  })

  it('logs only the bounded operational event contract', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const serialized = serializeOperationalEvent({
      event: 'receipt.ingest',
      requestId: 'request-2',
      status: 'error',
      errorCode: 'SIGNATURE_INVALID',
      durationMs: 12,
      method: 'POST',
      route: '/v1/receipts',
    })
    expect(serialized).toContain('SIGNATURE_INVALID')
    expect(serialized).not.toContain('receipt?token=')
    logOperationalEvent({
      event: 'receipt.ingest',
      requestId: 'request-2',
      status: 'error',
      errorCode: 'SIGNATURE_INVALID',
    })
    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })
})
