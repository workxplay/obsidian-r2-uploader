# Cloudflare R2 啟用與設定指南

> 最後更新：2026-04-03
>
> 把 R2 想像成「Cloudflare 版的 AWS S3」— 一個放靜態檔案的雲端倉庫，最大賣點是**零出站流量費用（egress free）**。

---

## 一、在 Cloudflare Dashboard 啟用 R2

R2 採用「先訂閱，後使用」的模式。訂閱時需要提供付款方式，但只要在免費額度內就不會扣款。

**UI 路徑：** Dashboard > Storage & Databases > R2 > Overview

**步驟：**

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左側導覽列點選 **Storage & Databases** > **R2** > **Overview**
3. 如果從未啟用過 R2，會看到訂閱頁面，點選 **Subscribe** / **Get Started**
4. 完成結帳流程（確認付費方案，不超過免費額度不會收費）
5. 進入 R2 Overview 頁面 = 啟用成功

---

## 二、建立 Bucket（儲存桶）

Bucket 就像一個雲端資料夾的根目錄，所有上傳的檔案都放在某個 bucket 裡。

**UI 路徑：** Storage & Databases > R2 > Overview > Create bucket

**步驟：**

1. 在 R2 Overview 頁面，點選 **Create bucket**
2. 輸入 **Bucket 名稱**：
   - 只能用小寫英文字母（a-z）、數字（0-9）和連字號（-）
   - 不能以連字號開頭或結尾
   - 長度 3～63 字元
   - 範例：`obsidian-assets`、`my-notes-images`
3. 設定 **Location（資料存放地區）**：
   - **Automatic（預設）**：Cloudflare 自動選擇最佳區域
   - **Location Hint**：手動選擇偏好區域（`apac` 亞太、`wnam` 北美西部、`enam` 北美東部、`weur` 西歐、`eeur` 東歐、`oc` 大洋洲）
4. 選擇 **Storage Class**：
   - **Standard（預設）**：經常存取的檔案，選這個就好
   - Infrequent Access：不常存取的歸檔檔案
5. 點選 **Create bucket**

---

## 三、產生 API Token

API Token 讓你的程式透過 S3 相容 API 存取 R2，就像 GitHub Personal Access Token 的概念。

**UI 路徑：** Storage & Databases > R2 > Overview >（右側）Account Details > Manage R2 API Tokens

**步驟：**

1. 在 R2 Overview 頁面，找到右側 **Account Details** 區塊
2. 記下你的 **Account ID**（之後設定 plugin 會用到）
3. 點選 **Manage R2 API Tokens**
4. 點選 **Create API Token**
5. 設定**權限等級**：

   | 權限 | 說明 |
   |------|------|
   | Admin Read & Write | 完整 bucket + 物件管理 |
   | Admin Read Only | 唯讀 |
   | **Object Read & Write** | **讀寫特定 bucket 的物件（選這個）** |
   | Object Read Only | 唯讀物件 |

6. 選擇 **Bucket 範圍**：建議指定到你建立的那個 bucket（最小權限原則）
7. 點選 **Create API Token**
8. 建立成功，畫面顯示：
   - **Access Key ID** — 辨識 token 的 ID
   - **Secret Access Key** — 認證密鑰

> **極重要：Secret Access Key 只會顯示這一次！離開頁面後就再也看不到了。請立刻複製並安全保存（密碼管理器）。遺失只能刪除 token 重新建立。**

---

## 四、設定公開存取

R2 Bucket 預設是私有的，外部無法直接透過 URL 存取。要讓檔案可公開讀取，有兩種方式。

### 方式 A：r2.dev 公開子網域（開發/測試用）

最快的方式，Cloudflare 給你一個 `https://pub-xxxxxxxx.r2.dev` 網址。

**UI 路徑：** R2 > 選擇 Bucket > Settings > Public Development URL

**步驟：**

1. 進入 bucket → **Settings** 分頁
2. 找到 **Public Development URL** 區塊
3. 點選 **Enable**
4. 確認對話框輸入 `allow`
5. 得到公開網址：`https://pub-xxxxxxxx.r2.dev`

