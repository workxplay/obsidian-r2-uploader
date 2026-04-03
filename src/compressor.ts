import { requestUrl } from "obsidian";
import { TINYPNG_API_URL, COMPRESSIBLE_TYPES } from "./constants";
import type { CompressResult, TinypngShrinkResponse } from "./types";

/**
 * TinyPNG 壓縮失敗時拋出的錯誤。
 */
export class CompressError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = "CompressError";
	}
}

/**
 * 產生 TinyPNG API 的 Basic Auth header。
 */
function getTinypngAuthHeader(apiKey: string): string {
	return "Basic " + btoa("api:" + apiKey);
}

/**
 * 判斷檔案是否可以被 TinyPNG 壓縮。
 * TinyPNG 支援：JPEG、PNG、WebP、AVIF（不支援 GIF）。
 */
export function isCompressible(mimeType: string): boolean {
	return COMPRESSIBLE_TYPES.has(mimeType);
}

/**
 * 使用 TinyPNG API 壓縮圖片。
 *
 * 流程：
 * 1. POST 圖片到 TinyPNG → 取得壓縮結果的 Location URL
 * 2. GET 下載壓縮後的圖片
 *
 * @param imageData - 原始圖片的 ArrayBuffer
 * @param apiKey - TinyPNG API key
 * @returns 壓縮結果（包含壓縮後的 ArrayBuffer 和大小資訊）
 * @throws {CompressError} 壓縮失敗時
 */
export async function compressImage(
	imageData: ArrayBuffer,
	apiKey: string,
): Promise<CompressResult> {
	const authHeader = getTinypngAuthHeader(apiKey);

	// Step 1: 上傳圖片到 TinyPNG 進行壓縮
	const shrinkResponse = await requestUrl({
		url: TINYPNG_API_URL,
		method: "POST",
		headers: { Authorization: authHeader },
		body: imageData,
		throw: false,
	});

	if (shrinkResponse.status === 401) {
		throw new CompressError("TinyPNG API Key 無效", 401);
	}
	if (shrinkResponse.status === 429) {
		throw new CompressError("TinyPNG 本月免費額度已用完（500 次/月）", 429);
	}
	if (shrinkResponse.status !== 201) {
		throw new CompressError(
			`TinyPNG 壓縮失敗 (${shrinkResponse.status})`,
			shrinkResponse.status,
		);
	}

	// 從 response headers 取得壓縮結果的下載 URL
	const outputUrl = shrinkResponse.headers["location"];
	if (!outputUrl) {
		throw new CompressError("TinyPNG 回應缺少 Location header");
	}

	const shrinkData = shrinkResponse.json as TinypngShrinkResponse;

	// Step 2: 下載壓縮後的圖片
	const downloadResponse = await requestUrl({
		url: outputUrl,
		method: "GET",
		headers: { Authorization: authHeader },
		throw: false,
	});

	if (downloadResponse.status !== 200) {
		throw new CompressError(
			`TinyPNG 下載壓縮結果失敗 (${downloadResponse.status})`,
			downloadResponse.status,
		);
	}

	return {
		data: downloadResponse.arrayBuffer,
		compressed: true,
		originalSize: shrinkData.input.size,
		compressedSize: shrinkData.output.size,
	};
}

/**
 * 測試 TinyPNG API Key 是否有效。
 * 送一個最小的 POST 請求，根據 status code 判斷。
 *
 * @throws {CompressError} API Key 無效時
 */
export async function testTinypngApiKey(apiKey: string): Promise<void> {
	const authHeader = getTinypngAuthHeader(apiKey);

	const response = await requestUrl({
		url: TINYPNG_API_URL,
		method: "POST",
		headers: { Authorization: authHeader },
		body: new ArrayBuffer(0),
		throw: false,
	});

	// 400 = key 有效但 body 無效（這是預期的，因為我們送了空 body）
	// 401 = key 無效
	if (response.status === 401) {
		throw new CompressError("TinyPNG API Key 無效", 401);
	}
	// 400 代表 key 有效，只是沒有送圖片
	if (response.status !== 400) {
		throw new CompressError(
			`TinyPNG 驗證失敗，非預期的狀態碼 (${response.status})`,
			response.status,
		);
	}
}
