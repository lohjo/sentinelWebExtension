type VerifyResponse = {
  Verdict: string;
  IsSingaporeSite: boolean;
  Fail: boolean;
};

type VerifyState =
  | { status: 'pending' }
  | { status: 'done'; result: VerifyResponse }
  | { status: 'error'; message: string };

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  main() {
    const isGoogleSearchPage =
      location.hostname.includes('google.') && location.pathname.startsWith('/search');
    if (!isGoogleSearchPage) return;

    const VERIFY_AFTER_MS = 10_000;

    const iconUrl = browser.runtime.getURL('/icon/16.png');
    const verificationImageUrls = {
      'Likely Accurate:true': browser.runtime.getURL('/verification_icon/Accurate-SG.svg'),
      'Likely Accurate:false': browser.runtime.getURL('/verification_icon/Accurate-NonSG.svg'),
      'Unverified:true': browser.runtime.getURL('/verification_icon/Unverified-SG.svg'),
      'Unverified:false': browser.runtime.getURL('/verification_icon/Unverified-NonSG.svg'),
      'Potentially Misleading:true': browser.runtime.getURL(
        '/verification_icon/Misleading-SG.svg',
      ),
      'Potentially Misleading:false': browser.runtime.getURL(
        '/verification_icon/Misleading-NonSG.svg',
      ),
    } as const;

    const verifyStateByUrl = new Map<string, VerifyState>();
    let injectTimeout: number | null = null;
    let readyToVerify = false;

    // Track URLs from newly added DOM nodes to prioritize them.
    const pendingPriorityUrls = new Set<string>();

    window.setTimeout(() => {
      readyToVerify = true;
      scheduleInject();
    }, VERIFY_AFTER_MS);

    const resetBadgeToDefaultLayout = (
      badge: HTMLElement,
      badgeIcon: HTMLImageElement,
      verifyLine: HTMLSpanElement,
    ) => {
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '6px';
      badge.style.marginLeft = '6px';
      badge.style.padding = '1px 4px';
      badge.style.background = '#fff';

      badgeIcon.style.display = '';
      badgeIcon.style.width = '14px';
      badgeIcon.style.height = '14px';
      badgeIcon.style.borderRadius = '3px';
      badgeIcon.style.objectFit = '';

      verifyLine.style.display = '';
    };

    const showImageBadge = (
      badge: HTMLElement,
      badgeIcon: HTMLImageElement,
      imageUrl: string,
    ) => {
      badge.style.display = 'inline-block';
      badge.style.marginLeft = '6px';
      badge.style.padding = '0';
      badge.style.background = 'transparent';

      badgeIcon.src = imageUrl;
      badgeIcon.style.display = 'block';
      badgeIcon.style.width = 'auto';
      badgeIcon.style.height = '20px';
      badgeIcon.style.borderRadius = '0';
      badgeIcon.style.objectFit = 'contain';
    };

    const verifyUrl = async (url: string) => {
      const response = await (browser.runtime.sendMessage({
        type: 'verify-url',
        url,
      }) as Promise<VerifyResponse | { __error?: string }>);

      if (
        response &&
        typeof response === 'object' &&
        '__error' in response &&
        typeof response.__error === 'string'
      ) {
        throw new Error(response.__error);
      }

      return response as VerifyResponse;
    };

    const createBadge = () => {
      const badge = document.createElement('span');
      badge.className = 'natfanclub-domain-badge';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '6px';
      badge.style.marginLeft = '6px';
      badge.style.marginRight = '6px';
      badge.style.padding = '1px 4px';
      badge.style.border = 'none';
      badge.style.borderRadius = '12px';
      badge.style.background = '#fff';
      badge.style.fontSize = '12px';
      badge.style.lineHeight = '1.3';
      badge.style.color = '#374151';
      badge.style.maxWidth = '100%';

      const icon = document.createElement('img');
      icon.className = 'natfanclub-badge-icon';
      icon.src = iconUrl;
      icon.alt = '';
      icon.ariaHidden = 'true';
      icon.width = 14;
      icon.height = 14;
      icon.style.borderRadius = '3px';

      const verifyLine = document.createElement('span');
      verifyLine.className = 'natfanclub-verify-line';
      verifyLine.textContent = 'verifying...';
      verifyLine.style.fontSize = '12px';
      verifyLine.style.color = '#6b7280';
      verifyLine.style.wordBreak = 'break-word';

      badge.append(icon, verifyLine);
      return badge;
    };

    const applyPendingBadge = (
      badge: HTMLElement,
      badgeIcon: HTMLImageElement,
      verifyLine: HTMLSpanElement,
    ) => {
      resetBadgeToDefaultLayout(badge, badgeIcon, verifyLine);
      badgeIcon.src = iconUrl;
      verifyLine.textContent = 'verifying...';
      verifyLine.style.color = '#6b7280';
    };

    const applySuccessBadge = (
      badge: HTMLElement,
      badgeIcon: HTMLImageElement,
      verifyLine: HTMLSpanElement,
      result: VerifyResponse,
    ) => {
      const verificationImageUrl =
        verificationImageUrls[
          `${result.Verdict}:${String(result.IsSingaporeSite)}` as keyof typeof verificationImageUrls
        ];

      if (verificationImageUrl) {
        showImageBadge(badge, badgeIcon, verificationImageUrl);
        verifyLine.textContent = '';
        verifyLine.style.display = 'none';
        return;
      }

      resetBadgeToDefaultLayout(badge, badgeIcon, verifyLine);
      badgeIcon.src = iconUrl;
      verifyLine.textContent = `Verdict=${result.Verdict} | SG=${String(result.IsSingaporeSite)} | Fail=${String(result.Fail)}`;
    };

    const applyErrorBadge = (
      badge: HTMLElement,
      badgeIcon: HTMLImageElement,
      verifyLine: HTMLSpanElement,
      message: string,
    ) => {
      resetBadgeToDefaultLayout(badge, badgeIcon, verifyLine);
      badgeIcon.src = iconUrl;
      verifyLine.textContent = `verify failed: ${message}`;
      verifyLine.style.color = '#b91c1c';
    };

    const scheduleInject = (priorityUrls?: Set<string>) => {
      if (priorityUrls) {
        for (const u of priorityUrls) pendingPriorityUrls.add(u);
      }
      if (injectTimeout !== null) {
        window.clearTimeout(injectTimeout);
      }
      injectTimeout = window.setTimeout(() => {
        injectTimeout = null;
        injectDomainBadge();
      }, 150);
    };

    const requestVerification = (url: string) => {
      const currentState = verifyStateByUrl.get(url);
      if (currentState?.status === 'pending' || currentState?.status === 'done') return;

      verifyStateByUrl.set(url, { status: 'pending' });

      void verifyUrl(url)
        .then((result) => {
          verifyStateByUrl.set(url, { status: 'done', result });
          scheduleInject();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'unknown error';
          verifyStateByUrl.set(url, { status: 'error', message });
          scheduleInject();
        });
    };

    /** Collect result-card URLs from a list of DOM nodes (for mutation prioritization). */
    function extractUrlsFromNodes(nodes: NodeList): Set<string> {
      const urls = new Set<string>();
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const cites = node.querySelectorAll<HTMLElement>('cite');
        if (!cites.length && node.tagName === 'CITE') cites.length; // handled below

        const allCites =
          cites.length > 0
            ? Array.from(cites)
            : node.tagName === 'CITE'
              ? [node]
              : [];

        for (const cite of allCites) {
          const resultCard =
            cite.closest<HTMLElement>('div.MjjYud, div.g, div[data-hveid]') ??
            cite.parentElement;
          if (!resultCard) continue;
          const heading = resultCard.querySelector<HTMLHeadingElement>('h3');
          if (!heading) continue;
          const anchor =
            heading.closest<HTMLAnchorElement>('a[href]') ??
            resultCard.querySelector<HTMLAnchorElement>('a[href]');
          if (anchor?.href) urls.add(anchor.href);
        }
      }
      return urls;
    }

    function injectDomainBadge() {
      const processedCards = new Set<HTMLElement>();
      const cites = document.querySelectorAll<HTMLElement>('#search cite');

      // Sort: newly added (priority) cards come first to get badge + verification sooner.
      const sortedCites = Array.from(cites).sort((a, b) => {
        const aCard =
          a.closest<HTMLElement>('div.MjjYud, div.g, div[data-hveid]') ?? a.parentElement;
        const bCard =
          b.closest<HTMLElement>('div.MjjYud, div.g, div[data-hveid]') ?? b.parentElement;
        const aUrl =
          (
            aCard?.querySelector<HTMLAnchorElement>('h3')?.closest<HTMLAnchorElement>('a[href]') ??
            aCard?.querySelector<HTMLAnchorElement>('a[href]')
          )?.href ?? '';
        const bUrl =
          (
            bCard?.querySelector<HTMLAnchorElement>('h3')?.closest<HTMLAnchorElement>('a[href]') ??
            bCard?.querySelector<HTMLAnchorElement>('a[href]')
          )?.href ?? '';
        const aPriority = pendingPriorityUrls.has(aUrl) ? -1 : 0;
        const bPriority = pendingPriorityUrls.has(bUrl) ? -1 : 0;
        return aPriority - bPriority;
      });

      pendingPriorityUrls.clear();

      for (const cite of sortedCites) {
        const resultCard =
          cite.closest<HTMLElement>('div.MjjYud, div.g, div[data-hveid]') ?? cite.parentElement;
        if (!resultCard || processedCards.has(resultCard)) continue;
        processedCards.add(resultCard);

        const heading = resultCard.querySelector<HTMLHeadingElement>('h3');
        if (!heading) continue;

        const anchor =
          heading.closest<HTMLAnchorElement>('a[href]') ??
          resultCard.querySelector<HTMLAnchorElement>('a[href]');
        const fullUrl = anchor?.href || '';
        if (!fullUrl) continue;

        const existingBadges = Array.from(
          resultCard.querySelectorAll<HTMLElement>('.natfanclub-domain-badge'),
        );
        let badge = existingBadges[0] ?? null;
        for (let i = 1; i < existingBadges.length; i += 1) {
          existingBadges[i].remove();
        }

        if (!badge) {
          badge = createBadge();
        }

        const badgeIcon = badge.querySelector<HTMLImageElement>('.natfanclub-badge-icon');
        const verifyLine = badge.querySelector<HTMLSpanElement>('.natfanclub-verify-line');
        if (!badgeIcon || !verifyLine) continue;

        if (!badge.isConnected || badge.parentElement !== heading || heading.lastChild !== badge) {
          heading.appendChild(badge);
        }

        badge.setAttribute('data-url', fullUrl);

        const verifyState = verifyStateByUrl.get(fullUrl);

        if (!verifyState) {
          applyPendingBadge(badge, badgeIcon, verifyLine);
          if (readyToVerify) {
            requestVerification(fullUrl);
          }
          continue;
        }

        if (verifyState.status === 'pending') {
          applyPendingBadge(badge, badgeIcon, verifyLine);
          continue;
        }

        if (verifyState.status === 'done') {
          applySuccessBadge(badge, badgeIcon, verifyLine, verifyState.result);
          continue;
        }

        applyErrorBadge(badge, badgeIcon, verifyLine, verifyState.message);
      }
    }

    injectDomainBadge();

    const observer = new MutationObserver((mutations) => {
      // Collect only newly added nodes to prioritize them.
      const addedNodes: Node[] = [];
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          addedNodes.push(...Array.from(m.addedNodes));
        }
      }
      if (addedNodes.length > 0) {
        const priorityUrls = extractUrlsFromNodes(
          { length: addedNodes.length, [Symbol.iterator]: addedNodes[Symbol.iterator].bind(addedNodes), ...addedNodes } as unknown as NodeList,
        );
        scheduleInject(priorityUrls.size > 0 ? priorityUrls : undefined);
      } else {
        scheduleInject();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
});