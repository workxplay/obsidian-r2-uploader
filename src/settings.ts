import {
	App,
	PluginSettingTab,
	Setting,
	TextComponent,
	setIcon,
} from "obsidian";
import type R2UploaderPlugin from "./main";
import { testR2Connection } from "./r2-client";
import { testTinypngApiKey } from "./compressor";
import { sanitizeUploadPath } from "./uploader";
import {
	getR2ConnectionErrorMessage,
	getTinypngErrorMessage,
	showNotice,
	showSuccessNotice,
} from "./feedback";

/* eslint-disable obsidianmd/ui/sentence-case */

/**
 * 將 TextComponent 轉為密碼欄位，並加上顯示/隱藏切換按鈕。
 */
function addPasswordToggle(text: TextComponent): void {
	const inputEl = text.inputEl;
	inputEl.type = "password";

	const toggleBtn = inputEl.insertAdjacentElement(
		"afterend",
		createSpan(),
	) as HTMLElement;
	toggleBtn.addClass("clickable-icon");
	toggleBtn.setAttribute("tabindex", "-1");
	toggleBtn.setAttribute("aria-label", "切換密碼顯示");
	setIcon(toggleBtn, "eye-off");

	toggleBtn.addEventListener("click", () => {
		const isHidden = inputEl.type === "password";
		inputEl.type = isHidden ? "text" : "password";
		setIcon(toggleBtn, isHidden ? "eye" : "eye-off");
		inputEl.focus();
	});
}

/**
 * Plugin 設定頁面。
 * 分為三個區塊：Cloudflare R2、TinyPNG、行為設定。
 */
export class R2UploaderSettingTab extends PluginSettingTab {
	plugin: R2UploaderPlugin;

	constructor(app: App, plugin: R2UploaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("r2-uploader-settings");

		// ── Section 1: Cloudflare R2 ──
		new Setting(containerEl).setName("Cloudflare R2").setHeading();

		new Setting(containerEl)
			.setName("Account ID")
			.setDesc("Cloudflare 帳戶 ID")
			.addText((text) =>
				text
					.setPlaceholder("8e3a1b4c9d5f...")
					.setValue(this.plugin.settings.r2AccountId)
					.onChange(async (value) => {
						this.plugin.settings.r2AccountId = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Access Key ID")
			.setDesc("R2 API Token 的 Access Key")
			.addText((text) => {
				addPasswordToggle(text);
				text
					.setPlaceholder("輸入 Access Key ID")
					.setValue(this.plugin.settings.r2AccessKeyId)
					.onChange(async (value) => {
						this.plugin.settings.r2AccessKeyId = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Secret Access Key")
			.setDesc("R2 API Token 的 Secret Key")
			.addText((text) => {
				addPasswordToggle(text);
				text
					.setPlaceholder("輸入 Secret Access Key")
					.setValue(this.plugin.settings.r2SecretAccessKey)
					.onChange(async (value) => {
						this.plugin.settings.r2SecretAccessKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Bucket Name")
			.setDesc("R2 儲存桶名稱")
			.addText((text) =>
				text
					.setPlaceholder("my-obsidian-images")
					.setValue(this.plugin.settings.r2BucketName)
					.onChange(async (value) => {
						this.plugin.settings.r2BucketName = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Public URL")
			.setDesc("自訂網域或 r2.dev 公開網址")
			.addText((text) => {
				text
					.setPlaceholder("https://img.yourdomain.com")
					.setValue(this.plugin.settings.r2PublicUrl)
					.onChange(async (value) => {
						const trimmed = value.trim().replace(/\/+$/, "");
						this.plugin.settings.r2PublicUrl = /^https?:\/\//i.test(trimmed) ? trimmed : trimmed ? `https://${trimmed}` : "";
						text.setValue(this.plugin.settings.r2PublicUrl);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Upload Path")
			.setDesc("路徑前綴，留空則上傳到根目錄")
			.addText((text) =>
				text
					.setPlaceholder("images")
					.setValue(this.plugin.settings.r2UploadPath)
					.onChange(async (value) => {
						this.plugin.settings.r2UploadPath = sanitizeUploadPath(value);
						text.setValue(this.plugin.settings.r2UploadPath);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("測試連線")
			.setDesc("測試憑證和 Bucket 是否設定正確")
			.addButton((button) => {
				button.setButtonText("測試");
				button.onClick(async () => {
					const s = this.plugin.settings;

					if (!s.r2AccountId || !s.r2AccessKeyId || !s.r2SecretAccessKey || !s.r2BucketName) {
						showNotice("請先填寫所有 R2 欄位");
						return;
					}

					button.setDisabled(true);
					button.setButtonText("測試中…");

					try {
						await testR2Connection(s);
						showSuccessNotice("R2 連線成功！");
					} catch (e) {
						console.error("[R2Uploader] R2 connection test failed", e);
						showNotice(getR2ConnectionErrorMessage(e));
					} finally {
						button.setDisabled(false);
						button.setButtonText("測試");
					}
				});
			});

		// ── Section 2: TinyPNG ──
		new Setting(containerEl).setName("TinyPNG").setHeading();

		new Setting(containerEl)
			.setName("API Key")
			.setDesc(
				createFragment((frag) => {
					frag.appendText("在 ");
					frag.createEl("a", {
						text: "tinypng.com/developers",
						href: "https://tinypng.com/developers",
					});
					frag.appendText(" 免費申請 (每月 500 次)");
				}),
			)
			.addText((text) => {
				addPasswordToggle(text);
				text
					.setPlaceholder("輸入 TinyPNG API Key")
					.setValue(this.plugin.settings.tinypngApiKey)
					.onChange(async (value) => {
						this.plugin.settings.tinypngApiKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("測試 API Key")
			.setDesc("確認 API Key 是否有效")
			.addButton((button) => {
				button.setButtonText("測試");
				button.onClick(async () => {
					if (!this.plugin.settings.tinypngApiKey) {
						showNotice("請先填寫 TinyPNG API Key");
						return;
					}

					button.setDisabled(true);
					button.setButtonText("測試中…");

					try {
						await testTinypngApiKey(this.plugin.settings.tinypngApiKey);
						showSuccessNotice("TinyPNG API Key 有效！");
					} catch (e) {
						console.error("[R2Uploader] TinyPNG API key test failed", e);
						showNotice(getTinypngErrorMessage(e));
					} finally {
						button.setDisabled(false);
						button.setButtonText("測試");
					}
				});
			});

		// ── Section 3: 行為設定 ──
		new Setting(containerEl).setName("行為設定").setHeading();

		new Setting(containerEl)
			.setName("自動上傳")
			.setDesc("貼上或拖放時自動上傳到 R2")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoUploadOnPaste)
					.onChange(async (value) => {
						this.plugin.settings.autoUploadOnPaste = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("上傳前壓縮")
			.setDesc("透過 TinyPNG 壓縮圖片 (需有效 API Key)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.compressBeforeUpload)
					.onChange(async (value) => {
						this.plugin.settings.compressBeforeUpload = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
