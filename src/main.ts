import { Editor, Notice, Plugin } from "obsidian";
import type { MarkdownView, MarkdownFileInfo } from "obsidian";
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
				(evt: ClipboardEvent, editor: Editor, _info: MarkdownView | MarkdownFileInfo) => {
					if (evt.defaultPrevented) return;
					if (!this.settings.autoUploadOnPaste) return;

					const files = evt.clipboardData?.files;
					if (!files || files.length === 0) return;
					if (!isR2ConfigComplete(this.settings)) {
						new Notice("R2 Uploader：請先在設定中填寫 R2 連線資訊");
						return;
					}

					evt.preventDefault();
					this.handleFiles(Array.from(files), editor);
				},
			),
		);

		// 註冊 editor-drop 事件
		this.registerEvent(
			this.app.workspace.on(
				"editor-drop",
				(evt: DragEvent, editor: Editor, _info: MarkdownView | MarkdownFileInfo) => {
					if (evt.defaultPrevented) return;
					if (!this.settings.autoUploadOnPaste) return;

					const files = evt.dataTransfer?.files;
					if (!files || files.length === 0) return;
					if (!isR2ConfigComplete(this.settings)) {
						new Notice("R2 Uploader：請先在設定中填寫 R2 連線資訊");
						return;
					}

					evt.preventDefault();
					this.handleFiles(Array.from(files), editor);
				},
			),
		);

		// 註冊手動上傳指令
		this.addCommand({
			id: "upload-clipboard-files",
			name: "Upload clipboard files to R2",
			editorCallback: (editor: Editor) => {
				new Notice("請使用 Ctrl/Cmd+V 貼上檔案來上傳");
			},
		});
	}

	/**
	 * 處理多個檔案的上傳流程。
	 * 對每個檔案：插入佔位文字 → 壓縮（如適用）→ 上傳 → 替換佔位文字。
	 */
	private async handleFiles(files: File[], editor: Editor): Promise<void> {
		const placeholders: { placeholder: string; file: File; isImage: boolean }[] = [];

		// Step 1: 為每個檔案插入佔位文字
		for (const file of files) {
			const isImage = isImageType(file.type);
			const placeholder = createPlaceholder(file.name, isImage);
			placeholders.push({ placeholder, file, isImage });
			editor.replaceSelection(placeholder + "\n");
		}

		// Step 2: 並行處理所有檔案
		const results = await Promise.all(
			placeholders.map(async ({ placeholder, file, isImage }) => {
				const result = await processFile(file, this.settings);

				// 替換佔位文字
				const content = editor.getValue();
				if (result.success && result.url) {
					const markdownLink = createMarkdownLink(result.url, file.name, isImage);
					editor.setValue(content.replace(placeholder, markdownLink));
				} else {
					const errorText = isImage
						? `![upload failed](${file.name})`
						: `[upload failed: ${file.name}]()`;
					editor.setValue(content.replace(placeholder, errorText));
					new Notice(`上傳失敗：${result.error}`, 8000);
				}

				return result;
			}),
		);

		// Step 3: 顯示總結通知
		const successCount = results.filter((r) => r.success).length;
		const failCount = results.length - successCount;

		if (failCount === 0) {
			new Notice(`已上傳 ${successCount} 個檔案`, 3000);
		} else {
			new Notice(
				`上傳完成：${successCount} 成功，${failCount} 失敗`,
				5000,
			);
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
