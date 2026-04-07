# Preserve Cursor Position After Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 上傳完成後，游標保持在使用者貼上時的位置，不跳回文章頂端。

**Architecture:** 在 `editor.setValue(content)` 前後各插入一行：先用 `editor.getCursor()` 儲存游標位置，`setValue` 後用 `editor.setCursor(savedCursor)` 還原。

**Tech Stack:** TypeScript, Obsidian Editor API (`getCursor` / `setCursor`)

---

### Task 1: 修正 handleFiles() 游標跳頂問題

**Files:**
- Modify: `src/main.ts:126`

**Step 1: 確認目前行為（預期失敗）**

在 Obsidian 中貼上圖片，觀察上傳完成後游標是否跳到文章頂端（第 1 行）。

**Step 2: 修改 src/main.ts**

找到第 126 行：
```typescript
		editor.setValue(content);
```

替換為：
```typescript
		const cursor = editor.getCursor();
		editor.setValue(content);
		editor.setCursor(cursor);
```

**Step 3: 執行 lint 確認無型別錯誤**

```bash
npm run lint
```
預期輸出：無 error，exit code 0。

**Step 4: 執行 build 確認編譯成功**

```bash
npm run build
```
預期輸出：build 完成，無 TypeScript 錯誤。

**Step 5: 手動驗證**

1. 在 Obsidian vault 的 `.obsidian/plugins/` 目錄下確認 symlink 指向本專案
2. 在 Obsidian 中重新載入 plugin（或重啟 Obsidian）
3. 在筆記中間某處貼上一張圖片
4. 等待上傳完成，確認游標仍在貼上位置（不跳回頂端）
5. 測試貼上多張圖片，確認游標同樣保持在正確位置

**Step 6: Commit**

```bash
git add src/main.ts
git commit -m "fix(editor): preserve cursor position after upload completes

editor.setValue() resets the cursor to line 0. Save and restore the
cursor position around the call so focus stays where the user pasted.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
