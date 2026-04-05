# opencli-chatgpt-web-cli

A browser-backed ChatGPT Web adapter prototype for OpenCLI on Ubuntu / Linux.

## Why this project exists

OpenCLI already includes a built-in `chatgpt` adapter, but that implementation is oriented toward **macOS Desktop App automation** and depends on platform-specific tools such as:

- `osascript`
- `pbcopy`
- `pbpaste`

That makes it unsuitable for Ubuntu / Linux.

This project explores the correct path for Linux:

- Google Chrome as the real execution surface
- OpenCLI daemon + browser extension bridge
- OpenCLI `Page` abstraction for browser control
- ChatGPT Web instead of ChatGPT Desktop App

## What this prototype currently proves

Validated on the target Ubuntu machine:

- `opencli chatgpt-web status` ✅
- `opencli chatgpt-web open` ✅
- `opencli chatgpt-web new` ✅
- `opencli chatgpt-web debug` ✅
- `opencli chatgpt-web ask "..."` ✅
  - confirmed to return a **non-empty assistant response**
- `opencli chatgpt-web read` ⚠️
  - still needs additional stabilization

So the key result is already established:

> A Linux / Chrome / ChatGPT Web adapter for OpenCLI is feasible, and the `ask` path can be made to work end-to-end.

## Core idea

The most important technical insight in this project is that OpenCLI's browser support is not just a collection of helper methods.

Its real control path is:

**CLI / adapter → Page abstraction → daemon → extension / CDP → Chrome → result back**

On top of that, the adapter uses polling loops such as:

- `waitForReady()`
- `waitForAssistantResponse()`

This combination is what makes browser-backed CLI automation viable on modern SPA websites like ChatGPT Web.

## Repository contents

### Adapter

- `chatgpt-web.js`
  - the current adapter prototype

### Final documents

- `OPENCLI_TECHNICAL_ANALYSIS_PRO.txt`
  - full technical text source
- `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.docx`
  - teaching-oriented review version with diagrams and annotated explanations
- `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.pdf`
  - finalized PDF export of the teaching-oriented review

### Diagrams

Under `figures/`:

- `figure-1-opencli-architecture`
- `figure-2-adapter-comparison`
- `figure-3-ask-flow`
- `figure-4-debugging-map`
- `figure-5-page-layering` ← Figure A
- `figure-6-ask-control-loops` ← Figure B

Each figure is stored as:

- `.drawio`
- `.png`

### Helper script

- `generate_opencli_figures.py`
  - regenerates the draw.io-based figure set

## What the final documentation focuses on

The final teaching-oriented document focuses on four things:

1. **How OpenCLI is structured**
   - `~/.opencli`
   - npm-installed core runtime
   - daemon / extension / browser responsibilities

2. **Why the built-in adapter fails on Ubuntu**
   - platform mismatch
   - desktop-app automation vs web automation

3. **How the new `chatgpt-web` adapter works**
   - status/open/new/debug/ask/read
   - prompt flow
   - response extraction

4. **How to understand the control loops**
   - command-forwarding loop
   - state-polling loop
   - annotated explanations of `goto()`, `evaluate()`, and the `ask` flow

## Recommended reading order

If you want the cleanest path through the project, read in this order:

1. `README.md`
2. `OPENCLI_TECHNICAL_ANALYSIS_PRO.txt`
3. `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.docx`
4. `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.pdf`

## Example commands

```bash
opencli doctor
opencli list
opencli chatgpt-web status
opencli chatgpt-web new
opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"
opencli chatgpt-web read
```

## Limitations

Current known limitation:

- `read` is not yet as reliable as `ask`

The adapter is therefore best used today with:

1. `status`
2. `new`
3. `ask`

and not as heavily with `read` until further selector / extraction hardening is done.

## Suggested next steps

- stabilize `read`
- add model switching
- add conversation/history support
- add attachment upload support
- package the adapter into a cleaner standalone OpenCLI plugin structure
- add regression tests for DOM drift
