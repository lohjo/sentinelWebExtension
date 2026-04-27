import { FacebookScraper } from "@/lib/services/scrapers/facebook.scraper";
import { ScrapeError } from "@/lib/services/scraper.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const scraper = new FacebookScraper();

const mockOembedResponse = {
  author_name: "John Doe",
  html: '<div class="fb-post"><p>This is the post content about a viral claim.</p></div>',
  provider_name: "Facebook",
};

describe("FacebookScraper", () => {
  it("returns title with author name", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.title).toBe("Facebook post by John Doe");
  });

  it("extracts text content from oEmbed HTML", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.content).toContain("post content about a viral claim");
  });

  it("returns description with author name", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.description).toBe("Post by John Doe on Facebook");
  });

  it("returns null thumbnailUrl (Facebook oEmbed does not provide images)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.thumbnailUrl).toBeNull();
  });

  it("calls Facebook oEmbed endpoint with encoded URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const fbUrl = "https://www.facebook.com/user/posts/123";
    await scraper.scrape(fbUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://www.facebook.com/plugins/post/oembed.json?url=${encodeURIComponent(fbUrl)}`
    );
  });

  it("handles empty HTML gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, html: "" }),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.content).toBe("");
  });

  it("handles missing HTML field gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, html: undefined }),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.content).toBe("");
  });

  it("handles missing author name gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, author_name: undefined }),
    });

    const result = await scraper.scrape("https://www.facebook.com/user/posts/123");

    expect(result.title).toBe("Facebook post by Unknown");
  });

  it("throws ScrapeError for non-200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    });

    await expect(
      scraper.scrape("https://www.facebook.com/user/posts/999")
    ).rejects.toThrow(ScrapeError);
  });

  it("throws ScrapeError for network errors", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      scraper.scrape("https://www.facebook.com/user/posts/123")
    ).rejects.toThrow(ScrapeError);
  });
});
