import { requestUrl } from "obsidian";
import { AwsV4Signer } from "aws4fetch";
import { R2_ENDPOINT_TEMPLATE } from "./constants";
import type { R2UploaderSettings } from "./types";

/**
 * R2 上傳失敗時拋出的錯誤。
 */
export class R2UploadError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
	) {
		super(message);
		this.name = "R2UploadError";
	}
}

/**
 * 將 Web API Headers 物件轉為 Record<string, string>。
 * aws4fetch 回傳 Headers 物件，但 Obsidian requestUrl 需要普通物件。
 */
function headersToRecord(headers: Headers): Record<string, string> {
	const record: Record<string, string> = {};

	headers.forEach((value, key) => {
		record[key] = value;
	});

	return record;
}

/**
 * 取得 R2 S3 API 的 endpoint URL。
 */
function getR2Endpoint(accountId: string): string {
	return R2_ENDPOINT_TEMPLATE.replace("{accountId}", accountId);
}

/**
 * 發送已簽名的 S3 請求到 R2。
 *
 * 流程：aws4fetch 計算簽名 headers → requestUrl() 實際發送（繞過 CORS）。
 */
async function signedR2Request(options: {
	method: string;
	url: string;
	accessKeyId: string;
	secretAccessKey: string;
	body?: ArrayBuffer;
	headers?: Record<string, string>;
}): Promise<{ status: number; text: string; headers: Record<string, string> }> {
	const signer = new AwsV4Signer({
		method: options.method,
		url: options.url,
		accessKeyId: options.accessKeyId,
		secretAccessKey: options.secretAccessKey,
		headers: options.headers,
		body: options.body,
	});

	const signed = await signer.sign();

	const response = await requestUrl({
		url: signed.url.toString(),
		method: signed.method,
		headers: headersToRecord(signed.headers),
		body: options.body,
		throw: false,
	});

	return {
		status: response.status,
		text: response.text,
		headers: response.headers,
	};
}

/**
 * 上傳檔案到 Cloudflare R2。
 *
 * @param file - 檔案的 ArrayBuffer
 * @param key - R2 中的 object key（檔名），例如 "screenshot-20260403143022.png"
 * @param contentType - 檔案的 MIME type
 * @param settings - Plugin 設定
 * @returns 上傳成功後的公開 URL
 * @throws {R2UploadError} 上傳失敗時
 */
export async function uploadToR2(
	file: ArrayBuffer,
	key: string,
	contentType: string,
	settings: R2UploaderSettings,
): Promise<string> {
	const endpoint = getR2Endpoint(settings.r2AccountId);
	const url = `${endpoint}/${settings.r2BucketName}/${key}`;

	const response = await signedR2Request({
		method: "PUT",
		url,
		accessKeyId: settings.r2AccessKeyId,
		secretAccessKey: settings.r2SecretAccessKey,
		body: file,
		headers: { "Content-Type": contentType },
	});

	if (response.status !== 200) {
		throw new R2UploadError(
			`R2 upload failed (${response.status}): ${response.text}`,
			response.status,
		);
	}

	const publicUrl = settings.r2PublicUrl.replace(/\/+$/, "");
	return `${publicUrl}/${key}`;
}

/**
 * 測試 R2 連線是否正常。
 * 使用 HEAD Bucket 請求驗證 credentials 和 bucket 是否存在。
 *
 * @throws {R2UploadError} 連線失敗時
 */
export async function testR2Connection(
	settings: R2UploaderSettings,
): Promise<void> {
	const endpoint = getR2Endpoint(settings.r2AccountId);
	const url = `${endpoint}/${settings.r2BucketName}`;

	const response = await signedR2Request({
		method: "HEAD",
		url,
		accessKeyId: settings.r2AccessKeyId,
		secretAccessKey: settings.r2SecretAccessKey,
	});

	if (response.status === 403) {
		throw new R2UploadError("API Token 權限不足，請確認 Token 有 Object Read & Write 權限", 403);
	}

	if (response.status === 404) {
		throw new R2UploadError(`Bucket "${settings.r2BucketName}" 不存在`, 404);
	}

	if (response.status !== 200) {
		throw new R2UploadError(`R2 連線失敗 (${response.status})`, response.status);
	}
}
