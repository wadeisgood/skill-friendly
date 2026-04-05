# OpenCLI ChatGPT Web CLI 開發報告

## 1. 背景

這次工作的目標，是在 Ubuntu / Linux 環境中，讓 **OpenCLI** 能透過 **Google Chrome** 的既有登入狀態，操作 **ChatGPT 網頁版**。

原本本機安裝的 `opencli chatgpt` adapter 經檢查後，屬於 **macOS Desktop App 路線**，依賴：

- `osascript`
- `pbcopy`
- `pbpaste`

因此它不適用於目前這台 Ubuntu 主機。

## 2. 這次完成了什麼

### 系統與工具安裝

已完成：

- Google Chrome Stable
- Node.js 22
- npm
- OpenCLI
- OpenAI Codex CLI

### OpenCLI 驗證

已成功驗證：

- `opencli doctor`
- daemon 正常
- browser extension 已連線
- connectivity 正常

### ChatGPT Web CLI 插件初版

已建立新的 `chatgpt-web` adapter，目標是改走：

- Ubuntu / Linux
- Google Chrome
- ChatGPT Web
- OpenCLI browser/page 基礎能力

## 3. 開發過程摘要

### 3.1 初始觀察

透過檢查 `~/.opencli/clis/chatgpt/*.js`，確認內建 `chatgpt` adapter 採用 macOS 桌面程式控制方式，並非網頁版控制。

因此決定新建 `chatgpt-web` adapter，而不是硬改現有 desktop adapter。

### 3.2 初版指令設計

規劃並實作以下命令：

- `opencli chatgpt-web status`
- `opencli chatgpt-web open`
- `opencli chatgpt-web new`
- `opencli chatgpt-web ask "..."`
- `opencli chatgpt-web read`
- `opencli chatgpt-web debug`

### 3.3 問題定位

初版中，`status/open/new/debug/read` 基本可運作，但 `ask` 的行為是：

- 使用者 prompt 有送入流程
- 但 assistant 回覆為空字串

後續判定問題主要集中在：

1. textarea 內容進入 DOM，但未必正確進入 React state
2. submit 事件未真正觸發 ChatGPT 前端送出
3. response 偵測邏輯不足夠穩定

### 3.4 使用 Codex 輔助修正

後續把問題說明、檔案位置、測試方法整理成 `CODEX_TASK.md`，交給本機已登入的 Codex CLI 協助修正。

Codex 對 `chatgpt-web.js` 做了進一步調整，包含：

- 改善回應穩定判定邏輯
- 使用更明確的 assistant text 比對方式
- 區分 send button 是否可用
- 協助把 patch 同步進 `~/.opencli/clis/chatgpt-web/`

## 4. 最終測試結果

### 成功項目

以下命令已可用：

- `opencli chatgpt-web status`
- `opencli chatgpt-web open`
- `opencli chatgpt-web new`
- `opencli chatgpt-web debug`
- `opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"`

其中 `ask` 已經成功回傳 **非空的 assistant response**。

### 目前仍待補強

- `opencli chatgpt-web read`

目前 `read` 仍有機會回空字串，代表最後訊息的 selector / 萃取規則還可以再強化。

## 5. 目前的實作位置

### Workspace 開發目錄

- `/home/wade/.openclaw/workspace/opencli-chatgpt-web-cli/`

### 本機 OpenCLI 實際掛載位置

- `~/.opencli/clis/chatgpt-web/chatgpt-web.js`

## 6. 程式結構解析

目前 `chatgpt-web.js` 的核心邏輯大致分成：

### `ensureChatGPT(page)`

- 開啟 `https://chatgpt.com/`
- 等待頁面初步穩定

### `pageSnapshot(page)`

收集目前頁面狀態，包括：

- URL
- title
- composer 是否存在
- composer 類型
- send button 狀態
- login markers
- article 數量
- 最後一段 article 文字

這是 debug 與 response 偵測的基礎。

### `waitForReady(page)`

等待頁面可操作：

- composer 出現
- 或登入相關標記出現

### `clickNewChat(page)`

嘗試點擊「新對話」入口，避免舊對話內容干擾新 prompt。

### `focusComposerAndType(page, text)`

負責找到 textarea / composer，將 prompt 寫入。

這裡是整個流程最敏感的一段，因為 ChatGPT 網頁版是前端 SPA，光改 DOM 不一定能觸發真正的內部狀態更新。

### `submitComposer(page)`

嘗試：

- 點 send button
- 或送 Enter 事件
- 必要時再補一次 button click

### `waitForAssistantResponse(...)`

等待 assistant 產生新的非空回應，避免把原本頁面內容或空白 placeholder 誤判成結果。

## 7. OpenCLI 使用方法整理

以下是目前這台機器上常用、且已驗證可用的 OpenCLI 指令。

### 基本檢查

```bash
opencli doctor
opencli list
```

### 一般網頁讀取

```bash
opencli web read --url "https://example.com"
```

### ChatGPT Web 插件

```bash
opencli chatgpt-web status
opencli chatgpt-web open
opencli chatgpt-web new
opencli chatgpt-web debug
opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"
opencli chatgpt-web read
```

## 8. 實務建議

### 適合的用法

- 用 `status` 檢查頁面狀態
- 用 `new` 建立新對話
- 用 `ask` 送問題
- 在 `read` 更穩定前，先以 `ask` 的直接回傳結果為主

### 後續可再做的事

1. 強化 `read` 的 selector
2. 增加 `model` 選擇
3. 增加 conversation / history 支援
4. 增加上傳圖片 / 檔案支援
5. 整理成獨立 opencli plugin / repo 結構

## 9. 結論

這次工作已經把原本無法在 Ubuntu 使用的 ChatGPT desktop adapter 問題，往正確方向拆解並改造成 **ChatGPT Web CLI adapter**。

目前成果是：

- OpenCLI 在 Ubuntu 上可正常運作
- Chrome / Node / Codex / OpenCLI 均已完成安裝與驗證
- `chatgpt-web` 新 adapter 已可被 opencli 識別
- `ask` 已成功取得非空回答
- `read` 尚待進一步補強

這代表此專案已從概念驗證，進入可實際使用的 CLI 原型階段，並具備後續持續強化的基礎。
