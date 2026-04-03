# Obsidian R2 Uploader — 設計文件

> 最後更新：2026-04-03

## 概述

一個 Obsidian Community Plugin，當使用者在筆記中貼上或拖放檔案時，自動壓縮圖片（TinyPNG）並上傳到 Cloudflare R2，回傳公開 URL 插入筆記中。支援多檔案同時處理、非圖片檔案上傳。

## 問題

- 圖片和筆記混在同一個 git repo，佔用空間且路徑混亂
- 換筆記系統時圖片難遷移，連結失效
- 需要一個自動化的流程處理檔案上傳

## 技術選型

| 面向 | 決定 | 理由 |
|---|---|---|
| 雲端儲存 | Cloudflare R2 | 10GB 免費、零 egress 費用、S3 相容 API |
| 圖片壓縮 | TinyPNG API | 500 次/月免費、壓縮品質業界最好、純 HTTP API |
| S3 簽名 | `aws4fetch` (2.5KB gzip) | 純 Web Crypto、零 Node.js 依賴、R2 官方推薦 |
| HTTP 請求 | Obsidian `requestUrl()` | 繞過 CORS、桌面 + iOS 都能用 |
| 實作方式 | Obsidian Plugin (TypeScript + esbuild) | 官方支援、可發布到 Community Plugins |

### 為什麼需要 S3 簽名？

Cloudflare R2 沒有自己獨立的上傳 API，它直接採用了 Amazon S3 的協議（S3 相容 API）。這意味著要上傳檔案到 R2，必須「說 S3 的語言」，其中包括用 **AWS Signature V4** 來簽署每個請求，證明「這個請求確實是由持有 API key 的人發出的」。

用前端類比：就像你呼叫一個需要認證的 REST API，每個請求都要帶 JWT token 一樣。S3 Signature V4 就是 S3 世界的「JWT」— 用你的 Secret Key 對請求內容做加密簽名，伺服器收到後驗證簽名確認身份。

`aws4fetch` 就是幫我們自動算這個簽名的套件，不需要自己處理加密細節。

### 技術決策備註

- **TinyPNG 無法直傳 R2**：TinyPNG 的 `store` API 只支援 Amazon S3 和 GCS，不支援自訂 endpoint。流程必須是「壓縮 → 下載 → 自己上傳到 R2」。
- **`aws4fetch` 而非自己實作 Sig V4**：自行實作容易出錯且難以維護，`aws4fetch` 只有 2.5KB 且是 Cloudflare 官方推薦。
- **`aws4fetch` 簽名 + `requestUrl()` 發送**：`aws4fetch` 負責計算 Authorization header，`requestUrl()` 負責實際發送請求（繞過 CORS、iOS 相容）。不直接用 `aws4fetch` 的 `fetch()` 是因為 Obsidian 環境的 CORS 限制。
- **不用 `@aws-sdk/client-s3`**：太重（數百 KB）、需要 Node.js polyfill、iOS 上有相容性風險。

## 使用者需自行準備

1. **Cloudflare R2**：Account ID、Access Key ID、Secret Access Key、Bucket 名稱、Public URL（自訂網域或 r2.dev）
2. **TinyPNG**：API key（在 https://tinypng.com/developers 免費申請）

> R2 的完整啟用與設定步驟請參考 [Cloudflare R2 啟用與設定指南](2026-04-03-cloudflare-r2-setup-guide.md)

## 核心功能

### 1. 自動上傳（主要功能）

使用者在 Obsidian 編輯器中貼上或拖放檔案時自動觸發。

**支援的觸發方式**：
- `editor-paste` 事件（Ctrl/Cmd+V 貼上）
- `editor-drop` 事件（拖放檔案）

**支援的檔案類型**：
- 圖片（PNG、JPG、WebP、AVIF 等）→ TinyPNG 壓縮 + R2 上傳
- 非圖片（PDF、TXT、MP4 等）→ 跳過壓縮，直接 R2 上傳

**多檔案支援**：`clipboardData.files` / `dataTransfer.files` 是 FileList，可包含多個檔案，逐一處理。

### 2. 手動上傳（次要功能）

透過 Command Palette 指令，選取筆記中的本地圖片連結，上傳到 R2 並替換。

## 架構

### 檔案結構

```
obsidian-r2-uploader/
├── src/
│   ├── main.ts              # Plugin 入口，註冊事件和指令
│   ├── settings.ts          # Settings Tab UI + 設定型別 + 預設值
│   ├── r2-client.ts         # Cloudflare R2 上傳邏輯（aws4fetch 簽名 + requestUrl 發送）
│   ├── compressor.ts        # TinyPNG 壓縮邏輯（requestUrl HTTP 呼叫）
│   └── uploader.ts          # 整合壓縮 + 上傳的流程控制
├── manifest.json            # Obsidian plugin 元資料
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── versions.json
└── README.md
```

### 模組職責

#### `main.ts` — Plugin 入口

