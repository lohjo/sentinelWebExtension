<script lang="ts">
  import { onMount } from 'svelte';
  import { getStoredAuth, clearStoredAuth } from '../../lib/auth-storage';
  import type { StoredAuth } from '../../lib/auth-storage';
  import { isChatDomain, getChatPlatformFromHostname } from '../../lib/chat-scrapers/types';
  import { FACTGUARD_API_BASE } from '../../lib/config';
  import Login from './Login.svelte';
  import ChatVerifyPanel from './ChatVerifyPanel.svelte';

  const CRAWL_ENDPOINT =
    'https://natfanclub-backend-809989871890.asia-southeast1.run.app/crawl';
  const VERIFY_CONTENT_ENDPOINT =
    'https://natfanclub-backend-809989871890.asia-southeast1.run.app/verify_content';
  const CACHE_STORAGE_KEY = 'verify-cache-v2';
  const PREFERRED_LANGUAGE_STORAGE_KEY = 'preferred-language';

  type CachedVerifyEntry = {
    Summary: string;
    Verdict: string;
    VerdictReasoning: string;
    SupportingSourceCount: number;
    ContradictingSourceCount: number;
    SampleSupportingSources: VerifySourceItem[];
    SampleContradictingSources: VerifySourceItem[];
    ReliableSourceName: string;
    ReliableSourceUrl: string;
    Agreements: string[];
    Differences: string[];
    Analysis: string;
    MissingContext: string[];
    PotentialRisks: string[];
    fetchedAt: string;
  };

  type VerifySourceItem = {
    Name: string;
    URL: string;
    Note: string;
  };

  type RichTextSegment =
    | { type: 'text'; text: string }
    | { type: 'link'; text: string; href: string };

  const languageOptions = ['English', 'Malay', 'Tamil', 'Korean', 'Chinese'] as const;

  let currentUrl = '';
  let summary = '';
  let verdict = '';
  let verdictReasoning = '';
  let supportingSourceCount = 0;
  let contradictingSourceCount = 0;
  let sampleSupportingSources: VerifySourceItem[] = [];
  let sampleContradictingSources: VerifySourceItem[] = [];
  let reliableSource = { Name: '', URL: '' };
  let agreements: string[] = [];
  let differences: string[] = [];
  let comparisonAnalysis = '';
  let missingContext: string[] = [];
  let potentialRisks: string[] = [];
  let error = '';
  let isLoading = false;
  let hasFetched = false;
  let summarySource: 'network' | 'cache' | '' = '';
  let selectedLanguage: (typeof languageOptions)[number] = 'English';

  let auth: StoredAuth | null = null;
  let authCheckDone = false;
  let tabUrlLoaded = false;

  let currentTabId: number | undefined = undefined;

  function getIsChatTab(): boolean {
    if (!currentUrl) return false;
    try {
      return isChatDomain(new URL(currentUrl).hostname);
    } catch {
      return false;
    }
  }

  function getChatPlatform(): string {
    if (!currentUrl) return '';
    try {
      return getChatPlatformFromHostname(new URL(currentUrl).hostname) ?? '';
    } catch {
      return '';
    }
  }

  const summaryFallback =
    'Website brief description and summary will appear here once verification finishes.';

  const extractSummary = (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return '';

    const record = payload as {
      Summary?: unknown;
      contents?: { Summary?: unknown };
      content?: { Summary?: unknown };
    };

    const candidate =
      record.contents?.Summary ?? record.content?.Summary ?? record.Summary ?? '';

    return typeof candidate === 'string' ? candidate : '';
  };

  const extractCrawledContent = (payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return { title: '', body: '', comments: '' };
    }

    const record = payload as {
      Title?: unknown;
      'Body Text'?: unknown;
      Comments?: unknown;
      contents?: {
        Title?: unknown;
        'Body Text'?: unknown;
        Comments?: unknown;
      };
    };

    const source = record.contents ?? record;

    return {
      title: typeof source.Title === 'string' ? source.Title : '',
      body: typeof source['Body Text'] === 'string' ? source['Body Text'] : '',
      comments: typeof source.Comments === 'string' ? source.Comments : '',
    };
  };

  const emptyVerifyDetails = () => ({
    verdict: '',
    verdictReasoning: '',
    supportingSourceCount: 0,
    contradictingSourceCount: 0,
    sampleSupportingSources: [] as VerifySourceItem[],
    sampleContradictingSources: [] as VerifySourceItem[],
    reliableSource: { Name: '', URL: '' },
    agreements: [] as string[],
    differences: [] as string[],
    analysis: '',
    missingContext: [] as string[],
    potentialRisks: [] as string[],
  });

  const extractSourceItems = (value: unknown): VerifySourceItem[] => {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as { Name?: unknown; URL?: unknown; Note?: unknown };

      return [
        {
          Name: typeof record.Name === 'string' ? record.Name : '',
          URL: typeof record.URL === 'string' ? record.URL : '',
          Note: typeof record.Note === 'string' ? record.Note : '',
        },
      ];
    });
  };

  const extractStringList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  };

  const parseTextWithBareUrls = (text: string): RichTextSegment[] => {
    if (!text) return [];

    const segments: RichTextSegment[] = [];
    const urlRegex = /https?:\/\/[^\s)]+/g;
    let lastIndex = 0;

    for (const match of text.matchAll(urlRegex)) {
      const matchText = match[0];
      const start = match.index ?? 0;

      if (start > lastIndex) {
        segments.push({ type: 'text', text: text.slice(lastIndex, start) });
      }

      const href = matchText.replace(/[.,;:!?]+$/, '');
      segments.push({
        type: 'link',
        text: href,
        href,
      });

      lastIndex = start + matchText.length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', text: text.slice(lastIndex) });
    }

    return segments;
  };

  const parseRichTextSegments = (text: string): RichTextSegment[] => {
    if (!text) return [];

    const segments: RichTextSegment[] = [];
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let lastIndex = 0;

    for (const match of text.matchAll(markdownLinkRegex)) {
      const matchText = match[0];
      const start = match.index ?? 0;

      if (start > lastIndex) {
        segments.push(...parseTextWithBareUrls(text.slice(lastIndex, start)));
      }

      const markdownLabel = match[1];
      const markdownUrl = match[2];

      if (markdownLabel && markdownUrl) {
        segments.push({
          type: 'link',
          text: markdownLabel,
          href: markdownUrl,
        });
      }

      lastIndex = start + matchText.length;
    }

    if (lastIndex < text.length) {
      segments.push(...parseTextWithBareUrls(text.slice(lastIndex)));
    }

    return segments;
  };

  const renderableTextFields = (text: string) => parseRichTextSegments(text);

  const extractVerifyDetails = (payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return emptyVerifyDetails();
    }

    const record = payload as {
      CredibilityAssessment?: {
        Verdict?: unknown;
        VerdictReasoning?: unknown;
        SupportingSourceCount?: unknown;
        ContradictingSourceCount?: unknown;
        SampleSupportingSources?: unknown;
        SampleContradictingSources?: unknown;
      };
      DeepComparison?: {
        ReliableSource?: { Name?: unknown; URL?: unknown };
        Agreements?: unknown;
        Differences?: unknown;
        Analysis?: unknown;
      };
      ContextualFlags?: {
        MissingContext?: unknown;
        PotentialRisks?: unknown;
      };
    };

    return {
      verdict:
        typeof record.CredibilityAssessment?.Verdict === 'string'
          ? record.CredibilityAssessment.Verdict
          : '',
      verdictReasoning:
        typeof record.CredibilityAssessment?.VerdictReasoning === 'string'
          ? record.CredibilityAssessment.VerdictReasoning
          : '',
      supportingSourceCount:
        typeof record.CredibilityAssessment?.SupportingSourceCount === 'number'
          ? record.CredibilityAssessment.SupportingSourceCount
          : 0,
      contradictingSourceCount:
        typeof record.CredibilityAssessment?.ContradictingSourceCount === 'number'
          ? record.CredibilityAssessment.ContradictingSourceCount
          : 0,
      sampleSupportingSources: extractSourceItems(
        record.CredibilityAssessment?.SampleSupportingSources,
      ),
      sampleContradictingSources: extractSourceItems(
        record.CredibilityAssessment?.SampleContradictingSources,
      ),
      reliableSource: {
        Name:
          typeof record.DeepComparison?.ReliableSource?.Name === 'string'
            ? record.DeepComparison.ReliableSource.Name
            : '',
        URL:
          typeof record.DeepComparison?.ReliableSource?.URL === 'string'
            ? record.DeepComparison.ReliableSource.URL
            : '',
      },
      agreements: extractStringList(record.DeepComparison?.Agreements),
      differences: extractStringList(record.DeepComparison?.Differences),
      analysis:
        typeof record.DeepComparison?.Analysis === 'string' ? record.DeepComparison.Analysis : '',
      missingContext: extractStringList(record.ContextualFlags?.MissingContext),
      potentialRisks: extractStringList(record.ContextualFlags?.PotentialRisks),
    };
  };

  const getVerificationStatus = (currentVerdict: string) => {
    if (isLoading) return 'Verifying...';

    if (currentVerdict === 'Likely accurate') {
      return 'Verified!';
    }

    if (currentVerdict === 'Unverified') {
      return 'Unverified';
    }

    if (currentVerdict === 'Potentially misleading') {
      return 'Misleading';
    }

    return hasFetched ? 'Unverified' : 'Waiting';
  };

  const getVerificationTone = (currentVerdict: string) => {
    if (isLoading) return 'pending';

    if (currentVerdict === 'Likely accurate') {
      return 'verified';
    }

    if (currentVerdict === 'Unverified') {
      return 'unverified';
    }

    if (currentVerdict === 'Potentially misleading') {
      return 'misleading';
    }

    return hasFetched ? 'unverified' : 'idle';
  };

  const getCacheKey = (url: string, language: string) => `${url}::${language}`;

  const isLanguageOption = (value: string): value is (typeof languageOptions)[number] =>
    languageOptions.includes(value as (typeof languageOptions)[number]);

  const getCachedVerifyEntry = async (cacheKey: string) => {
    const stored = (await browser.storage.local.get(CACHE_STORAGE_KEY)) as {
      [CACHE_STORAGE_KEY]?: Record<string, CachedVerifyEntry>;
    };

    return stored[CACHE_STORAGE_KEY]?.[cacheKey] ?? null;
  };

  const setCachedVerifyEntry = async (cacheKey: string, entry: CachedVerifyEntry) => {
    const stored = (await browser.storage.local.get(CACHE_STORAGE_KEY)) as {
      [CACHE_STORAGE_KEY]?: Record<string, CachedVerifyEntry>;
    };

    const nextCache = {
      ...(stored[CACHE_STORAGE_KEY] ?? {}),
      [cacheKey]: entry,
    };

    await browser.storage.local.set({
      [CACHE_STORAGE_KEY]: nextCache,
    });
  };

  async function loadPreferredLanguage() {
    const stored = (await browser.storage.local.get(PREFERRED_LANGUAGE_STORAGE_KEY)) as {
      [PREFERRED_LANGUAGE_STORAGE_KEY]?: string;
    };

    const storedLanguage = stored[PREFERRED_LANGUAGE_STORAGE_KEY];
    if (storedLanguage && isLanguageOption(storedLanguage)) {
      selectedLanguage = storedLanguage;
    }
  }

  async function savePreferredLanguage() {
    await browser.storage.local.set({
      [PREFERRED_LANGUAGE_STORAGE_KEY]: selectedLanguage,
    });
  }

  async function loadCurrentTabUrl() {
    try {
      const fromBackground = await browser.runtime.sendMessage({
        type: 'get-active-tab-info',
      }) as { url?: string; tabId?: number } | undefined;
      if (fromBackground?.url != null && fromBackground.url !== '') {
        currentUrl = fromBackground.url;
        currentTabId = fromBackground.tabId;
      } else {
        const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        currentUrl = tab?.url ?? '';
        currentTabId = tab?.id;
      }
      if (!currentUrl) {
        throw new Error('현재 탭 URL을 읽지 못했습니다.');
      }
    } catch (err) {
      currentUrl = '';
      currentTabId = undefined;
      error = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    } finally {
      tabUrlLoaded = true;
    }
  }

  async function loadSummary() {
    if (!currentUrl) return;
    if (getIsChatTab()) return;

    const cacheKey = getCacheKey(currentUrl, selectedLanguage);
    isLoading = true;
    hasFetched = true;
    error = '';

    try {
      const cachedEntry = await getCachedVerifyEntry(cacheKey);
      if (cachedEntry) {
        summary = cachedEntry.Summary;
        verdict = cachedEntry.Verdict;
        verdictReasoning = cachedEntry.VerdictReasoning;
        supportingSourceCount = cachedEntry.SupportingSourceCount;
        contradictingSourceCount = cachedEntry.ContradictingSourceCount;
        sampleSupportingSources = cachedEntry.SampleSupportingSources;
        sampleContradictingSources = cachedEntry.SampleContradictingSources;
        reliableSource = {
          Name: cachedEntry.ReliableSourceName,
          URL: cachedEntry.ReliableSourceUrl,
        };
        agreements = cachedEntry.Agreements;
        differences = cachedEntry.Differences;
        comparisonAnalysis = cachedEntry.Analysis;
        missingContext = cachedEntry.MissingContext;
        potentialRisks = cachedEntry.PotentialRisks;
        summarySource = 'cache';
        return;
      }

      const crawlResponse = await fetch(CRAWL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: currentUrl, language: selectedLanguage }),
      });

      if (!crawlResponse.ok) {
        throw new Error(`Crawl request failed: ${crawlResponse.status}`);
      }

      const crawledPayload = (await crawlResponse.json()) as unknown;
      const crawled = extractCrawledContent(crawledPayload);
      summary = crawled.body || extractSummary(crawledPayload);
      summarySource = 'network';

      const verifyContentResponse = await fetch(VERIFY_CONTENT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: crawled.title,
          body: crawled.body,
          comments: crawled.comments,
          language: selectedLanguage,
        }),
      });

      if (!verifyContentResponse.ok) {
        throw new Error(`Verify content request failed: ${verifyContentResponse.status}`);
      }

      const verifyPayload = (await verifyContentResponse.json()) as unknown;
      const verifyDetails = extractVerifyDetails(verifyPayload);
      verdict = verifyDetails.verdict;
      verdictReasoning = verifyDetails.verdictReasoning;
      supportingSourceCount = verifyDetails.supportingSourceCount;
      contradictingSourceCount = verifyDetails.contradictingSourceCount;
      sampleSupportingSources = verifyDetails.sampleSupportingSources;
      sampleContradictingSources = verifyDetails.sampleContradictingSources;
      reliableSource = verifyDetails.reliableSource;
      agreements = verifyDetails.agreements;
      differences = verifyDetails.differences;
      comparisonAnalysis = verifyDetails.analysis;
      missingContext = verifyDetails.missingContext;
      potentialRisks = verifyDetails.potentialRisks;

      await setCachedVerifyEntry(cacheKey, {
        Summary: summary,
        Verdict: verdict,
        VerdictReasoning: verdictReasoning,
        SupportingSourceCount: supportingSourceCount,
        ContradictingSourceCount: contradictingSourceCount,
        SampleSupportingSources: sampleSupportingSources,
        SampleContradictingSources: sampleContradictingSources,
        ReliableSourceName: reliableSource.Name,
        ReliableSourceUrl: reliableSource.URL,
        Agreements: agreements,
        Differences: differences,
        Analysis: comparisonAnalysis,
        MissingContext: missingContext,
        PotentialRisks: potentialRisks,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      summary = '';
      verdict = '';
      verdictReasoning = '';
      supportingSourceCount = 0;
      contradictingSourceCount = 0;
      sampleSupportingSources = [];
      sampleContradictingSources = [];
      reliableSource = { Name: '', URL: '' };
      agreements = [];
      differences = [];
      comparisonAnalysis = '';
      missingContext = [];
      potentialRisks = [];
      summarySource = '';
      error = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  async function handleLanguageChange() {
    await savePreferredLanguage();

    if (!currentUrl) return;

    void loadSummary();
  }

  async function handleLoginSuccess() {
    const stored = await getStoredAuth();
    if (stored) auth = stored;
    if (!auth) return;
    await loadPreferredLanguage();
    await loadCurrentTabUrl();
    await loadSummary();
  }

  async function handleLogout() {
    await clearStoredAuth();
    auth = null;
  }

  onMount(() => {
    void (async () => {
      const stored = await getStoredAuth();
      auth = stored;
      authCheckDone = true;
      if (!auth) return;
      await loadPreferredLanguage();
      await loadCurrentTabUrl();
      await loadSummary();
    })();
  });
</script>

{#if !authCheckDone}
  <div class="auth-loading">Loading…</div>
{:else if !auth}
  <Login onLoginSuccess={handleLoginSuccess} />
{:else if !tabUrlLoaded}
  <div class="auth-loading">Detecting tab…</div>
{:else}
<main class={`popup-shell ${getIsChatTab() ? 'app-tone-neutral' : `app-tone-${getVerificationTone(verdict)}`}`}>
  <div class="popup-main-inner">
    <header class="popup-header">
      <div class="popup-header-left">
        <span class="user-email">{auth.user.email}</span>
        <a
          class="popup-website-link"
          href={FACTGUARD_API_BASE}
          target="_blank"
          rel="noopener noreferrer"
        >
          Report to FactGuard website
        </a>
      </div>
      <button
        type="button"
        class="logout-button"
        onclick={handleLogout}
        title="Log out"
      >
        Log out
      </button>
    </header>

    <nav class="popup-tabs" aria-label="Verification mode">
      <span
        class="popup-tab"
        class:tab-active={getIsChatTab()}
        class:tab-inactive={!getIsChatTab()}
        aria-current={getIsChatTab() ? 'true' : undefined}
      >
        Chat verification
      </span>
      <span
        class="popup-tab"
        class:tab-active={!getIsChatTab()}
        class:tab-inactive={getIsChatTab()}
        aria-current={!getIsChatTab() ? 'true' : undefined}
      >
        Page verification
      </span>
    </nav>

    {#if getIsChatTab()}
    <div class="tab-panel tab-panel-chat" aria-hidden={!getIsChatTab()}>
      <section class="chat-verify-hero">
        <p class="chat-verify-hero-label">Chat verification</p>
        <p class="chat-verify-hero-platform">You're on {getChatPlatform()}</p>
        <ChatVerifyPanel
          tabId={currentTabId}
          platform={getChatPlatform()}
          authToken={auth?.token ?? ''}
          language={selectedLanguage}
        />
      </section>
    </div>
    {:else}
    <div class="tab-panel tab-panel-page" aria-hidden={getIsChatTab()}>
      <section class="hero-card">
        <div class={`status-strip tone-${getVerificationTone(verdict)}`}>
          <div class="status-header">
            <div class="status-row">
              <div class="status-copy">
                <p class="section-label">Verification Status</p>
                <p class="status-text">{getVerificationStatus(verdict)}</p>
              </div>
            </div>

            <label class="language-card">
              <span class="language-label">Language</span>
              <select
                class="language-select"
                bind:value={selectedLanguage}
                disabled={isLoading}
                onchange={handleLanguageChange}
              >
                {#each languageOptions as language}
                  <option value={language}>{language}</option>
                {/each}
              </select>
            </label>
          </div>
        </div>
      </section>

  <section class="panel">
    <p class="section-label">Summary</p>
    {#if error && !summary}
      <p class="body-copy error-copy">{error}</p>
    {:else if summary}
      <p class="body-copy">
        {#each renderableTextFields(summary || summaryFallback) as segment}
          {#if segment.type === 'link'}
            <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
              {segment.text}
            </a>
          {:else}
            {segment.text}
          {/if}
        {/each}
      </p>
      {#if isLoading}
        <p class="source-note muted">Summary loaded. Verifying content consistency...</p>
      {/if}
      {#if error}
        <p class="source-note error-copy">{error}</p>
      {/if}
      {#if summarySource}
        <p class="source-note muted">
          Loaded from {summarySource === 'cache' ? 'local cache' : 'network'}.
        </p>
      {/if}
    {:else if isLoading}
      <p class="body-copy muted">Fetching summary...</p>
    {:else if !hasFetched}
      <p class="body-copy muted">Preparing summary...</p>
    {:else}
      <p class="body-copy">{summaryFallback}</p>
    {/if}
  </section>

  <section class="panel">
    <p class="section-label">Credibility Statistics</p>
    <p class="body-copy">
      {#each renderableTextFields(verdictReasoning || 'Credibility reasoning will appear after verification.') as segment}
        {#if segment.type === 'link'}
          <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
            {segment.text}
          </a>
        {:else}
          {segment.text}
        {/if}
      {/each}
    </p>
    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-number">{supportingSourceCount}</span>
        <span class="stat-label">Supporting Sources</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{contradictingSourceCount}</span>
        <span class="stat-label">Contradicting Sources</span>
      </div>
    </div>
    <div class="detail-stack">
      <div class="source-card">
        <p class="mini-label">Supporting</p>
        {#if sampleSupportingSources.length}
          {#each sampleSupportingSources as source}
            <a class="source-link" href={source.URL} target="_blank" rel="noreferrer">{source.Name}</a>
            <p class="source-note-text">{source.Note}</p>
            <a class="inline-link" href={source.URL} target="_blank" rel="noreferrer">
              Read {source.Name}
            </a>
          {/each}
        {:else}
          <p class="body-copy muted">No supporting samples provided.</p>
        {/if}
      </div>
      <div class="source-card">
        <p class="mini-label">Contradicting</p>
        {#if sampleContradictingSources.length}
          {#each sampleContradictingSources as source}
            <a class="source-link" href={source.URL} target="_blank" rel="noreferrer">{source.Name}</a>
            <p class="source-note-text">{source.Note}</p>
            <a class="inline-link" href={source.URL} target="_blank" rel="noreferrer">
              Read {source.Name}
            </a>
          {/each}
        {:else}
          <p class="body-copy muted">No contradicting samples provided.</p>
        {/if}
      </div>
    </div>
  </section>

  <section class="panel">
    <p class="section-label">Website Content Comparison</p>
    {#if reliableSource.Name}
      <a class="source-link" href={reliableSource.URL} target="_blank" rel="noreferrer">
        Benchmark: {reliableSource.Name}
      </a>
    {:else}
      <p class="body-copy muted">Reliable comparison source will appear here.</p>
    {/if}
    <p class="body-copy comparison-copy">
      {#each renderableTextFields(comparisonAnalysis || 'Comparison analysis will appear after verification.') as segment}
        {#if segment.type === 'link'}
          <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
            {segment.text}
          </a>
        {:else}
          {segment.text}
        {/if}
      {/each}
    </p>
    <div class="detail-stack">
      <div class="comparison-column">
        <p class="mini-label">Agreements</p>
        {#if agreements.length}
          <ul class="list">
            {#each agreements as item}
              <li>
                {#each parseRichTextSegments(item) as segment}
                  {#if segment.type === 'link'}
                    <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
                      {segment.text}
                    </a>
                  {:else}
                    {segment.text}
                  {/if}
                {/each}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="body-copy muted">No key agreements listed.</p>
        {/if}
      </div>
      <div class="comparison-column">
        <p class="mini-label">Differences</p>
        {#if differences.length}
          <ul class="list">
            {#each differences as item}
              <li>
                {#each parseRichTextSegments(item) as segment}
                  {#if segment.type === 'link'}
                    <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
                      {segment.text}
                    </a>
                  {:else}
                    {segment.text}
                  {/if}
                {/each}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="body-copy muted">No key differences listed.</p>
        {/if}
      </div>
    </div>
  </section>

  <section class="panel">
    <p class="section-label">Contextual Flags</p>
    <div class="detail-stack">
      <div class="comparison-column">
        <p class="mini-label">Missing Context</p>
        {#if missingContext.length}
          <ul class="list">
            {#each missingContext as item}
              <li>
                {#each renderableTextFields(item) as segment}
                  {#if segment.type === 'link'}
                    <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
                      {segment.text}
                    </a>
                  {:else}
                    {segment.text}
                  {/if}
                {/each}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="body-copy muted">No missing-context flags reported.</p>
        {/if}
      </div>
      <div class="comparison-column">
        <p class="mini-label">Potential Risks</p>
        {#if potentialRisks.length}
          <ul class="list">
            {#each potentialRisks as item}
              <li>
                {#each renderableTextFields(item) as segment}
                  {#if segment.type === 'link'}
                    <a class="inline-link" href={segment.href} target="_blank" rel="noreferrer">
                      {segment.text}
                    </a>
                  {:else}
                    {segment.text}
                  {/if}
                {/each}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="body-copy muted">No risk flags reported.</p>
        {/if}
      </div>
    </div>
  </section>
  </div>
  {/if}
  </div>
</main>
{/if}

<style>
  .auth-loading {
    padding: 24px 22px;
    font-size: 16px;
    color: #61584b;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .user-email {
    font-size: 12px;
    color: #61584b;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .logout-button {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    background: transparent;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
  }

  .logout-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .popup-shell {
    box-sizing: border-box;
    width: 420px;
    min-height: 640px;
    padding: 24px 22px 18px;
    background: #ffffff;
    transition:
      background-color 2s ease,
      box-shadow 2s ease;
  }

  .popup-main-inner {
    width: 100%;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .popup-header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .popup-website-link {
    font-size: 11px;
    color: #4f46e5;
    text-decoration: none;
  }

  .popup-website-link:hover {
    text-decoration: underline;
  }

  .popup-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0;
  }

  .popup-tab {
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    background: transparent;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
    cursor: default;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .popup-tab.tab-active {
    color: #374151;
    border-bottom-color: #4f46e5;
    cursor: default;
  }

  .popup-tab.tab-inactive {
    opacity: 0.55;
    filter: grayscale(0.4);
    pointer-events: none;
  }

  .tab-panel {
    transition: opacity 0.2s ease, filter 0.2s ease;
  }

  .popup-shell.app-tone-verified {
    background: #d8ead8;
    box-shadow: inset 0 0 80px rgba(76, 175, 80, 0.12);
  }

  .popup-shell.app-tone-neutral {
    background: #ffffff;
  }

  .popup-shell.app-tone-unverified {
    background: #ead8c4;
    box-shadow: inset 0 0 80px rgba(245, 158, 11, 0.14);
  }

  .popup-shell.app-tone-misleading {
    background: #ead1cf;
    box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.14);
  }

  .hero-card {
    display: block;
    margin-bottom: 22px;
  }

  .chat-verify-hero {
    margin-bottom: 20px;
    padding: 20px 18px;
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border: 2px solid #818cf8;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }

  .chat-verify-hero-label {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #4f46e5;
  }

  .chat-verify-hero-platform {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: #3730a3;
  }

  .chat-verify-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .status-strip,
  .panel {
    background: #f7f5f2;
    border: 1px solid rgba(79, 72, 61, 0.12);
    box-shadow: 0 2px 0 rgba(255, 255, 255, 0.35) inset;
  }

  .status-strip {
    position: relative;
    z-index: 1;
    padding: 14px 18px 16px;
    border-width: 2px;
    border-style: solid;
    border-color: rgba(79, 72, 61, 0.12);
    background: #f7f5f2;
    transition:
      background-color 2s ease,
      border-color 2s ease,
      transform 2s ease,
      box-shadow 2s ease;
  }

  .status-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .status-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .status-copy {
    min-width: 0;
  }

  .status-strip.tone-verified {
    border-color: rgba(47, 125, 50, 0.7);
    background: #e7f6e8;
    box-shadow:
      0 2px 0 rgba(255, 255, 255, 0.35) inset,
      0 0 24px rgba(76, 175, 80, 0.38),
      0 0 48px rgba(76, 175, 80, 0.18);
    transform: translateY(-1px);
  }

  .status-strip.tone-unverified {
    border-color: rgba(191, 113, 20, 0.7);
    background: #fff1dc;
    box-shadow:
      0 2px 0 rgba(255, 255, 255, 0.35) inset,
      0 0 24px rgba(245, 158, 11, 0.36),
      0 0 48px rgba(245, 158, 11, 0.18);
    transform: translateY(-1px);
  }

  .status-strip.tone-misleading {
    border-color: rgba(172, 43, 43, 0.72);
    background: #fde8e7;
    box-shadow:
      0 2px 0 rgba(255, 255, 255, 0.35) inset,
      0 0 24px rgba(239, 68, 68, 0.38),
      0 0 48px rgba(239, 68, 68, 0.18);
    transform: translateY(-1px);
  }

  .language-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 124px;
    padding: 10px 12px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.62);
    border: 1px solid rgba(79, 72, 61, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .language-label {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #61584b;
  }

  .language-select {
    width: 100%;
    border: 1px solid rgba(79, 72, 61, 0.18);
    background: #ffffff;
    color: #1b1b1b;
    padding: 10px 12px;
    font-size: 13px;
    border-radius: 999px;
    box-shadow: 0 1px 2px rgba(33, 24, 13, 0.06);
  }

  .language-select:focus {
    outline: none;
    border-color: rgba(79, 72, 61, 0.35);
  }

  .panel {
    margin-bottom: 22px;
    padding: 20px 18px;
  }

  .section-label {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #61584b;
  }

  .status-text {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .body-copy {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
  }

  .muted {
    color: #756d61;
  }

  .error-copy {
    color: #9f1d1d;
  }

  .source-note {
    margin: 12px 0 0;
    font-size: 12px;
    letter-spacing: 0.03em;
  }

  .stats-grid,
  .source-columns,
  .comparison-grid,
  .detail-stack {
    display: grid;
    gap: 12px;
  }

  .stats-grid,
  .source-columns,
  .comparison-grid {
    grid-template-columns: 1fr 1fr;
  }

  .detail-stack {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    margin-top: 16px;
  }

  .stat-box,
  .source-card,
  .comparison-column {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(79, 72, 61, 0.12);
    border-radius: 12px;
    padding: 14px;
  }

  .stat-number {
    display: block;
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label,
  .mini-label {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #61584b;
  }

  .source-columns,
  .comparison-grid,
  .detail-stack {
    margin-top: 16px;
  }

  .source-link {
    display: inline-block;
    margin-top: 8px;
    color: #1b1b1b;
    font-weight: 600;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .inline-link {
    color: #2457a6;
    text-decoration: underline;
    text-underline-offset: 2px;
    overflow-wrap: anywhere;
  }

  .source-note-text,
  .comparison-copy {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.55;
    color: #3d372e;
  }

  .list {
    margin: 8px 0 0;
    padding-left: 18px;
    font-size: 14px;
    line-height: 1.55;
    color: #3d372e;
  }

  .list li + li {
    margin-top: 6px;
  }

</style>
