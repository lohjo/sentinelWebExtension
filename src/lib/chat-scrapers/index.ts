import type { ScrapedMessage } from './types';
import { getChatPlatformFromHostname } from './types';
import {
  scrapeFallback,
  scrapeFacebook,
  scrapeMessenger,
  scrapeTelegram,
  scrapeWhatsApp,
} from './scrapers';

export type { ScrapedMessage, ChatPlatform } from './types';
export { isChatDomain, getChatPlatformFromHostname } from './types';

export function getScrapedMessages(hostname: string): ScrapedMessage[] {
  const platform = getChatPlatformFromHostname(hostname);
  if (!platform) return scrapeFallback();
  switch (platform) {
    case 'Facebook':
      return scrapeFacebook();
    case 'Messenger':
      return scrapeMessenger();
    case 'Telegram':
      return scrapeTelegram();
    case 'WhatsApp':
      return scrapeWhatsApp();
    default:
      return scrapeFallback();
  }
}
