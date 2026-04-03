import { Editor, Notice, Plugin } from "obsidian";
import { R2UploaderSettingTab } from "./settings";
import {
	processFile,
	isR2ConfigComplete,
	isImageType,
	createPlaceholder,
	createMarkdownLink,
} from "./uploader";
import { DEFAULT_SETTINGS } from "./types";
import type { R2UploaderSettings } from "./types";

export default class R2UploaderPlugin extends Plugin {
	settings: R2UploaderSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		// 註冊 Settings Tab
		this.addSettingTab(new R2UploaderSettingTab(this.app, this));

		// 註冊 editor-paste 事件
		this.registerEvent(
			this.app.workspace.on(
				"editor-paste",
				(evt: ClipboardEvent, editor: Editor) => {
					this.handleFileEvent(evt, evt.clipboardData?.files, editor);
				},
			),
		);

		// 註冊 editor-drop 事件
		this.registerEvent(
			this.app.workspace.on(
				"editor-drop",
				(evt: DragEvent, editor: Editor) => {
					this.handleFileEvent(evt, evt.dataTransfer?.files, editor);
				},
			),
		);

		// 註冊手動上傳指令
		this.addCommand({
			id: "upload-clipboard-files",
			name: "Upload clipboard files to cloudflare r2",
			editorCallback: (editor: Editor) => {
				new Notice("請先複製檔案再貼上");
			},
		});
	}

	/**
	 * 處理多個檔案的上傳流程。
	 * 對每個檔案：插入佔位文字 → 壓縮（如適用）→ 上傳 → 替換佔位文字。
	 */
	private handleFileEvent(
		evt: Event,
		files: FileList | null | undefined,
		editor: Editor,
	): void {
		if (evt.defaultPrevented) return;
		if (!this.settings.autoUploadOnPaste) return;
		if (!files || files.length === 0) return;

		if (!isR2ConfigComplete(this.settings)) {
			new Notice("請先完成 R2 連線設定"); // eslint-disable-line obsidianmd/ui/sentence-case
			return;
		}

		evt.preventDefault();
		void this.handleFiles(Array.from(files), editor);
	}

	private async handleFiles(files: File[], editor: Editor): Promise<void> {
		const entries: { placeholder: string; file: File; isImage: boolean }[] = [];

		// Step 1: 為每個檔案插入佔位文字
		for (const file of files) {
			const isImage = isImageType(file.type);
			const placeholder = createPlaceholder();
			entries.push({ placeholder, file, isImage });
			editor.replaceSelection(`${placeholder}\n`);
		}

		// Step 2: 並行上傳，但循序替換 placeholder（避免 race condition）
		const results = await Promise.all(
			entries.map(({ file }) => processFile(file, this.settings)),
		);

		for (let i = 0; i < entries.length; i++) {
			const { placeholder, file, isImage } = entries[i]!;
			const result = results[i]!;
			const content = editor.getValue();

			if (result.success && result.url) {
				const markdownLink = createMarkdownLink(result.url, file.name, isImage);
				editor.setValue(content.replace(placeholder, markdownLink));
			} else {
				editor.setValue(content.replace(placeholder, ""));
				new Notice(`上傳失敗：${result.error}`, 5000);
			}
		}

		// Step 3: 顯示總結通知
		const successCount = results.filter((r) => r.success).length;
		const failCount = results.length - successCount;

		if (failCount === 0) {
			new Notice(`已上傳 ${successCount} 個檔案`, 3000);
		} else {
			new Notice(
				`上傳完成：${successCount} 成功 / ${failCount} 失敗`,
				5000,
			);
		}
	}

	async loadSettings(): Promise<void> {
		const rawData: unknown = await this.loadData();
		const savedSettings: Partial<R2UploaderSettings> =
			rawData && typeof rawData === "object"
				? (rawData as Partial<R2UploaderSettings>)
				: {};
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			savedSettings,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
