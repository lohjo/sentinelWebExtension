export default defineBackground(() => {
  const VERIFY_ENDPOINT =
    'https://natfanclub-backend-809989871890.asia-southeast1.run.app/domain_verify';
  const VERIFY_TIMEOUT_MS = 8000;

  let lastActiveTabId: number | undefined = undefined;

  browser.tabs.onActivated.addListener((activeInfo) => {
    lastActiveTabId = activeInfo.tabId;
  });

  void browser.tabs.query({ active: true }).then((tabs) => {
    const t = tabs[0];
    if (t?.id != null) lastActiveTabId = t.id;
  });

  async function getActiveTabInfo(): Promise<{ url: string; tabId: number | undefined }> {
    if (lastActiveTabId != null) {
      try {
        const tab = await browser.tabs.get(lastActiveTabId);
        if (tab?.url) return { url: tab.url, tabId: tab.id };
      } catch {
        /* tab may have been closed */
      }
    }
    try {
      const win = await browser.windows.getLastFocused({ windowTypes: ['normal'] });
      if (win?.id != null) {
        const windowTabs = await browser.tabs.query({ active: true, windowId: win.id });
        const activeTab = windowTabs[0];
        if (activeTab?.url) {
          lastActiveTabId = activeTab.id;
          return { url: activeTab.url, tabId: activeTab.id };
        }
      }
    } catch {
      /* ignore */
    }
    const anyTabs = await browser.tabs.query({ active: true });
    const anyTab = anyTabs[0];
    if (anyTab?.url) {
      lastActiveTabId = anyTab.id;
      return { url: anyTab.url, tabId: anyTab.id };
    }
    return { url: '', tabId: undefined };
  }

  async function verifyDomain(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    try {
      const response = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, language: 'English' }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Verify request failed: ${response.status}`);
      }

      return response.json();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Verify request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return;

    const payload = message as { type?: string; url?: string };

    if (payload.type === 'get-active-tab-info') {
      void getActiveTabInfo()
        .then((info) => sendResponse(info))
        .catch(() => sendResponse({ url: '', tabId: undefined }));
      return true;
    }

    if (payload.type !== 'verify-url' || !payload.url) return;

    void verifyDomain(payload.url)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'unknown error';
        sendResponse({
          __error: message,
        });
      });

    return true;
  });
});
