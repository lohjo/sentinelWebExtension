import { XScraper } from "@/lib/services/scrapers/x.scraper";
import { ScrapeError } from "@/lib/services/scraper.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const scraper = new XScraper();

const mockSyndicationResponse = {
  text: "Breaking: Scientists discover new treatment for common cold. Full study published in Nature journal.",
  user: { name: "ScienceDaily", screen_name: "sciencedaily" },
  mediaDetails: [
    { media_url_https: "https://pbs.twimg.com/media/image1.jpg" },
  ],
};

describe("XScraper", () => {
  it("extracts tweet text as content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSyndicationResponse),
    });

    const result = await scraper.scrape("https://x.com/user/status/123456789");

    expect(result.content).toBe(mockSyndicationResponse.text);
  });

  it("builds title from user name and truncated text", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSyndicationResponse),
    });

    const result = await scraper.scrape("https://x.com/user/status/123456789");

    expect(result.title).toContain("ScienceDaily:");
    expect(result.title).toContain("Breaking:");
  });

  it("truncates long text in title to 100 characters", async () => {
    const longText = "a".repeat(200);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockSyndicationResponse, text: longText }),
    });

    const result = await scraper.scrape("https://x.com/user/status/123456789");

    expect(result.title).toContain("...");
  });

  it("returns thumbnail from mediaDetails", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSyndicationResponse),
    });

    const result = await scraper.scrape("https://x.com/user/status/123456789");

    expect(result.thumbnailUrl).toBe(
      "https://pbs.twimg.com/media/image1.jpg"
    );
  });

  it("returns null thumbnail when no media exists", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockSyndicationResponse, mediaDetails: undefined }),
    });

    const result = await scraper.scrape("https://x.com/user/status/123456789");

    expect(result.thumbnailUrl).toBeNull();
  });

  it("extracts tweet ID from x.com URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSyndicationResponse),
    });

    await scraper.scrape("https://x.com/elonmusk/status/987654321");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://cdn.syndication.twimg.com/tweet-result?id=987654321&token=x"
    );
  });

  it("extracts tweet ID from twitter.com URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSyndicationResponse),
    });

    await scraper.scrape("https://twitter.com/user/status/111222333");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://cdn.syndication.twimg.com/tweet-result?id=111222333&token=x"
    );
  });

  it("throws ScrapeError when tweet ID cannot be extracted", async () => {
    await expect(
      scraper.scrape("https://x.com/user/profile")
    ).rejects.toThrow(ScrapeError);
    await expect(
      scraper.scrape("https://x.com/user/profile")
    ).rejects.toMatchObject({
      message: "Could not extract tweet ID from URL",
    });
  });

  it("handles missing user gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockSyndicationResponse, user: undefined }),
    });

    const result = await scraper.scrape("https://x.com/user/status/123456789");

    expect(result.title).toContain("Unknown:");
  });

  it("throws ScrapeError for non-200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    await expect(
      scraper.scrape("https://x.com/user/status/123456789")
    ).rejects.toThrow(ScrapeError);
  });

  it("throws ScrapeError for network errors", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      scraper.scrape("https://x.com/user/status/123456789")
    ).rejects.toThrow(ScrapeError);
  });
});
