import { Notice } from "obsidian";
import { CompressError } from "./compressor";
import { R2UploadError } from "./r2-client";

export const NOTICE_SUCCESS_MS = 3000;
export const NOTICE_DEFAULT_MS = 5000;

export function showSuccessNotice(message: string): Notice {
	return new Notice(message, NOTICE_SUCCESS_MS);
}

export function showNotice(message: string): Notice {
	return new Notice(message, NOTICE_DEFAULT_MS);
}

export function formatProgressTag(progress?: { current: number; total: number }): string {
	return progress && progress.total > 1 ? ` [${progress.current}/${progress.total}]` : "";
}

export function getR2ConnectionErrorMessage(error: unknown): string {
	if (error instanceof R2UploadError) {
		return error.message;
	}
	return "R2 連線失敗，請檢查網路或稍後再試";
}

export function getTinypngErrorMessage(error: unknown): string {
	if (error instanceof CompressError) {
		return error.message;
	}
	return "TinyPNG 驗證失敗，請稍後再試";
}

export function getUploadErrorMessage(error: unknown): string {
	if (error instanceof R2UploadError) {
		if (error.statusCode === 401 || error.statusCode === 403) {
			return "R2 憑證錯誤或權限不足，請檢查設定";
		}
		if (error.statusCode === 404) {
			return "找不到指定的 Bucket，請檢查 Bucket Name";
		}
		if (error.statusCode === 429) {
			return "請求過於頻繁，請稍後再試";
		}
		if (error.statusCode >= 500) {
			return "R2 服務暫時異常，請稍後再試";
		}
	}
	return "上傳失敗，請稍後再試";
}
