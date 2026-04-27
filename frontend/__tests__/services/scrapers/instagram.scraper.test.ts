import { InstagramScraper } from "@/lib/services/scrapers/instagram.scraper";
import { ScrapeError } from "@/lib/services/scraper.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, FACEBOOK_ACCESS_TOKEN: "test-token-123" };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

const scraper = new InstagramScraper();

const mockOembedResponse = {
  title: "Amazing sunset at the beach #travel #nature",
  author_name: "travelphotographer",
  thumbnail_url: "https://scontent.cdninstagram.com/v/thumb.jpg",
  provider_name: "Instagram",
};

describe("InstagramScraper", () => {
  it("returns title combining author name and caption", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.title).toBe(
      "travelphotographer: Amazing sunset at the beach #travel #nature"
    );
  });

  it("returns caption as content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.content).toBe(
      "Amazing sunset at the beach #travel #nature"
    );
  });

  it("returns description with author name", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.description).toBe("Post by travelphotographer on Instagram");
  });

  it("returns thumbnail from oEmbed response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.thumbnailUrl).toBe(
      "https://scontent.cdninstagram.com/v/thumb.jpg"
    );
  });

  it("calls Instagram oEmbed endpoint with encoded URL and access token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const igUrl = "https://www.instagram.com/p/ABC123/";
    await scraper.scrape(igUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `https://graph.facebook.com/v22.0/instagram_oembed?url=${encodeURIComponent(igUrl)}&access_token=test-token-123`
      )
    );
  });

  it("handles missing title gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, title: undefined }),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.title).toBe("Instagram post by travelphotographer");
    expect(result.content).toBe("");
  });

  it("handles missing thumbnail gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, thumbnail_url: undefined }),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.thumbnailUrl).toBeNull();
  });

  it("handles missing author name gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockOembedResponse, author_name: undefined }),
    });

    const result = await scraper.scrape("https://www.instagram.com/p/ABC123/");

    expect(result.title).toContain("Unknown:");
    expect(result.description).toBe("Post by Unknown on Instagram");
  });

  it("throws ScrapeError when FACEBOOK_ACCESS_TOKEN is not set", async () => {
    delete process.env.FACEBOOK_ACCESS_TOKEN;

    await expect(
      scraper.scrape("https://www.instagram.com/p/ABC123/")
    ).rejects.toThrow(ScrapeError);
    await expect(
      scraper.scrape("https://www.instagram.com/p/ABC123/")
    ).rejects.toMatchObject({
      message: "FACEBOOK_ACCESS_TOKEN environment variable is not set",
    });
  });

  it("throws ScrapeError for non-200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    });

    await expect(
      scraper.scrape("https://www.instagram.com/p/ABC123/")
    ).rejects.toThrow(ScrapeError);
  });

  it("throws ScrapeError for network errors", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      scraper.scrape("https://www.instagram.com/p/ABC123/")
    ).rejects.toThrow(ScrapeError);
  });

  it("handles Instagram Reel URLs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOembedResponse),
    });

    const reelUrl = "https://www.instagram.com/reel/XYZ789/";
    await scraper.scrape(reelUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(reelUrl))
    );
  });
});
