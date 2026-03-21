import type { ScrapedMessage } from './types';

const UNKNOWN_SENDER = 'Unknown';

export function scrapeFallback(): ScrapedMessage[] {
  if (typeof document === 'undefined') return [];
  const bodyText = document.body?.innerText?.trim() ?? '';
  if (!bodyText) return [];
  const snippet = bodyText.slice(0, 5000).replace(/\s+/g, ' ');
  return [{ sender: UNKNOWN_SENDER, text: snippet }];
}

export function scrapeFacebook(): ScrapedMessage[] {
  const messages: ScrapedMessage[] = [];
  const listItems = document.querySelectorAll('[role="listitem"]');
  for (const li of listItems) {
    const text = (li as HTMLElement).innerText?.trim();
    if (!text) continue;
    const sender = UNKNOWN_SENDER;
    messages.push({ sender, text });
  }
  if (messages.length > 0) return messages;
  return scrapeFallback();
}

export function scrapeMessenger(): ScrapedMessage[] {
  const messages: ScrapedMessage[] = [];
  const bubbles = document.querySelectorAll('[role="listitem"], [data-testid="message-container"], .msg');
  for (const el of bubbles) {
    const text = (el as HTMLElement).innerText?.trim();
    if (!text) continue;
    messages.push({ sender: UNKNOWN_SENDER, text });
  }
  if (messages.length > 0) return messages;
  return scrapeFallback();
}

export function scrapeTelegram(): ScrapedMessage[] {
  const messages: ScrapedMessage[] = [];
  const messageEls = document.querySelectorAll('.message, [data-peer-id] .bubble-content');
  for (const el of messageEls) {
    const text = (el as HTMLElement).innerText?.trim();
    if (!text) continue;
    messages.push({ sender: UNKNOWN_SENDER, text });
  }
  if (messages.length > 0) return messages;
  return scrapeFallback();
}

export function scrapeWhatsApp(): ScrapedMessage[] {
  const messages: ScrapedMessage[] = [];
  const containers = document.querySelectorAll('[data-testid="msg-container"], [data-id]');
  for (const el of containers) {
    const text = (el as HTMLElement).innerText?.trim();
    if (!text) continue;
    messages.push({ sender: UNKNOWN_SENDER, text });
  }
  if (messages.length > 0) return messages;
  return scrapeFallback();
}
