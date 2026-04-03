# Obsidian R2 Uploader — 發布操作指南

> 最後更新：2026-04-03

本文件說明 plugin 從開發到正式上架 Obsidian Community Plugins 的完整流程。

---

## 階段一：本地開發測試

在自己的 Obsidian vault 中直接載入開發中的 plugin。

### 步驟

1. 找到你的 vault 路徑下的 plugins 資料夾：
   ```
   <你的 vault>/.obsidian/plugins/
   ```

2. 建立 plugin 資料夾並放入編譯產出：
   ```
   .obsidian/plugins/obsidian-r2-uploader/
   ├── main.js          # esbuild 編譯產出
   ├── manifest.json
   └── styles.css       # 如果有的話
   ```

3. 開發時可以用 symlink 避免每次手動複製：
   ```bash
   ln -s /Users/pamcy/develop/small-step/obsidian-r2-uploader \
     <你的 vault>/.obsidian/plugins/obsidian-r2-uploader
   ```

4. 在 Obsidian 中啟用：
   - Settings → Community plugins → 關閉「Restricted mode」
   - 找到你的 plugin → 啟用

5. 修改程式碼後重新載入：
   - `npm run dev`（watch 模式，自動編譯）
   - 在 Obsidian 中按 `Cmd+R` 重新載入

---

## 階段二：Beta 測試（BRAT）

讓夥伴在正式上架前就能安裝測試。BRAT（Beta Reviewers Auto-update Tester）是 Obsidian 社群的 beta plugin 安裝工具。

### 前置條件

- GitHub repo 已公開
- 已建立至少一個 GitHub Release（見下方「建立 Release」）

### 夥伴安裝步驟

1. 在 Obsidian 中安裝 [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Settings → BRAT → Add Beta plugin
3. 輸入 GitHub repo URL：`https://github.com/<你的帳號>/obsidian-r2-uploader`
4. BRAT 會自動下載最新 Release 並安裝
5. 之後每次你發新 Release，BRAT 會自動更新

---

## 階段三：正式發布到 Community Plugins

### 前置條件檢查清單

- [ ] GitHub repo 是公開的
- [ ] repo 根目錄有 `README.md`（說明 plugin 功能、安裝方式、設定說明）
- [ ] repo 根目錄有 `LICENSE`（建議 MIT）
- [ ] `manifest.json` 欄位完整且正確
- [ ] 已建立至少一個 GitHub Release
- [ ] 程式碼沒有混淆（no obfuscation）
- [ ] 不含敏感資料（API key 等）
- [ ] plugin ID 只用英數字和 `-`，不以 `obsidian` 開頭

### Step 1：準備 manifest.json

```json
{
  "id": "r2-uploader",
  "name": "R2 Uploader",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Automatically compress and upload images to Cloudflare R2 when pasting or dropping files.",
  "author": "你的名字",
  "authorUrl": "https://github.com/你的帳號",
  "isDesktopOnly": false
}
```

注意事項：
- `id` 不能包含 `obsidian` 前綴
- `id` 必須和提交到 community-plugins.json 的一致
- `minAppVersion` 設為你測試過的最低 Obsidian 版本

### Step 2：準備 versions.json

```json
{
  "1.0.0": "0.15.0"
}
```

格式：`"plugin 版本": "最低 Obsidian 版本"`。每次發新版都要更新這個檔案。

### Step 3：建立 GitHub Release

1. 確保 `manifest.json` 和 `versions.json` 的版本號已更新

2. 執行 production build：
   ```bash
   npm run build
   ```

3. 在 GitHub 建立 Release：
   - 到 repo 頁面 → Releases → Draft a new release
   - Tag：輸入版本號（例如 `1.0.0`，**不加 `v` 前綴**）
   - Target：main branch
   - Title：`1.0.0`
   - Description：本版本的更新內容

4. 上傳以下檔案作為 Release Assets（**獨立檔案，不是 zip**）：
   - `main.js`
   - `manifest.json`
   - `styles.css`（如果有的話）

5. 發布 Release

> 也可以用 GitHub Actions 自動化這個流程，參考 [obsidian-sample-plugin 的 release workflow](https://github.com/obsidianmd/obsidian-sample-plugin/blob/master/.github/workflows/release.yml)。

### Step 4：提交 PR 到 obsidian-releases

1. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) repo

2. 編輯 `community-plugins.json`，在檔案**末尾的 `]` 之前**加入：
   ```json
   {
     "id": "r2-uploader",
     "name": "R2 Uploader",
     "author": "你的名字",
     "description": "Automatically compress and upload images to Cloudflare R2 when pasting or dropping files.",
     "repo": "你的帳號/obsidian-r2-uploader"
   }
   ```

3. 建立 PR，標題格式：`Add plugin: R2 Uploader`

4. PR 描述中簡要說明 plugin 功能

### Step 5：等待審核

- 提交後會先經過**自動驗證**（檢查 manifest、Release assets 等）
- 通過後進入**人工審核**佇列
- 審核重點：安全性、是否收集使用者資料、程式碼品質
- 30 天無回應會標記為 stale，45 天自動關閉
- 如果被要求修改，修改後留言通知 reviewer

### Step 6：上架成功

- PR 合併後，plugin 會出現在 Obsidian 的 Community Plugins 列表中
- 使用者可在 Settings → Community plugins → Browse 中搜尋安裝

---

## 後續版本更新流程

正式上架後，發新版只需要：

1. 更新 `manifest.json` 的 `version`
2. 更新 `versions.json`（如果最低 Obsidian 版本有變）
3. `npm run build`
4. 在 GitHub 建立新的 Release（同 Step 3）
5. Obsidian 會自動偵測並通知使用者更新

**不需要再次提交 PR 到 obsidian-releases**。

---

## 自動化 Release（選配）

可以用 GitHub Actions 在推 tag 時自動建立 Release：

```yaml
# .github/workflows/release.yml
name: Release Obsidian Plugin

on:
  push:
    tags:
      - '*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install
      - run: npm run build

      - uses: softprops/action-gh-release@v2
        with:
          files: |
            main.js
            manifest.json
            styles.css
```

使用方式：
```bash
# 更新版本號後
git tag 1.0.0
git push origin 1.0.0
# GitHub Actions 會自動 build + 建立 Release + 上傳 assets
```

---

## 參考資料

- [Obsidian Plugin 發布文件](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Obsidian Plugin 提交要求](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
- [BRAT Plugin](https://github.com/TfTHacker/obsidian42-brat)
- [obsidian-sample-plugin release workflow](https://github.com/obsidianmd/obsidian-sample-plugin/blob/master/.github/workflows/release.yml)
