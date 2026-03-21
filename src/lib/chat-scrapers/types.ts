export type ScrapedMessage = {
  sender: string;
  text: string;
  timestamp?: string;
  imageUrl?: string;
};

export type ChatPlatform = 'Facebook' | 'Messenger' | 'Telegram' | 'WhatsApp';

const CHAT_DOMAIN_PATTERNS: ReadonlyArray<{ pattern: RegExp; platform: ChatPlatform }> = [
  { pattern: /facebook\.com$/i, platform: 'Facebook' },
  { pattern: /messenger\.com$/i, platform: 'Messenger' },
  { pattern: /web\.telegram\.org$/i, platform: 'Telegram' },
  { pattern: /web\.whatsapp\.com$/i, platform: 'WhatsApp' },
];

export function getChatPlatformFromHostname(hostname: string): ChatPlatform | null {
  const normalized = hostname.replace(/^www\./, '').toLowerCase();
  for (const { pattern, platform } of CHAT_DOMAIN_PATTERNS) {
    if (pattern.test(normalized)) return platform;
  }
  return null;
}

export function isChatDomain(hostname: string): boolean {
  return getChatPlatformFromHostname(hostname) !== null;
}
