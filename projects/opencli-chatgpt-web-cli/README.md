# opencli-chatgpt-web-cli

ChatGPT Web CLI adapter prototype for OpenCLI on Ubuntu / Linux using Google Chrome login state.

## Overview

This project documents and prototypes a new `chatgpt-web` adapter for OpenCLI.

The built-in `opencli chatgpt` adapter is oriented toward macOS Desktop App automation and depends on tools such as:

- `osascript`
- `pbcopy`
- `pbpaste`

That route is unsuitable for Ubuntu / Linux. This project instead explores a browser-backed path using:

- OpenCLI browser/page abstraction
- OpenCLI daemon + browser extension bridge
- Google Chrome logged-in session
- ChatGPT Web

## Latest additions in this round

This repository has been expanded beyond the original prototype and now includes:

- a teaching-oriented technical review document
- a final PDF version of the teaching-oriented document
- loop-specific explanation sections with code annotations
- two additional focused diagrams:
  - Figure A: Page abstraction layering
  - Figure B: `chatgpt-web ask` control loops
- a fuller figure set under `figures/`
- supporting text assets used to build the review documents

## Current validated status

Validated on the target Ubuntu machine:

- `opencli chatgpt-web status` ✅
- `opencli chatgpt-web open` ✅
- `opencli chatgpt-web new` ✅
- `opencli chatgpt-web debug` ✅
- `opencli chatgpt-web ask "..."` ✅
  - verified with a non-empty assistant response
- `opencli chatgpt-web read` ⚠️
  - still needs further stabilization

## Why this project exists

The central problem is not whether OpenCLI can control ChatGPT in general, but that the existing built-in adapter follows the wrong execution path for Ubuntu.

The built-in adapter uses a macOS desktop-app model. This project explores a web-native model instead.

That means the important engineering questions are:

1. How OpenCLI structures browser automation through `Page`
2. How commands are forwarded to the daemon and then to Chrome
3. How a ChatGPT Web adapter can perform:
   - page opening
   - page readiness checks
   - new conversation creation
   - prompt input
   - submit fallback
   - assistant response extraction

## Key technical idea

The most important architectural idea in this project is that OpenCLI's `Page` layer is not just a bag of helper methods.

It acts as a control bridge:

CLI / adapter → Page abstraction → daemon → extension / CDP → Chrome → result back

And on top of that, the adapter implements polling loops such as:

- `waitForReady()`
- `waitForAssistantResponse()`

This combination is what makes browser-backed CLI automation feasible on SPA-style websites like ChatGPT Web.

## Project contents

### Adapter prototype

- `chatgpt-web.js`
  - current prototype adapter

### Core reports

- `OPENCLI_CHATGPT_WEB_REPORT.md`
- `OPENCLI_CHATGPT_WEB_REPORT.pdf`
- `OPENCLI_CHATGPT_WEB_REPORT.txt`

### Technical analysis documents

- `OPENCLI_TECHNICAL_ANALYSIS.md`
- `OPENCLI_TECHNICAL_ANALYSIS.pdf`
- `OPENCLI_TECHNICAL_ANALYSIS_PRO.md`
- `OPENCLI_TECHNICAL_ANALYSIS_PRO.txt`
- `OPENCLI_TECHNICAL_ANALYSIS_PRO.docx`

### Review and teaching documents

- `OPENCLI_TECHNICAL_ANALYSIS_WITH_DIAGRAMS.docx`
- `OPENCLI_TECHNICAL_ANALYSIS_LOOPS_ANNOTATED.docx`
- `OPENCLI_TECHNICAL_ANALYSIS_PRO_REVIEW.docx`
- `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW.docx`
- `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.docx`
- `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.pdf`

### Supporting text assets

- `CODEX_TASK.md`
- `FIGURES_PLAN.md`
- `LOOPS_EXPLAINER.txt`
- `TEACHING_ADDON.txt`

### Diagram generation

- `generate_opencli_figures.py`

### Diagrams under `figures/`

- `figure-1-opencli-architecture`
- `figure-2-adapter-comparison`
- `figure-3-ask-flow`
- `figure-4-debugging-map`
- `figure-5-page-layering` ← Figure A
- `figure-6-ask-control-loops` ← Figure B

Each diagram is stored as both:

- `.drawio`
- `.png`

## What the newer documentation adds

Compared with the earlier report versions, the newer review documents explicitly add:

- a teaching-style explanation of the Page abstraction layer
- annotated discussion of control loops
- clearer separation between:
  - command-forwarding loop
  - state-polling loop
- code-oriented explanation of:
  - `goto()`
  - `evaluate()`
  - `waitForReady()`
  - `waitForAssistantResponse()`
- additional diagrams dedicated to explaining these loops

## Recommended reading order

If you are reading this project for the first time, use this order:

1. `README.md`
2. `OPENCLI_CHATGPT_WEB_REPORT.md`
3. `OPENCLI_TECHNICAL_ANALYSIS_PRO.txt`
4. `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.docx`
5. `OPENCLI_TECHNICAL_ANALYSIS_TEACHING_REVIEW_V2.pdf`

## Notable findings

1. The original built-in ChatGPT adapter is platform-misaligned for Ubuntu
2. OpenCLI's browser/page abstraction is sufficient to build a new web-native adapter
3. `ask` is the hardest part because it depends on:
   - correct tab targeting
   - DOM selection
   - React state synchronization
   - submit triggering
   - assistant response detection
4. AI-assisted development works best when:
   - a human sets up the environment
   - the problem is narrowed precisely
   - Codex is used to fix the last difficult section rather than generate everything blindly

## Example commands

```bash
opencli doctor
opencli list
opencli chatgpt-web status
opencli chatgpt-web new
opencli chatgpt-web ask "今天天氣如何？請用繁體中文簡短回答。"
opencli chatgpt-web read
```

## Recommended next steps

1. Stabilize `read`
2. Add conversation/history support
3. Add model switching support
4. Add attachment upload support
5. Package this into a cleaner standalone OpenCLI plugin structure
6. Add regression tests for DOM/selector drift
