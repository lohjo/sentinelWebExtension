import { TikTokScraper } from "@/lib/services/scrapers/tiktok.scraper";
import { ScrapeError } from "@/lib/services/scraper.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const scraper = new TikTokScraper();

const mockOembedResponse = {
  title: "Check out this viral dance trend #fyp",
  author_name: "testuser123",
  thumbnail_url: "https://p16-sign.tiktokcdn.com/thumb.jpg",
  provider_name: "TikTok",
};

describe("TikTokScraper", () => {
  it("returns title from oEmbed response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.tiktok.com/@user/video/123456");

    expect(result.title).toBe("Check out this viral dance trend #fyp");
  });

  it("returns content from oEmbed title field", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.tiktok.com/@user/video/123456");

    expect(result.content).toBe("Check out this viral dance trend #fyp");
  });

  it("returns description with author name", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.tiktok.com/@user/video/123456");

    expect(result.description).toBe("TikTok by testuser123");
  });

  it("returns thumbnail from oEmbed response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.tiktok.com/@user/video/123456");

    expect(result.thumbnailUrl).toBe("https://p16-sign.tiktokcdn.com/thumb.jpg");
  });

  it("calls TikTok oEmbed endpoint with encoded URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const tiktokUrl = "https://www.tiktok.com/@user/video/123456";
    await scraper.scrape(tiktokUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`
    );
  });

  it("handles missing title gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockOembedResponse, title: undefined }),
    });

    const result = await scraper.scrape("https://www.tiktok.com/@user/video/123456");

    expect(result.title).toBeNull();
    expect(result.content).toBe("");
  });

  it("handles missing thumbnail gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, thumbnail_url: undefined }),
    });

    const result = await scraper.scrape("https://www.tiktok.com/@user/video/123456");

    expect(result.thumbnailUrl).toBeNull();
  });

  it("throws ScrapeError for non-200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(
      scraper.scrape("https://www.tiktok.com/@user/video/999")
    ).rejects.toThrow(ScrapeError);
  });

  it("throws ScrapeError for network errors", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      scraper.scrape("https://www.tiktok.com/@user/video/123")
    ).rejects.toThrow(ScrapeError);
  });
});
