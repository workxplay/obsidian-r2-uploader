# Obsidian R2 Uploader

Obsidian plugin — 貼上或拖放檔案時，自動透過 [TinyPNG](https://tinypng.com/) 壓縮圖片並上傳到 [Cloudflare R2](https://developers.cloudflare.com/r2/)，取代本地圖片連結為公開 URL。讓圖片不再塞在 vault 裡，換系統也不怕連結失效。

## 功能

- **貼上即上傳** — Cmd/Ctrl+V 或拖放，自動壓縮並上傳到 R2
- **TinyPNG 壓縮** — PNG、JPG、WebP、AVIF 自動壓縮；GIF 及非圖片檔 (PDF、MP4、Zip 等) 直接上傳
- **多檔案並行** — 一次貼上多個檔案，同時處理
- **自訂路徑** — 可設定 R2 bucket 中的上傳路徑前綴
- **iOS 相容** — 桌面和 iOS (待測試) 都能用
- **壓縮容錯** — 壓縮失敗時自動改用原圖上傳，不中斷流程

## 安裝

### BRAT (Beta 測試)

1. Settings → Community plugins → Browse，搜尋 **BRAT** 並安裝
2. Settings → BRAT → Add Beta plugin，輸入：`https://github.com/workxplay/obsidian-r2-uploader`
3. Cmd/Ctrl+P → 搜尋「Reload app without saving」重新載入

### Community Plugins

> 尚未正式上架，暫不提供 Community Plugins 安裝步驟，請先使用 BRAT 安裝。

## 設定

在 **Settings → R2 Uploader** 中填入以下資訊。

> 還沒有 R2？請參考 [Cloudflare R2 啟用與設定指南](agent-docs/specs/2026-04-03-cloudflare-r2-setup-guide.md)。

### Cloudflare R2 (必填)

| 欄位 | 說明 | 範例 |
|------|------|------|
| Account ID | Cloudflare 帳戶 ID | `8e3a1b4c9d5f...` |
| Access Key ID | R2 API Token 的 Access Key | `cf2a9b4e7d01...` |
| Secret Access Key | R2 API Token 的 Secret Key | `R2secret/xK9mP...` |
| Bucket Name | R2 儲存桶名稱 | `my-obsidian-images` |
| Public URL | 自訂網域或 r2.dev 公開網址 | `https://img.yourdomain.com` |
| Upload Path | 路徑前綴 (選填) | `images` |

### TinyPNG (選填)

| 欄位 | 說明 |
|------|------|
| API Key | 在 [tinypng.com/developers](https://tinypng.com/developers) 免費申請 (每月 500 次) |

### 行為設定

| 欄位 | 說明 | 預設 |
|------|------|------|
| 自動上傳 | 貼上或拖放時自動上傳到 R2 | 開啟 |
| 上傳前壓縮 | 透過 TinyPNG 壓縮圖片 (需有效 API Key) | 開啟 |

填完後，點選 **「測試連線」** 確認 R2 設定正確。

## 使用方式

1. 在編輯器中 **貼上圖片** (Cmd/Ctrl+V) 或 **拖放檔案**
2. 編輯器顯示上傳中的佔位文字
3. 完成後自動替換為 Markdown 連結 (圖片 `![](url)`、其他檔案 `[filename](url)`)

也可透過 Command Palette (Cmd/Ctrl+P) 搜尋 **R2 Uploader** 手動觸發上傳。

## 授權

[MIT](LICENSE)