- 繼承 `Plugin` class
- `onload()`：
  - 載入設定
  - 註冊 `editor-paste` 事件
  - 註冊 `editor-drop` 事件
  - 註冊 Command Palette 指令（手動上傳）
  - 註冊 Settings Tab
- `onunload()`：清理資源（由 `registerEvent` 自動處理）

#### `settings.ts` — 設定管理

設定欄位：

```typescript
interface R2UploaderSettings {
  // Cloudflare R2
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
  r2PublicUrl: string;        // 例如 https://images.example.com

  // TinyPNG
  tinypngApiKey: string;

  // 行為設定
  autoUploadOnPaste: boolean; // 預設 true
  compressBeforeUpload: boolean; // 預設 true
}
```

Settings Tab 三個區塊：

1. **Cloudflare R2** — Account ID、Access Key ID（密碼欄位+眼睛切換）、Secret Access Key（密碼欄位+眼睛切換）、Bucket Name、Public URL、「測試 R2 連線」按鈕
2. **TinyPNG** — API Key（密碼欄位+眼睛切換）、申請連結、「測試 TinyPNG」按鈕
3. **行為設定** — 自動上傳 toggle、上傳前壓縮 toggle

#### `compressor.ts` — TinyPNG 壓縮

流程：
1. `requestUrl()` POST 圖片 ArrayBuffer 到 `https://api.tinify.com/shrink`
2. 認證：`Authorization: Basic ${btoa("api:" + apiKey)}`
3. 從 response headers 的 `Location` 取得壓縮結果 URL
4. `requestUrl()` GET 下載壓縮後的 ArrayBuffer
5. 壓縮失敗時 fallback：直接用原圖（不中斷流程），Notice 提示

TinyPNG 支援格式：JPEG、PNG、WebP、AVIF（不支援 GIF）

**檔案類型判斷邏輯**：

| MIME type | 行為 | 插入語法 |
|---|---|---|
| `image/png`, `image/jpeg`, `image/webp`, `image/avif` | TinyPNG 壓縮 → R2 上傳 | `![](url)` |
| `image/gif` | 跳過壓縮，直接 R2 上傳 | `![](url)` |
| 非圖片（`application/pdf`, `video/mp4` 等） | 跳過壓縮，直接 R2 上傳 | `[filename](url)` |

#### `r2-client.ts` — R2 上傳

流程：
1. 用 `aws4fetch` 的 `AwsV4Signer` 計算簽名 headers
2. 用 `requestUrl()` PUT 上傳到 R2

```typescript
import { AwsV4Signer } from 'aws4fetch';
import { requestUrl } from 'obsidian';

async function uploadToR2(file: ArrayBuffer, key: string, settings: R2UploaderSettings): Promise<string> {
  const url = `https://${settings.r2AccountId}.r2.cloudflarestorage.com/${settings.r2BucketName}/${key}`;

  const signer = new AwsV4Signer({
    accessKeyId: settings.r2AccessKeyId,
    secretAccessKey: settings.r2SecretAccessKey,
    url,
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
    service: 's3',
    region: 'auto',
  });

  const { headers } = await signer.sign();

  await requestUrl({
    url,
    method: 'PUT',
    headers: Object.fromEntries(headers.entries()),
    body: file,
  });

  return `${settings.r2PublicUrl}/${key}`;
}
```

#### `uploader.ts` — 流程控制

整合壓縮 + 上傳的完整流程：
- 判斷檔案類型（圖片 vs 非圖片）
- 圖片：壓縮 → 上傳
- 非圖片：直接上傳
- 生成檔名
- 錯誤處理和 fallback

### 事件處理流程

```
editor-paste / editor-drop 事件觸發
  │
  ├─ 檢查 evt.defaultPrevented（是否已被其他 plugin 處理）
  │   └─ 是 → return，不處理
  │
  ├─ 取得 files（clipboardData.files 或 dataTransfer.files）
  │   └─ 無檔案 → return，讓 Obsidian 處理
  │
  ├─ 檢查設定是否完整（R2 必填欄位）
  │   └─ 未填 → 不攔截，Notice 提示去設定
  │
  ├─ evt.preventDefault()（同步，立即呼叫）
  │
  ├─ 對每個檔案並行處理：
  │   │
  │   ├─ 生成檔名（timestamp-originalname.ext）
  │   │
  │   ├─ 插入佔位文字
  │   │   ├─ 圖片：![uploading...](placeholder-{timestamp})
  │   │   └─ 非圖片：[uploading filename...](placeholder-{timestamp})
  │   │
  │   ├─ 是否為圖片且啟用壓縮？
  │   │   ├─ 是 → TinyPNG 壓縮
  │   │   │   └─ 失敗 → 用原檔繼續，Notice 提示
  │   │   └─ 否 → 用原檔
  │   │
  │   ├─ 上傳到 R2（aws4fetch 簽名 + requestUrl）
  │   │   ├─ 成功 → 替換佔位文字
  │   │   │   ├─ 圖片：![](public-url)
  │   │   │   └─ 非圖片：[filename](public-url)
  │   │   └─ 失敗 → 替換為錯誤提示，Notice 顯示原因
  │   │
  │   └─ 完成
  │
  └─ 全部完成，Notice 顯示「已上傳 N 個檔案」
