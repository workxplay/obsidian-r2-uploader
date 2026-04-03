# Obsidian R2 Uploader

在 Obsidian 筆記中貼上或拖放檔案時，自動透過 [TinyPNG](https://tinypng.com/) 壓縮圖片，並上傳到 [Cloudflare R2](https://developers.cloudflare.com/r2/)，將本地圖片連結替換為公開 URL。

## 解決什麼問題？

- 圖片和筆記混在同一個 vault（或 git repo），佔用空間且路徑混亂
- 換筆記系統時，本地圖片難遷移、連結容易失效
- 手動壓縮 + 上傳 + 貼連結的流程太繁瑣

這個 plugin 把「壓縮 → 上傳 → 產生連結」整個流程自動化，貼上圖片就完成。

## 功能

- **自動上傳** — 貼上（Cmd/Ctrl+V）或拖放檔案時，自動壓縮並上傳到 R2
- **TinyPNG 壓縮** — 上傳前自動壓縮圖片（PNG、JPG、WebP、AVIF），壓縮失敗時自動用原圖上傳
- **多檔案支援** — 一次貼上或拖放多個檔案，並行處理
- **非圖片檔案** — PDF、MP4 等非圖片檔案跳過壓縮，直接上傳
- **自訂上傳路徑** — 可設定 R2 bucket 中的路徑前綴（例如 `assets/images`）
- **連線測試** — 設定頁面提供 R2 連線和 TinyPNG API Key 的驗證按鈕
- **iOS 相容** — 使用 Obsidian `requestUrl()` + Web Crypto API，桌面和 iOS 都能用
- **手動上傳指令** — 透過 Command Palette 手動觸發上傳

## 支援的檔案類型

| 檔案類型 | 處理方式 | 插入語法 |
|---------|---------|---------|
| PNG、JPG、WebP、AVIF | TinyPNG 壓縮 → R2 上傳 | `![](url)` |
| GIF | 跳過壓縮，直接 R2 上傳 | `![](url)` |
| PDF、MP4 等非圖片 | 跳過壓縮，直接 R2 上傳 | `[filename](url)` |

## 安裝

### BRAT（Beta 測試）

1. 在 Obsidian Settings → Community plugins → Browse，搜尋 **BRAT** 並安裝
2. Settings → BRAT → Add Beta plugin，輸入：`https://github.com/pamcy/obsidian-r2-uploader`
3. BRAT 會自動下載最新 Release 並安裝
4. 重新載入 Obsidian（Cmd/Ctrl+P → 搜尋「Reload app without saving」）讓 plugin 生效

### Community Plugins（正式上架專用）

> 目前尚未正式上架，請先使用 BRAT 安裝測試版本。

1. 開啟 Obsidian Settings → Community plugins
2. 關閉 Restricted mode
3. 點選 Browse，搜尋 **R2 Uploader**
4. 點選 Install → Enable
5. 重新載入 Obsidian（Cmd/Ctrl+P → 搜尋「Reload app without saving」）讓 plugin 生效

## 使用前準備

使用這個 plugin 需要準備：

1. **Cloudflare R2** — Account ID、Access Key ID、Secret Access Key、Bucket 名稱、Public URL
2. **TinyPNG API Key**（選用）— 在 [tinypng.com/developers](https://tinypng.com/developers) 免費申請（每月 500 次）

> 如果你還沒有 R2，請參考 [Cloudflare R2 啟用與設定指南](agent-docs/specs/2026-04-03-cloudflare-r2-setup-guide.md)。

### Plugin 設定

在 Obsidian Settings → R2 Uploader 中填入以下資訊：

**Cloudflare R2（必填）：**

| 欄位 | 說明 | 範例 |
|------|------|------|
| Account ID | Cloudflare 帳戶 ID | `a1b2c3d4e5f6...` |
| Access Key ID | R2 API Token 的 Access Key | `AKIAIOSFODNN7EXAMPLE` |
| Secret Access Key | R2 API Token 的 Secret Key | `wJalrXUtnFEMI/K7MDENG...` |
| Bucket Name | R2 儲存桶名稱 | `obsidian-assets` |
| Public URL | 自訂網域或 r2.dev 公開網址 | `https://assets.example.com` |
| Upload Path | 上傳路徑前綴（選填） | `assets` |

**TinyPNG（選用）：**

| 欄位 | 說明 |
|------|------|
| API Key | TinyPNG API Key |

**行為設定：**

| 欄位 | 說明 | 預設 |
|------|------|------|
| 自動上傳 | 貼上或拖放時自動上傳到 R2 | 開啟 |
| 上傳前壓縮 | 上傳前透過 TinyPNG 壓縮圖片 | 開啟 |

填完後，點選「測試連線」確認 R2 設定正確。

## 使用方式

### 自動上傳

設定完成後，在 Obsidian 編輯器中：

1. **貼上圖片**（Cmd/Ctrl+V）或**拖放檔案**到筆記中
2. 編輯器會先顯示上傳中的佔位文字
3. 壓縮 + 上傳完成後，自動替換為最終的 Markdown 連結

### 手動上傳

開啟 Command Palette（Cmd/Ctrl+P），搜尋 **R2 Uploader** 相關指令。

## 相關文件

- [Cloudflare R2 啟用與設定指南](agent-docs/specs/2026-04-03-cloudflare-r2-setup-guide.md) — R2 Bucket 建立、API Token 產生、公開存取設定、免費額度說明
- [技術設計文件](agent-docs/specs/2026-04-03-obsidian-r2-uploader-design.md) — 架構設計、模組職責、事件處理流程、技術選型
- [Plugin 發布操作指南](agent-docs/specs/2026-04-03-publish-guide.md) — GitHub Release 建立、提交到 Obsidian Community Plugins、版本更新流程

## 授權

[MIT](LICENSE)
