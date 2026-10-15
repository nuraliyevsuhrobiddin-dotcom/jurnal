// Leave space for multipart metadata below the hosting request-body limit.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_BODY_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;
