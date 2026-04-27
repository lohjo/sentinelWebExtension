import { DefaultScraper } from "@/lib/services/scrapers/default.scraper";
import { ScrapeError } from "@/lib/services/scraper.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Article Title</title>
  <meta property="og:title" content="OG Title Override" />
  <meta property="og:description" content="OG description of the article" />
  <meta property="og:image" content="https://example.com/image.jpg" />
  <meta name="description" content="Meta description fallback" />
</head>
<body>
  <nav>Navigation links</nav>
  <header>Site header</header>
  <article>
    <p>This is the main article content about an important topic.</p>
    <p>It contains multiple paragraphs of information.</p>
  </article>
  <footer>Site footer</footer>
  <script>console.log('should be removed');</script>
</body>
</html>
`;

function mockSuccessResponse(html: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve(html),
  });
}

const scraper = new DefaultScraper();

describe("DefaultScraper", () => {
  it("extracts title from og:title meta tag", async () => {
    mockSuccessResponse(sampleHtml);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.title).toBe("OG Title Override");
  });

  it("falls back to title tag when og:title is missing", async () => {
    const html = `<html><head><title>Fallback Title</title></head><body><p>Content</p></body></html>`;
    mockSuccessResponse(html);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.title).toBe("Fallback Title");
  });

  it("extracts description from og:description", async () => {
    mockSuccessResponse(sampleHtml);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.description).toBe("OG description of the article");
  });

  it("falls back to meta description when og:description is missing", async () => {
    const html = `<html><head><meta name="description" content="Fallback desc" /></head><body><p>Content</p></body></html>`;
    mockSuccessResponse(html);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.description).toBe("Fallback desc");
  });

  it("extracts thumbnail from og:image", async () => {
    mockSuccessResponse(sampleHtml);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.thumbnailUrl).toBe("https://example.com/image.jpg");
  });

  it("returns null thumbnailUrl when og:image is missing", async () => {
    const html = `<html><head><title>No Image</title></head><body><p>Content</p></body></html>`;
    mockSuccessResponse(html);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.thumbnailUrl).toBeNull();
  });

  it("extracts article content and strips nav, footer, script, style", async () => {
    mockSuccessResponse(sampleHtml);

    const result = await scraper.scrape("https://example.com/article");

    expect(result.content).toContain("main article content");
    expect(result.content).toContain("multiple paragraphs");
    expect(result.content).not.toContain("Navigation links");
    expect(result.content).not.toContain("Site footer");
    expect(result.content).not.toContain("should be removed");
  });

  it("falls back to body text when no article or main element exists", async () => {
    const html = `<html><head><title>Simple</title></head><body><div><p>Body content here</p></div></body></html>`;
    mockSuccessResponse(html);

    const result = await scraper.scrape("https://example.com/page");

    expect(result.content).toContain("Body content here");
  });

  it("truncates content exceeding max length", async () => {
    const longContent = "a".repeat(20_000);
    const html = `<html><body><article>${longContent}</article></body></html>`;
    mockSuccessResponse(html);

    const result = await scraper.scrape("https://example.com/long");

    expect(result.content.length).toBe(10_000);
  });

  it("throws ScrapeError for non-200 HTTP status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(scraper.scrape("https://example.com/missing")).rejects.toThrow(
      ScrapeError
    );
    await expect(
      scraper.scrape("https://example.com/missing")
    ).rejects.toMatchObject({ message: "HTTP 404: Not Found" });
  });

  it("throws ScrapeError for network errors", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(scraper.scrape("https://example.com/down")).rejects.toThrow(
      ScrapeError
    );
    await expect(scraper.scrape("https://example.com/down")).rejects.toMatchObject({
      message: expect.stringContaining("ECONNREFUSED"),
    });
  });

  it("includes the URL in ScrapeError", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));

    try {
      await scraper.scrape("https://example.com/timeout");
    } catch (error) {
      expect(error).toBeInstanceOf(ScrapeError);
      expect((error as ScrapeError).url).toBe("https://example.com/timeout");
    }
  });

  it("passes User-Agent header in the request", async () => {
    mockSuccessResponse("<html><body>test</body></html>");

    await scraper.scrape("https://example.com/page");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/page",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("HackomaniaBot"),
        }),
      })
    );
  });

  it("returns null title when no title elements exist", async () => {
    const html = `<html><head></head><body><p>No title here</p></body></html>`;
    mockSuccessResponse(html);

    const result = await scraper.scrape("https://example.com/notitle");

    expect(result.title).toBeNull();
  });
});
