// HTTP / API response size caps
export const MAX_HTTP_RESPONSE_SIZE = 10 * 1024 * 1024;  // 10 MB — general API responses
export const MAX_API_RESPONSE_SIZE = 1 * 1024 * 1024;    // 1 MB — installation finalization endpoint

// File size limits
export const MAX_MOD_SIZE = 5 * 1024 * 1024 * 1024;      // 5 GB
export const MIN_ARCHIVE_SIZE = 1024;                     // 1 KB
export const MAX_ARCHIVE_READ_SIZE = 100 * 1024 * 1024;  // 100 MB — max archive loaded into memory

// Timeouts
export const HTTP_REQUEST_TIMEOUT_MS = 30 * 1000;        // 30 s — API requests
export const EXTRACTION_TIMEOUT_MS = 30 * 60 * 1000;     // 30 minutes
