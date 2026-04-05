# opencli-chatgpt-web-cli

ChatGPT Web CLI adapter for OpenCLI on Linux/Ubuntu using Google Chrome login state.

## Goal

Provide a real CLI adapter for ChatGPT Web, not a macOS desktop-app shim.

Target commands:

- `opencli chatgpt-web status`
- `opencli chatgpt-web open`
- `opencli chatgpt-web new`
- `opencli chatgpt-web ask "..."`
- `opencli chatgpt-web read`

Current behavior note:
- `read` now prefers reusing an existing `chatgpt.com` tab before opening a new page.
- This avoids reading from a blank fresh tab after `ask` already produced an answer in another tab.

## Why this exists

The built-in `opencli chatgpt` adapter in the local OpenCLI installation is desktop-app oriented and currently depends on macOS-specific tools such as:

- `osascript`
- `pbcopy`
- `pbpaste`

That makes it unsuitable for Ubuntu + Chrome web usage.

## Design constraints

- Must work on Ubuntu/Linux
- Must use Chrome / Chromium logged-in browser state
- Should integrate with OpenCLI patterns where practical
- Should avoid macOS-only desktop automation
- Should prefer browser bridge / browser page automation
- Commands should be deterministic and scriptable

## Initial scope

### status
- verify browser bridge connectivity
- verify ChatGPT page can be opened
- detect likely login state

### open
- open `https://chatgpt.com/`
- optionally wait for page ready state

### new
- open a fresh conversation page
- verify composer exists

### ask
- open/focus ChatGPT web
- type a prompt into the composer
- submit it
- wait for generation to finish or timeout
- return the final visible assistant response

### read
- extract the latest visible assistant response from the page
- reuse the active/existing ChatGPT tab when available so it reads the same conversation that `ask` used

## Implementation notes

Possible implementation approaches:

1. Reuse OpenCLI internal browser/page modules if stable enough
2. Create an adapter under OpenCLI-compatible `clis/chatgpt-web/*.js`
3. If needed, prototype outside first, then copy into `~/.opencli/clis/chatgpt-web/`

## Risks

- ChatGPT web DOM may change
- Login wall / anti-bot UI may vary
- Composer selectors may change by experiment bucket
- Need a reliable way to detect answer completion

## Success criteria

The following should work on this Ubuntu machine:

```bash
opencli chatgpt-web status
opencli chatgpt-web new
opencli chatgpt-web ask "今天天氣如何？"
opencli chatgpt-web read
```

Recommended flow:

```bash
opencli chatgpt-web status
opencli chatgpt-web new
opencli chatgpt-web ask "請回覆：read 測試成功。"
opencli chatgpt-web read
```
