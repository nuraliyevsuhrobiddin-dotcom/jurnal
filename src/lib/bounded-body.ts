export class BodyLimitError extends Error {}

export async function boundedBody(request: Pick<Request, 'headers' | 'body'>, maximum: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') || 0) > maximum) throw new BodyLimitError('Request too large');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new BodyLimitError('Request too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
