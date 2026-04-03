/**
 * Plugin 設定，儲存在 Obsidian 的 data.json 中。
 */
export interface R2UploaderSettings {
	// Cloudflare R2
	r2AccountId: string;
	r2AccessKeyId: string;
	r2SecretAccessKey: string;
	r2BucketName: string;
	r2PublicUrl: string;

	// TinyPNG
	tinypngApiKey: string;

	// 行為設定
	autoUploadOnPaste: boolean;
	compressBeforeUpload: boolean;
}

export const DEFAULT_SETTINGS: R2UploaderSettings = {
	r2AccountId: "",
	r2AccessKeyId: "",
	r2SecretAccessKey: "",
	r2BucketName: "",
	r2PublicUrl: "",
	tinypngApiKey: "",
	autoUploadOnPaste: true,
	compressBeforeUpload: true,
};

/**
 * 上傳結果。
 */
export interface UploadResult {
	success: boolean;
	/** 上傳成功時的公開 URL */
	url?: string;
	/** 上傳失敗時的錯誤訊息 */
	error?: string;
	/** 原始檔名 */
	fileName: string;
}

/**
 * 壓縮結果。
 */
export interface CompressResult {
	/** 壓縮後的檔案 ArrayBuffer */
	data: ArrayBuffer;
	/** 是否有進行壓縮（false = 用原檔） */
	compressed: boolean;
	/** 原始大小 */
	originalSize: number;
	/** 壓縮後大小 */
	compressedSize: number;
}

/**
 * TinyPNG API 的壓縮回應。
 */
export interface TinypngShrinkResponse {
	input: { size: number; type: string };
	output: { size: number; type: string; ratio: number };
}