```

## 檔名策略

格式：`{sanitized-original-name}-{timestamp}.{ext}`

例如：`screenshot-20260403143022.png`

- 原始檔名在前，方便辨識
- 時間戳在後，確保唯一性（格式：YYYYMMDDHHmmss）
- sanitize：移除特殊字元、空格轉 `-`、轉小寫
- 全部平放在 R2 bucket 根目錄（不分子資料夾）

## 錯誤處理

| 場景 | 處理方式 |
|---|---|
| TinyPNG 壓縮失敗 | 跳過壓縮，用原圖上傳，Notice 提示 |
| TinyPNG 401 | Notice 提示 API Key 無效 |
| TinyPNG 429 | Notice 提示本月額度用完 |
| R2 上傳失敗 | 替換佔位文字為 `![upload failed]`，Notice 顯示錯誤原因 |
| R2 403 | Notice 提示 API Token 權限不足 |
| 設定未填寫 | 不攔截 paste，讓 Obsidian 預設行為處理，Notice 提示去設定 |
| 網路斷線 | 同上傳失敗處理 |

## iOS 相容性

- 使用 `requestUrl()` 確保 iOS 可用（不用 `fetch()`）
- `aws4fetch` 純 Web Crypto API，iOS WebView 原生支援
- 不使用任何 Node.js API（`fs`、`path`、`child_process`、`crypto` 等）
- `manifest.json` 不設 `isDesktopOnly: true`
- 所有端點都是 HTTPS（TinyPNG 和 R2）

## 發布計畫

1. **本地開發測試**：在自己的 Obsidian vault 中透過 symlink 載入開發中的 plugin
2. **Beta 測試（BRAT）**：GitHub repo 公開後，夥伴透過 BRAT plugin 安裝測試
3. **正式發布**：建立 GitHub Release → 提交 PR 到 [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) → 等待審核上架

> 完整的發布操作步驟請參考 [發布操作指南](2026-04-03-publish-guide.md)

## 不做的事情（YAGNI）

- 不支援多種雲端服務（只做 R2）
- 不做圖片管理介面（列出已上傳圖片等）
- 不做批次遷移工具（把現有本地圖片全部上傳）
- 不做圖片格式轉換（WebP 等）
- 不做圖片 resize
- 不做 Cloudflare Worker 中介層

## 程式碼規範

### 架構原則

- **單一職責（Single Responsibility）**：每個模組只負責一件事 — `compressor.ts` 只管壓縮、`r2-client.ts` 只管上傳、`uploader.ts` 只管流程串接
- **依賴反轉（Dependency Inversion）**：模組之間透過 TypeScript interface 溝通，不直接依賴具體實作。例如 `uploader.ts` 透過 `Compressor` 和 `R2Client` interface 呼叫，方便測試和替換
- **關注點分離（Separation of Concerns）**：UI 邏輯（settings.ts）、業務邏輯（uploader.ts）、外部 API 呼叫（compressor.ts、r2-client.ts）各自獨立

### 模組間的溝通方式

```
main.ts（事件監聽 + 指令註冊）
  │
  └─→ uploader.ts（流程控制，是唯一的「指揮中心」）
        │
        ├─→ compressor.ts（TinyPNG API 呼叫）
        └─→ r2-client.ts（R2 上傳）
```

- `main.ts` 只負責「什麼時候觸發」，不包含業務邏輯
- `uploader.ts` 是唯一知道「先壓縮再上傳」流程的地方
- `compressor.ts` 和 `r2-client.ts` 彼此不知道對方的存在

### 程式碼品質要求

- 每個 exported function/class 都要有 JSDoc 註解，說明用途、參數和回傳值
- 錯誤處理使用自定義 Error class（例如 `CompressError`、`UploadError`），方便上層判斷錯誤來源
- 避免 any type，所有 API response 都要定義明確的型別
- 常數（API URL、預設值等）集中管理，不散落在各模組中

## 依賴套件

| 套件 | 用途 | 大小 |
|---|---|---|
| `obsidian` | Obsidian API 型別 | devDependency |
| `aws4fetch` | AWS Signature V4 簽名 | 2.5KB gzip |

僅一個 runtime dependency。

## 參考資料

- [Obsidian Plugin 開發文件](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [TinyPNG HTTP API](https://tinify.com/developers/reference/http)
- [Cloudflare R2 Get Started](https://developers.cloudflare.com/r2/get-started/)
- [Cloudflare R2 aws4fetch 範例](https://developers.cloudflare.com/r2/examples/aws/aws4fetch/)
- [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [remotely-save plugin](https://github.com/remotely-save/remotely-save)（Settings 設計參考）
- [s3-image-uploader plugin](https://github.com/jvsteiner/s3-image-uploader)（S3 上傳參考）
