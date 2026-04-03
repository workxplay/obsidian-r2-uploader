/** TinyPNG API endpoint */
export const TINYPNG_API_URL = "https://api.tinify.com/shrink";

/** TinyPNG 支援壓縮的 MIME types */
export const COMPRESSIBLE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/avif",
]);

/** 所有圖片 MIME types（含不可壓縮的 GIF 等） */
export const IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/avif",
	"image/gif",
	"image/svg+xml",
	"image/bmp",
	"image/tiff",
]);

/**
 * Cloudflare R2 S3 API endpoint 模板。
 * 用法：R2_ENDPOINT_TEMPLATE.replace("{accountId}", accountId)
 */
export const R2_ENDPOINT_TEMPLATE =
	"https://{accountId}.r2.cloudflarestorage.com";
