import { cli, Strategy } from 'file:///home/wade/.npm-global/lib/node_modules/@jackwener/opencli/dist/src/registry-api.js';
import { Page } from 'file:///home/wade/.npm-global/lib/node_modules/@jackwener/opencli/dist/src/browser/page.js';

const CHATGPT_URL = 'https://chatgpt.com/';
const READY_TIMEOUT_SECONDS = 20;
const SEND_BUTTON_SELECTOR = [
  'button[data-testid="send-button"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="傳送"]',
  'button[aria-label*="发送"]',
].join(', ');
const STOP_BUTTON_SELECTOR = [
  'button[aria-label*="Stop"]',
  'button[aria-label*="停止"]',
  'button[aria-label*="中止"]',
].join(', ');
const COMPOSER_SELECTOR = [
  'textarea',
  'div[contenteditable="true"]',
  '[data-testid="composer-input"]',
].join(', ');

async function ensureChatGPT(page) {
  try {
    const tabs = await page.tabs();
    const idx = Array.isArray(tabs)
      ? tabs.findIndex(t => (t?.url || '').includes('chatgpt.com'))
      : -1;
    if (idx >= 0) {
      await page.selectTab(idx);
      return;
    }
  } catch {
    // ignore tab lookup errors
  }
  await page.goto(CHATGPT_URL);
  await page.wait(2);
}

async function pageSnapshot(page) {
  return page.evaluate(`() => {
    const cleanText = (value) => (typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : '');
    const composer = document.querySelector(${JSON.stringify(COMPOSER_SELECTOR)});
    const sendButton = document.querySelector(${JSON.stringify(SEND_BUTTON_SELECTOR)});
    const stopButton = document.querySelector(${JSON.stringify(STOP_BUTTON_SELECTOR)});
    const loginMarkers = [
      'button[data-testid="login-button"]',
      'a[href*="auth/login"]',
      'button[aria-label*="Log in"]',
      'button[aria-label*="登入"]'
    ].some(sel => !!document.querySelector(sel));

    const articleNodes = Array.from(document.querySelectorAll('article'));
    const articleTexts = articleNodes
      .map(el => cleanText(el.innerText || el.textContent || ''))
      .filter(Boolean);
    const messageNodes = Array.from(document.querySelectorAll('[data-message-author-role]'));
    const messages = messageNodes
      .map(el => ({
        role: el.getAttribute('data-message-author-role') || '',
        text: cleanText(el.innerText || el.textContent || '')
      }))
      .filter(item => item.role && item.text);
    const assistantTexts = messages.filter(item => item.role === 'assistant').map(item => item.text);
    const userTexts = messages.filter(item => item.role === 'user').map(item => item.text);
    const conversationNodes = Array.from(document.querySelectorAll('main article, [data-message-author-role], main [class*="conversation"], nav, aside'));
    const conversationPreview = conversationNodes
      .map(el => cleanText(el.innerText || el.textContent || ''))
      .filter(Boolean)
      .slice(0, 20);

    return {
      url: location.href,
      title: document.title,
      composer: !!composer,
      composerTag: composer?.tagName || '',
      composerText: composer ? cleanText((composer.value || composer.textContent || '').slice(0, 200)) : '',
      sendButton: !!sendButton,
      sendButtonEnabled: !!(sendButton && !sendButton.disabled),
      stopButton: !!stopButton,
      loginMarkers,
      articleCount: articleNodes.length,
      messageCount: messages.length,
      assistantCount: assistantTexts.length,
      articleTexts,
      assistantTexts,
      userTexts,
      conversationPreview,
      lastArticleText: articleTexts.length ? articleTexts[articleTexts.length - 1] : ''
    };
  }`);
}

async function waitForReady(page, timeoutSeconds = READY_TIMEOUT_SECONDS) {
  const max = Math.max(1, timeoutSeconds);
  for (let i = 0; i < max; i++) {
    const snap = await pageSnapshot(page);
    if (snap.composer || snap.loginMarkers) return snap;
    await page.wait(1);
  }
  return pageSnapshot(page);
}

async function clickNewChat(page) {
  return page.evaluate(`() => {
    const selectors = [
      'a[href="/"]',
      'a[href*="/?"]',
      'button[aria-label*="New chat"]',
      'button[aria-label*="新對話"]',
      '[data-testid="create-new-chat-button"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        return { ok: true, selector: sel };
      }
    }
    return { ok: false, reason: 'new-chat-control-not-found' };
  }`);
}

