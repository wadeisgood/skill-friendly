# Codex task: fix ChatGPT Web ask flow for opencli adapter

## Context

We are building a new OpenCLI adapter for ChatGPT Web on Ubuntu/Linux using Chrome, because the built-in `opencli chatgpt` adapter is macOS desktop-app specific (`osascript`, `pbcopy`, `pbpaste`).

Current prototype file:

- `/home/wade/.openclaw/workspace/opencli-chatgpt-web-cli/chatgpt-web.js`

It is currently copied into:

- `/home/wade/.opencli/clis/chatgpt-web/chatgpt-web.js`

## What already works

These commands are recognized by opencli and run:

- `opencli chatgpt-web status`
- `opencli chatgpt-web open`
- `opencli chatgpt-web new`
- `opencli chatgpt-web debug`
- `opencli chatgpt-web read`

Observed results:

- `status` opens `https://chatgpt.com/`
- page title is `ChatGPT`
- composer is found
- login markers are false after page settles
- `new` succeeds with `ok:a[href="/"]`
- `debug` shows a `TEXTAREA`

## Current bug

This command completes but the assistant response stays empty:

```bash
opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"
```

Observed output:

- user row is present
- assistant row is blank
- runtime ~35-40s

## Likely causes

One of:

1. textarea value is being changed in DOM but not in React state
2. send/submit is not actually firing a real ChatGPT message submit
3. response is generated but our selector / article parsing is wrong

## Constraints

- Ubuntu / Linux
- Google Chrome
- Existing login session in browser
- Must use OpenCLI browser/page infrastructure where possible
- Must not rely on macOS-only APIs

## Goal

Fix `ask` so that this works reliably:

```bash
opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"
```

And returns a non-empty assistant response.

## Deliverable

Please modify:

- `/home/wade/.openclaw/workspace/opencli-chatgpt-web-cli/chatgpt-web.js`

Then copy it to:

- `/home/wade/.opencli/clis/chatgpt-web/chatgpt-web.js`

Then test via the user's tmux session named `work` using commands like:

```bash
opencli chatgpt-web debug
opencli chatgpt-web new
opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"
opencli chatgpt-web read
```

## Notes

You can inspect OpenCLI internals under:

- `/home/wade/.opencli/`
- `/home/wade/.npm-global/lib/node_modules/@jackwener/opencli/dist/src/`

Please focus on making `ask` actually work end-to-end.
