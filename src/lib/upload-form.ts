import { boundedBody } from './bounded-body';
import { MAX_UPLOAD_BODY_BYTES } from './upload-limits';

export class UploadFormError extends Error {}

/** Enforce the limit while reading, including requests without Content-Length. */
export async function readUploadForm(request: Request): Promise<FormData> {
  const bytes = await boundedBody(request, MAX_UPLOAD_BODY_BYTES);
  try {
    return await new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
      body: Buffer.from(bytes),
    }).formData();
  } catch {
    throw new UploadFormError('Faylni o‘qib bo‘lmadi. Faylni qayta tanlab yuboring.');
  }
}