async function focusComposerAndType(page, text) {
  const prepared = await page.evaluate(`() => {
    const cleanText = (value) => (typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : '');
    const el = document.querySelector(${JSON.stringify(COMPOSER_SELECTOR)});
    if (!el) return { ok: false, reason: 'composer-not-found' };

    el.focus();
    el.click?.();

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) nativeSetter.call(el, '');
      else el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, method: el.tagName.toLowerCase(), value: cleanText(el.value || '') };
    }

    if (el instanceof HTMLElement && el.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('delete', false);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true, method: 'contenteditable', value: cleanText(el.textContent || '') };
    }

    return { ok: false, reason: 'unsupported-composer-element', tag: el.tagName || '' };
  }`);

  if (!prepared?.ok) return prepared;

  await page.nativeType(text);

  for (let i = 0; i < 10; i++) {
    const snap = await pageSnapshot(page);
    const composerText = (snap.composerText || '').replace(/\s+/g, ' ').trim();
    const expectedText = String(text || '').replace(/\s+/g, ' ').trim();
    if (composerText === expectedText || snap.sendButtonEnabled) {
      return { ok: true, method: `native:${prepared.method}`, value: snap.composerText || '' };
    }
    await page.wait(1);
  }

  const snap = await pageSnapshot(page);
  return {
    ok: !!snap.composerText,
    method: `native:${prepared.method}`,
    value: snap.composerText || '',
    reason: snap.composerText ? undefined : 'typed-text-not-observed',
  };
}

