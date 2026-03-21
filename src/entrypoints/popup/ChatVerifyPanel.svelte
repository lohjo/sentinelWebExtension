<script lang="ts">
  import type { ScrapedMessage } from '../../lib/chat-scrapers';
  import { BACKEND_VERIFY_CONTENT_URL } from '../../lib/config';
  import { submitChatReport } from '../../lib/hackomania-api';

  const MESSAGE_TYPE_GET_SCRAPED_MESSAGES = 'get-scraped-messages';
  const CHAT_EXCERPT_TITLE_PREFIX = 'Chat excerpt (';
  const MAX_HEADLINE_LENGTH = 500;
  const MAX_REPORT_DESCRIPTION_LENGTH = 2000;
  const VERDICT_UNVERIFIED = 'Unverified';
  const VERDICT_POTENTIALLY_MISLEADING = 'Potentially misleading';

  let { tabId = undefined, platform = '', authToken = '', language = 'English' } = $props();

  let scrapedMessages = $state<ScrapedMessage[] | null>(null);
  let chatError = $state('');
  let chatLoading = $state(false);
  let selectedIds = $state(new Set<number>());
  let analyzeLoading = $state(false);
  let verdict = $state('');
  let verdictReasoning = $state('');
  let showReportPrompt = $state(false);
  let userChoseToReport = $state(false);
  let reportHeadline = $state('');
  let reportDescription = $state('');
  let reportSubmitting = $state(false);
  let reportSuccess = $state(false);
  let reportError = $state('');

  function isScrapedMessageArray(
    value: unknown
  ): value is ScrapedMessage[] {
    return Array.isArray(value) && value.every(
      (item) =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as ScrapedMessage).sender === 'string' &&
        typeof (item as ScrapedMessage).text === 'string'
    );
  }

  function hasScrapeError(response: unknown): response is { __error: string } {
    return (
      response != null &&
      typeof response === 'object' &&
      '__error' in response &&
      typeof (response as { __error: unknown }).__error === 'string'
    );
  }

  async function requestMessages(): Promise<void> {
    if (tabId == null) return;
    chatLoading = true;
    chatError = '';
    scrapedMessages = null;
    verdict = '';
    verdictReasoning = '';
    showReportPrompt = false;
    userChoseToReport = false;
    reportSuccess = false;
    reportError = '';
    try {
      const response = await browser.tabs.sendMessage(tabId, {
        type: MESSAGE_TYPE_GET_SCRAPED_MESSAGES,
      });
      if (hasScrapeError(response)) {
        chatError = response.__error;
        return;
      }
      if (isScrapedMessageArray(response) && response.length > 0) {
        scrapedMessages = response;
        selectedIds = new Set(response.map((_, i) => i));
      } else {
        chatError = 'No messages found on this page.';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isConnectionError =
        msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection');
      if (isConnectionError && tabId != null) {
        try {
          await browser.scripting.executeScript({
            target: { tabId },
            files: ['content-chat.js'],
          });
          const retryResponse = await browser.tabs.sendMessage(tabId, {
            type: MESSAGE_TYPE_GET_SCRAPED_MESSAGES,
          });
          if (hasScrapeError(retryResponse)) {
            chatError = retryResponse.__error;
            return;
          }
          if (isScrapedMessageArray(retryResponse) && retryResponse.length > 0) {
            scrapedMessages = retryResponse;
            selectedIds = new Set(retryResponse.map((_, i) => i));
          } else {
            chatError = 'No messages found on this page.';
          }
        } catch {
          chatError = 'Reload the chat tab, then try again.';
        }
      } else {
        chatError = msg || 'Failed to get messages from page.';
      }
    } finally {
      chatLoading = false;
    }
  }

  function toggleSelect(index: number): void {
    const next = new Set(selectedIds);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    selectedIds = next;
  }

  function selectAll(): void {
    if (scrapedMessages == null) return;
    selectedIds = new Set(scrapedMessages.map((_, i) => i));
  }

  function clearSelection(): void {
    selectedIds = new Set();
  }

  const selectedMessages = $derived(
    scrapedMessages == null
      ? []
      : scrapedMessages.filter((_, i) => selectedIds.has(i))
  );

  const hasSelection = $derived(selectedIds.size > 0);

  function buildBodyFromSelected(): string {
    return selectedMessages
      .map((m) => `${m.sender}: ${m.text}`)
      .join('\n');
  }

  async function analyze(): Promise<void> {
    if (selectedMessages.length === 0) return;
    analyzeLoading = true;
    verdict = '';
    verdictReasoning = '';
    showReportPrompt = false;
    reportError = '';
    try {
      const body = buildBodyFromSelected();
      const title = `${CHAT_EXCERPT_TITLE_PREFIX}${platform})`;
      const response = await fetch(BACKEND_VERIFY_CONTENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          comments: '',
          language,
        }),
      });
      if (!response.ok) {
        verdict = '';
        verdictReasoning = `Analysis request failed: ${response.status}`;
        return;
      }
      const data = (await response.json()) as {
        CredibilityAssessment?: { Verdict?: string; VerdictReasoning?: string };
      };
      const assessment = data.CredibilityAssessment;
      verdict = typeof assessment?.Verdict === 'string' ? assessment.Verdict : '';
      verdictReasoning =
        typeof assessment?.VerdictReasoning === 'string'
          ? assessment.VerdictReasoning
          : '';
      const isReportable =
        verdict === VERDICT_UNVERIFIED || verdict === VERDICT_POTENTIALLY_MISLEADING;
      showReportPrompt = isReportable;
      userChoseToReport = false;
      if (isReportable) {
        reportHeadline = `Unverified chat excerpt from ${platform}`;
        reportDescription = `Verdict: ${verdict}. ${verdictReasoning}`.slice(
          0,
          MAX_REPORT_DESCRIPTION_LENGTH
        );
      }
    } catch (err) {
      verdict = '';
      verdictReasoning = err instanceof Error ? err.message : 'Analysis failed.';
    } finally {
      analyzeLoading = false;
    }
  }

  async function submitReport(): Promise<void> {
    if (!authToken || selectedMessages.length === 0) return;
    reportSubmitting = true;
    reportError = '';
    reportSuccess = false;
    const headline = reportHeadline.trim().slice(0, MAX_HEADLINE_LENGTH);
    const reportDescriptionTrimmed = reportDescription.trim().slice(0, MAX_REPORT_DESCRIPTION_LENGTH);
    if (!headline || !reportDescriptionTrimmed) {
      reportError = 'Headline and description are required.';
      reportSubmitting = false;
      return;
    }
    const messages = selectedMessages.map((m) => ({
      sender: m.sender.trim() || 'Unknown',
      text: m.text.trim() || '(no text)',
      timestamp: m.timestamp,
    }));
    const result = await submitChatReport(authToken, {
      headline,
      platform,
      messages,
      reportDescription: reportDescriptionTrimmed,
      supportingEvidence: verdictReasoning || undefined,
    });
    reportSubmitting = false;
    if (result.success) {
      reportSuccess = true;
      showReportPrompt = false;
      userChoseToReport = false;
    } else {
      reportError = result.error;
    }
  }

  function getTextSnippet(text: string, maxLen: number = 80): string {
    const t = text.trim();
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen) + '…';
  }
