# Design: Preserve Cursor Position After Upload

## Problem

When pasting or dropping images, the editor focus jumps to the top of the document after the upload completes. This is disruptive to the user's editing flow.

## Root Cause

In `src/main.ts`, `handleFiles()` calls `editor.setValue(content)` to replace all placeholders with final markdown links. This Obsidian API call resets the cursor to line 0, column 0.

## Solution

Save and restore the cursor position around `editor.setValue()`.

### Change

**File:** `src/main.ts`  
**Method:** `handleFiles()`

```typescript
// Before
editor.setValue(content);

// After
const cursor = editor.getCursor();
editor.setValue(content);
editor.setCursor(cursor);
```

## Trade-offs

- **Simple and minimal** — 2-line addition, no new dependencies
- **Edge case:** If the user moves the cursor during upload, the cursor returns to the paste position after completion — acceptable behaviour
- **Edge case:** Placeholders inserted before the cursor would shift line numbers on replacement — this cannot happen in practice since placeholders are always inserted at the cursor

## Scope

- Only `src/main.ts` is modified
- No behaviour changes other than cursor preservation
