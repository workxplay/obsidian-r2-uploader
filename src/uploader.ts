import { Notice } from "obsidian";
import { uploadToR2, R2UploadError } from "./r2-client";
import { compressImage, isCompressible, CompressError } from "./compressor";
import type { R2UploaderSettings, UploadResult } from "./types";

/**
 * 清理上傳路徑前綴。
 * 移除前後 /、連續 /、不允許的字元。
 */
export function sanitizeUploadPath(path: string): string {
	return path
		.replace(/[^a-zA-Z0-9\-_./]/g, "")
		.replace(/\/{2,}/g, "/")
		.replace(/^\/|\/$/g, "");
}

/**
 * 將檔名清理為安全的 URL 路徑。
 * 移除特殊字元、空格轉 -、轉小寫。
 */
export function sanitizeFileName(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9\-_.]/g, "")
		.replace(/-{2,}/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * 產生上傳用的檔名。
 * 格式：{sanitized-original-name}-{YYYYMMDDHHmmss}.{ext}
 */
export function generateFileName(originalName: string): string {
	const now = new Date();
	const timestamp =
		now.getFullYear().toString() +
		(now.getMonth() + 1).toString().padStart(2, "0") +
		now.getDate().toString().padStart(2, "0") +
		now.getHours().toString().padStart(2, "0") +
		now.getMinutes().toString().padStart(2, "0") +
		now.getSeconds().toString().padStart(2, "0");

	const lastDotIndex = originalName.lastIndexOf(".");
	if (lastDotIndex === -1) {
		const sanitized = sanitizeFileName(originalName) || "file";
		return `${sanitized}-${timestamp}`;
	}

	const nameWithoutExt = originalName.substring(0, lastDotIndex);
	const ext = originalName.substring(lastDotIndex + 1).toLowerCase();
	const sanitized = sanitizeFileName(nameWithoutExt) || "file";

	return `${sanitized}-${timestamp}.${ext}`;
}

/**
 * 判斷 MIME type 是否為圖片。
 */
export function isImageType(mimeType: string): boolean {
	return mimeType.startsWith("image/");
}

/**
 * 產生佔位文字，格式：![Uploading file... _id]()
 * 空括號避免 Obsidian 嘗試載入不存在的檔案。
 */
export function createPlaceholder(): string {
	const id = `${Date.now().toString(36)}${Math.random()
		.toString(36)
		.substring(2, 6)}`;

	return `![Uploading file... _${id}]()`;
}

/**
 * 產生最終的 Markdown 連結。
 * 圖片：![](url)
 * 非圖片：[filename](url)
 */
export function createMarkdownLink(
	url: string,
	fileName: string,
	isImage: boolean,
): string {
	if (isImage) {
		return `![](${url})`;
	}
	return `[${fileName}](${url})`;
}

/**
 * 處理單一檔案的完整上傳流程：壓縮（如適用）→ 上傳到 R2。
 *
 * @param file - 要上傳的檔案
 * @param settings - Plugin 設定
 * @returns 上傳結果
 */
export async function processFile(
	file: File,
	settings: R2UploaderSettings,
): Promise<UploadResult> {
	const baseName = generateFileName(file.name);
	const uploadPath = sanitizeUploadPath(settings.r2UploadPath);
	const fileName = uploadPath ? `${uploadPath}/${baseName}` : baseName;
	const mimeType = file.type || "application/octet-stream";

	let fileData: ArrayBuffer;

	try {
		fileData = await file.arrayBuffer();
	} catch {
		return {
			success: false,
			error: `無法讀取檔案 "${file.name}"`,
			fileName: file.name,
		};
	}

	// 判斷是否需要壓縮
	const shouldCompress =
		settings.compressBeforeUpload &&
		settings.tinypngApiKey &&
		isCompressible(mimeType);

	if (shouldCompress) {
		try {
			const compressed = await compressImage(fileData, settings.tinypngApiKey);
			fileData = compressed.data;

			const savedPercent = Math.round(
				(1 - compressed.compressedSize / compressed.originalSize) * 100,
			);
			new Notice(
				`壓縮完成：${file.name}（節省 ${savedPercent}%）`,
				3000,
			);
		} catch (err) {
			// 壓縮失敗不中斷流程，用原檔繼續上傳
			if (err instanceof CompressError) {
				new Notice(`壓縮失敗，使用原檔上傳：${err.message}`, 5000);
			}
		}
	}

	// 上傳到 R2
	try {
		const url = await uploadToR2(fileData, fileName, mimeType, settings);
		return { success: true, url, fileName: file.name };
	} catch (err) {
		const message =
			err instanceof R2UploadError
				? err.message
				: `上傳失敗：${String(err)}`;
		return { success: false, error: message, fileName: file.name };
	}
}

/**
 * 檢查 R2 必填設定是否都已填寫。
 */
export function isR2ConfigComplete(settings: R2UploaderSettings): boolean {
	return !!(
		settings.r2AccountId &&
		settings.r2AccessKeyId &&
		settings.r2SecretAccessKey &&
		settings.r2BucketName &&
		settings.r2PublicUrl
	);
}