**限制：**
- 有流量限制（rate limiting），僅適合開發測試
- 不支援 Cloudflare Cache、WAF 等進階功能
- 正式環境請用 Custom Domain

### 方式 B：Custom Domain（正式環境推薦）

用自己的網域（例如 `assets.example.com`）指向 R2 bucket。

**前提：** 網域必須已在 Cloudflare 上管理。

**UI 路徑：** R2 > 選擇 Bucket > Settings > Custom Domains > Add

**步驟：**

1. 進入 bucket → **Settings** 分頁
2. 找到 **Custom Domains** 區塊，點選 **Add**
3. 輸入網域名稱（例如 `assets.example.com`）
4. 點選 **Continue**
5. 確認自動新增的 DNS 記錄（CNAME）
6. 點選 **Connect Domain**
7. 狀態從 Initializing 變成 **Active**（通常幾分鐘）

**Custom Domain 優勢：**
- Cloudflare Cache（含 Smart Tiered Cache）
- WAF 自訂規則
- Bot Management
- 可自訂 TLS 版本

> **安全提醒：** 如果你用 Custom Domain 搭配 WAF/Access 做安全控管，建議同時**停用 r2.dev**，否則 r2.dev 會成為繞過安全規則的後門。

---

## 五、免費額度

| 項目 | 免費額度（每月） |
|------|-----------------|
| 儲存空間 | 10 GB |
| Class A 操作（PUT、POST、COPY 等寫入） | 1,000,000 次 |
| Class B 操作（GET、HEAD 等讀取） | 10,000,000 次 |
| 出站流量（Egress） | **完全免費，無上限** |
| 刪除操作（DELETE） | 免費，不計次 |

**超出免費額度的費率：**

| 項目 | 費率 |
|------|------|
| 儲存 | $0.015 / GB-月 |
| Class A 操作 | $4.50 / 百萬次 |
| Class B 操作 | $0.36 / 百萬次 |
| 出站流量 | **$0（永遠免費）** |

---

## 六、設定完成後你會得到什麼

設定完成後，你需要以下資訊來設定 Obsidian R2 Uploader plugin：

| 資訊 | 在哪裡找到 | 範例 |
|------|-----------|------|
| Account ID | R2 Overview → 右側 Account Details | `a1b2c3d4e5f6...` |
| Access Key ID | 建立 API Token 時取得 | `AKIAIOSFODNN7EXAMPLE` |
| Secret Access Key | 建立 API Token 時取得（只顯示一次） | `wJalrXUtnFEMI/K7MDENG...` |
| Bucket Name | 你建立的 bucket 名稱 | `obsidian-assets` |
| Public URL | r2.dev 網址或 Custom Domain | `https://pub-xxx.r2.dev` 或 `https://assets.example.com` |

---

## 七、常見問題

**Q：Secret Access Key 忘記複製怎麼辦？**
沒有辦法重新查看，只能刪除該 API Token 重新建立。

**Q：r2.dev 和 Custom Domain 可以同時啟用嗎？**
可以，但正式環境不建議。如果你有 WAF/Access 安全控管，r2.dev 會成為繞過安全規則的後門。

**Q：Location Hint 選哪個好？**
如果主要在台灣使用，選 `apac`（亞太地區）。或選 Automatic 讓 Cloudflare 自動決定。

**Q：免費額度需要綁信用卡嗎？**
訂閱 R2 時需要提供付款方式，但只要在免費額度內不會扣款。

**Q：Bucket 內的「資料夾」是怎麼運作的？**
R2 沒有真正的資料夾。`images/photo.jpg` 只是一個 key 名稱含有 `/`，Dashboard 上會以資料夾方式呈現，底層是扁平結構。

---

## 參考資料

- [R2 Get Started](https://developers.cloudflare.com/r2/get-started/)
- [R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 S3 API Tokens](https://developers.cloudflare.com/r2/api/s3/tokens/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 Create Buckets](https://developers.cloudflare.com/r2/buckets/create-buckets/)