</script>

<section class="chat-panel panel">
  {#if scrapedMessages == null && !chatError}
    <p class="body-copy muted">
      Scrape messages from this chat page to verify them with AI.
    </p>
    <button
      type="button"
      class="chat-action-button chat-cta-button"
      disabled={chatLoading || tabId == null}
      onclick={requestMessages}
    >
      {chatLoading ? 'Loading…' : 'Verify this chat'}
    </button>
  {:else if chatError}
    <p class="body-copy error-copy">{chatError}</p>
    <div class="chat-error-actions">
      <button
        type="button"
        class="chat-action-button"
        disabled={chatLoading}
        onclick={requestMessages}
      >
        Try again
      </button>
      {#if tabId != null && chatError.includes('Reload the chat tab')}
        <button
          type="button"
          class="chat-action-button"
          onclick={async () => {
            if (tabId == null) return;
            await browser.tabs.reload(tabId);
            chatError = '';
          }}
        >
          Reload tab
        </button>
      {/if}
    </div>
  {:else if scrapedMessages != null}
    <div class="chat-message-list">
      <div class="chat-list-actions">
        <button type="button" class="chat-small-button" onclick={selectAll}>Select all</button>
        <button type="button" class="chat-small-button" onclick={clearSelection}>Clear</button>
      </div>
      {#each scrapedMessages as msg, i}
        <label class="chat-message-row">
          <input
            type="checkbox"
            checked={selectedIds.has(i)}
            onchange={() => toggleSelect(i)}
          />
          <span class="chat-sender">{msg.sender}</span>
          <span class="chat-text-snippet">{getTextSnippet(msg.text)}</span>
        </label>
      {/each}
    </div>
    <button
      type="button"
      class="chat-action-button"
      disabled={!hasSelection || analyzeLoading}
      onclick={analyze}
    >
      {analyzeLoading ? 'Analyzing…' : 'Analyze'}
    </button>

    {#if verdict}
      <div class="chat-verdict">
        <p class="mini-label">Verdict</p>
        <p class="body-copy"><strong>{verdict}</strong></p>
        {#if verdictReasoning}
          <p class="body-copy muted">{verdictReasoning}</p>
        {/if}
      </div>

      {#if showReportPrompt}
        <div class="chat-report-prompt">
          <p class="body-copy">Report to Hackomania to raise awareness?</p>
          <div class="chat-report-actions">
            <button type="button" class="chat-action-button" onclick={() => (showReportPrompt = false)}>
              No
            </button>
            <button
              type="button"
              class="chat-action-button primary"
              onclick={() => (userChoseToReport = true)}
            >
              Yes
            </button>
          </div>
        </div>
      {/if}

      {#if userChoseToReport}
        <div class="chat-report-form">
          <label class="chat-form-label" for="chat-headline">Headline</label>
          <input
            id="chat-headline"
            type="text"
            class="chat-input"
            bind:value={reportHeadline}
            maxlength={MAX_HEADLINE_LENGTH}
            placeholder="Short headline for the report"
          />
          <label class="chat-form-label" for="chat-description">Report description</label>
          <textarea
            id="chat-description"
            class="chat-input chat-textarea"
            bind:value={reportDescription}
            maxlength={MAX_REPORT_DESCRIPTION_LENGTH}
            placeholder="Describe why you are reporting"
            rows="3"
          ></textarea>
          {#if reportError}
            <p class="body-copy error-copy">{reportError}</p>
          {/if}
          <button
            type="button"
            class="chat-action-button primary"
            disabled={reportSubmitting}
            onclick={submitReport}
          >
            {reportSubmitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      {/if}
    {/if}

    {#if reportSuccess}
      <p class="body-copy" style="color: var(--success-green, #15803d);">Report submitted successfully.</p>
    {/if}
  {/if}
</section>

<style>
  .chat-panel {
    margin-top: 16px;
  }
  .chat-action-button {
    width: 100%;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 8px;
  }
  .chat-action-button:hover:not(:disabled) {
    background: #e5e7eb;
  }
  .chat-action-button.primary {
    background: #3c5ae1;
    color: white;
    border-color: #3c5ae1;
  }
  .chat-action-button.primary:hover:not(:disabled) {
    background: #1c40dd;
  }
  .chat-action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .chat-error-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
  }
  .chat-cta-button {
    padding: 14px 20px;
    font-size: 16px;
    background: #4f46e5;
    color: white;
    border: none;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
  }
  .chat-cta-button:hover:not(:disabled) {
    background: #4338ca;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  }
  .chat-message-list {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 8px;
    border: 1px solid rgba(79, 72, 61, 0.12);
    border-radius: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.6);
  }
  .chat-list-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .chat-small-button {
    padding: 4px 10px;
    font-size: 12px;
    background: transparent;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
  }
  .chat-small-button:hover {
    background: #f3f4f6;
  }
  .chat-message-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(79, 72, 61, 0.08);
    cursor: pointer;
    font-size: 13px;
  }
  .chat-message-row:last-child {
    border-bottom: none;
  }
  .chat-sender {
    flex-shrink: 0;
    font-weight: 600;
    color: #374151;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chat-text-snippet {
    flex: 1;
    min-width: 0;
    color: #6b7280;
  }
  .chat-verdict {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(79, 72, 61, 0.12);
  }
  .chat-report-prompt {
    margin-top: 12px;
  }
  .chat-report-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .chat-report-form {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .chat-form-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }
  .chat-input {
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
  }
  .chat-textarea {
    resize: vertical;
    min-height: 60px;
  }
</style>