async function submitComposer(page) {
  const clicked = await page.evaluate(`() => {
    const sendBtn = document.querySelector(${JSON.stringify(SEND_BUTTON_SELECTOR)});
    if (!(sendBtn instanceof HTMLButtonElement) || sendBtn.disabled) {
      return { ok: false, reason: 'send-button-not-ready' };
    }
    sendBtn.click();
    return { ok: true, method: 'button' };
  }`);

  if (clicked?.ok) return clicked;

  const composer = await page.evaluate(`() => {
    const el = document.querySelector(${JSON.stringify(COMPOSER_SELECTOR)});
    if (!el) return { ok: false, reason: 'composer-not-found' };
    el.focus();
    return { ok: true };
  }`);

  if (!composer?.ok) return composer;

  await page.nativeKeyPress('Enter');

  for (let i = 0; i < 5; i++) {
    const snap = await pageSnapshot(page);
    if (snap.stopButton || !snap.sendButtonEnabled || !snap.composerText) {
      return { ok: true, method: 'enter', generating: snap.stopButton };
    }
    await page.wait(1);
  }

  const retryClick = await page.evaluate(`() => {
    const sendBtn = document.querySelector(${JSON.stringify(SEND_BUTTON_SELECTOR)});
    if (!(sendBtn instanceof HTMLButtonElement) || sendBtn.disabled) {
      return { ok: false, reason: 'submit-not-observed' };
    }
    sendBtn.click();
    return { ok: true, method: 'enter+button' };
  }`);

  return retryClick;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function chooseLatestAssistantText(snap, promptText = '') {
  const normalizedPrompt = normalizeText(promptText);
  const assistantCandidates = (snap.assistantTexts || []).map(normalizeText).filter(Boolean);
  const fallbackCandidates = (snap.articleTexts || []).map(normalizeText).filter(Boolean);
  const preferred = assistantCandidates.length ? assistantCandidates : fallbackCandidates;
  const filtered = preferred.filter(text => text && text !== normalizedPrompt);
  return filtered.length ? filtered[filtered.length - 1] : '';
}

async function readLatestAssistantText(page, { retries = 4, waitSeconds = 1, promptText = '' } = {}) {
  let last = '';
  let stableCount = 0;
  for (let i = 0; i < retries; i++) {
    const snap = await pageSnapshot(page);
    const current = chooseLatestAssistantText(snap, promptText);
    if (current) {
      if (current === last) {
        stableCount += 1;
      } else {
        last = current;
        stableCount = 0;
      }
      if (stableCount >= 1 || !snap.stopButton) {
        return current;
      }
    }
    if (i < retries - 1) {
      await page.wait(waitSeconds);
    }
  }
  return last;
}

async function waitForAssistantResponse(page, beforeAssistantTexts = [], promptText = '', timeoutSeconds = 60) {
  let lastText = '';
  let stableCount = 0;
  const beforeSet = new Set((beforeAssistantTexts || []).map(normalizeText).filter(Boolean));
  const normalizedPrompt = normalizeText(promptText);
  for (let i = 0; i < timeoutSeconds; i++) {
    const snap = await pageSnapshot(page);
    const assistantCandidates = (snap.assistantTexts || []).map(normalizeText).filter(Boolean);
    const fallbackCandidates = (snap.articleTexts || []).map(normalizeText).filter(Boolean);
    const candidates = assistantCandidates.length ? assistantCandidates : fallbackCandidates;
    const fresh = candidates.filter(text => text && text !== normalizedPrompt && !beforeSet.has(text));
    if (fresh.length) {
      const latest = fresh[fresh.length - 1];
      if (latest === lastText) {
        stableCount += 1;
      } else {
        lastText = latest;
        stableCount = 0;
      }
      if (!snap.stopButton && stableCount >= 1) return latest;
    }
    await page.wait(1);
  }
  return lastText;
}

cli({
  site: 'chatgpt-web',
  name: 'status',
  description: 'Check ChatGPT Web page availability and likely login/composer state in Chrome',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['url', 'title', 'composer', 'loginMarkers', 'articleCount'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    const snap = await waitForReady(page);
    return [{
      url: snap.url,
      title: snap.title,
      composer: String(snap.composer),
      loginMarkers: String(snap.loginMarkers),
      articleCount: String(snap.articleCount),
    }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'open',
  description: 'Open ChatGPT Web in Chrome and report page state',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['url', 'title', 'composer', 'loginMarkers'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    const snap = await waitForReady(page);
    return [{
      url: snap.url,
      title: snap.title,
      composer: String(snap.composer),
      loginMarkers: String(snap.loginMarkers),
    }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'read',
  description: 'Read the latest visible ChatGPT Web response/article text',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['text'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    await waitForReady(page);
    const text = await readLatestAssistantText(page, { retries: 5, waitSeconds: 1 });
    return [{ text: text || '' }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'debug',
  description: 'Dump ChatGPT Web page state useful for selector debugging',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['title', 'composerTag', 'composerText', 'sendButton', 'loginMarkers', 'articleCount', 'messageCount', 'assistantCount', 'lastArticleText'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    const snap = await waitForReady(page);
    return [{
      title: snap.title,
      composerTag: snap.composerTag,
      composerText: snap.composerText,
      sendButton: String(snap.sendButtonEnabled),
      loginMarkers: String(snap.loginMarkers),
      articleCount: String(snap.articleCount),
      messageCount: String(snap.messageCount),
      assistantCount: String(snap.assistantCount),
      lastArticleText: snap.lastArticleText || '',
    }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'scan-dom',
  description: 'Scan visible ChatGPT DOM-derived state for debugging selectors and layout changes',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['url', 'title', 'composer', 'composerTag', 'sendButton', 'stopButton', 'loginMarkers', 'articleCount', 'messageCount', 'assistantCount'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    const snap = await waitForReady(page);
    return [{
      url: snap.url,
      title: snap.title,
      composer: String(snap.composer),
      composerTag: snap.composerTag,
      sendButton: String(snap.sendButtonEnabled),
      stopButton: String(snap.stopButton),
      loginMarkers: String(snap.loginMarkers),
      articleCount: String(snap.articleCount),
      messageCount: String(snap.messageCount),
      assistantCount: String(snap.assistantCount),
    }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'scan-conversation',
  description: 'Inspect the visible conversation and return the latest user/assistant text snippets',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['latestUser', 'latestAssistant', 'conversationPreview'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    const snap = await waitForReady(page);
    return [{
      latestUser: (snap.userTexts || []).length ? snap.userTexts[snap.userTexts.length - 1] : '',
      latestAssistant: chooseLatestAssistantText(snap),
      conversationPreview: (snap.conversationPreview || []).slice(0, 5).join(' | '),
    }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'new',
  description: 'Try to start a new ChatGPT Web conversation',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['status'],
  func: async () => {
    const page = new Page('default');
    await ensureChatGPT(page);
    const result = await clickNewChat(page);
    await page.wait(2);
    return [{ status: result.ok ? `ok:${result.selector || 'clicked'}` : `error:${result.reason}` }];
  },
});

cli({
  site: 'chatgpt-web',
  name: 'ask',
  description: 'Send a prompt to ChatGPT Web in Chrome and wait for the latest response',
  domain: 'chatgpt.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'text', required: true, positional: true, help: 'Prompt to send' },
    { name: 'timeout', required: false, help: 'Max seconds to wait for response', default: '60' },
  ],
  columns: ['role', 'text'],
  func: async (_page, kwargs) => {
    const page = new Page('default');
    await ensureChatGPT(page);
    await clickNewChat(page);
    await page.wait(2);
    const snap = await waitForReady(page);
    if (!snap.composer) {
      return [{ role: 'system', text: snap.loginMarkers ? 'ChatGPT page appears to require login.' : 'Composer not found.' }];
    }

    const beforeAssistantTexts = snap.assistantTexts?.length ? snap.assistantTexts : (snap.articleTexts || []);
    const typed = await focusComposerAndType(page, kwargs.text);
    if (!typed?.ok) {
      return [{ role: 'system', text: `Unable to type into composer: ${typed?.reason || 'unknown'}` }];
    }

    await page.wait(1);
    const submit = await submitComposer(page);
    if (!submit?.ok) {
      return [{ role: 'system', text: `Unable to submit prompt: ${submit?.reason || 'unknown'}` }];
    }

    const timeout = parseInt(kwargs.timeout, 10) || 60;
    const response = await waitForAssistantResponse(page, beforeAssistantTexts, kwargs.text, timeout);
    return [
      { role: 'user', text: kwargs.text },
      { role: 'assistant', text: response || '' },
    ];
  },
});
