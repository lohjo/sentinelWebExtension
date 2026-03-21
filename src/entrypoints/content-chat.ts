import { getScrapedMessages } from '../lib/chat-scrapers';
import type { ScrapedMessage } from '../lib/chat-scrapers';

const MESSAGE_TYPE_GET_SCRAPED_MESSAGES = 'get-scraped-messages';

type GetScrapedMessagesResponse = ScrapedMessage[] | { __error: string };

export default defineContentScript({
  matches: [
    '*://*.facebook.com/*',
    '*://*.messenger.com/*',
    '*://web.telegram.org/*',
    '*://web.whatsapp.com/*',
  ],
  main() {
    browser.runtime.onMessage.addListener(
      (
        message: unknown,
        _sender: unknown,
        sendResponse: (response: GetScrapedMessagesResponse) => void
      ) => {
        if (
          !message ||
          typeof message !== 'object' ||
          (message as { type?: string }).type !== MESSAGE_TYPE_GET_SCRAPED_MESSAGES
        ) {
          return false;
        }
        try {
          const messages = getScrapedMessages(location.hostname);
          sendResponse(messages);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to scrape messages';
          sendResponse({ __error: errorMessage });
        }
        return true;
      }
    );
  },
});
