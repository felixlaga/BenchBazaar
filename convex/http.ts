import {
  signedReceiptEnvelopeSchema,
  verifySignedReceipt,
} from '@benchbazaar/protocol'
import { httpRouter } from 'convex/server'

import { internal } from './_generated/api'
import { httpAction } from './_generated/server'

const http = httpRouter()
const MAX_RECEIPT_BYTES = 64 * 1_024

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  requestId: string,
) {
  return new Response(JSON.stringify({ ...body, requestId }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

function errorCode(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'code' in error.data &&
    typeof error.data.code === 'string'
  ) {
    return error.data.code
  }
  return 'INGESTION_REJECTED'
}

http.route({
  path: '/v1/receipts',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const startedAt = Date.now()
    const requestId = crypto.randomUUID()
    let runnerPublicId: string | undefined
    let receiptPublicId: string | undefined
    let outcome: 'accepted' | 'rejected' = 'rejected'
    let safeErrorCode: string | undefined

    try {
      const contentType = request.headers.get('content-type') ?? ''
      if (!contentType.toLowerCase().startsWith('application/json')) {
        safeErrorCode = 'CONTENT_TYPE_REQUIRED'
        return jsonResponse(415, { ok: false, code: safeErrorCode }, requestId)
      }
      const declaredLength = Number(request.headers.get('content-length') ?? 0)
      if (declaredLength > MAX_RECEIPT_BYTES) {
        safeErrorCode = 'PAYLOAD_TOO_LARGE'
        return jsonResponse(413, { ok: false, code: safeErrorCode }, requestId)
      }
      const rawBody = await request.text()
      if (new TextEncoder().encode(rawBody).byteLength > MAX_RECEIPT_BYTES) {
        safeErrorCode = 'PAYLOAD_TOO_LARGE'
        return jsonResponse(413, { ok: false, code: safeErrorCode }, requestId)
      }

      let json: unknown
      try {
        json = JSON.parse(rawBody)
      } catch {
        safeErrorCode = 'INVALID_JSON'
        return jsonResponse(400, { ok: false, code: safeErrorCode }, requestId)
      }
      const parsed = signedReceiptEnvelopeSchema.safeParse(json)
      if (!parsed.success) {
        safeErrorCode = 'INVALID_RECEIPT'
        return jsonResponse(400, { ok: false, code: safeErrorCode }, requestId)
      }
      runnerPublicId = parsed.data.payload.runnerId
      receiptPublicId = parsed.data.payload.receiptId
      const runner = await ctx.runQuery(internal.runners.keyForIngestion, {
        publicId: runnerPublicId,
      })
      if (!runner) {
        safeErrorCode = 'RUNNER_NOT_ACTIVE'
        return jsonResponse(403, { ok: false, code: safeErrorCode }, requestId)
      }
      const signatureValid = await verifySignedReceipt(
        parsed.data,
        runner.publicKeySpki,
      )
      if (!signatureValid) {
        safeErrorCode = 'SIGNATURE_INVALID'
        return jsonResponse(401, { ok: false, code: safeErrorCode }, requestId)
      }
      const result = await ctx.runMutation(internal.runners.ingestVerified, {
        requestId,
        runnerPublicId,
        signature: parsed.data.signature,
        receipt: parsed.data.payload,
      })
      outcome = 'accepted'
      return jsonResponse(
        201,
        { ok: true, receiptId: result.publicId },
        requestId,
      )
    } catch (error) {
      safeErrorCode = errorCode(error)
      const status =
        safeErrorCode === 'RATE_LIMITED'
          ? 429
          : safeErrorCode === 'REPLAY_DETECTED' ||
              safeErrorCode === 'RECEIPT_ID_EXISTS'
            ? 409
            : safeErrorCode === 'RUNNER_SCOPE_MISMATCH'
              ? 403
              : 400
      return jsonResponse(status, { ok: false, code: safeErrorCode }, requestId)
    } finally {
      try {
        await ctx.runMutation(internal.runners.logIngestionAttempt, {
          requestId,
          outcome,
          ...(runnerPublicId ? { runnerPublicId } : {}),
          ...(receiptPublicId ? { receiptPublicId } : {}),
          ...(safeErrorCode ? { errorCode: safeErrorCode } : {}),
          durationMs: Date.now() - startedAt,
        })
      } catch {
        // Observability must never alter the ingestion response. Convex still
        // records the action failure without retaining the request body.
      }
    }
  }),
})

export default http
