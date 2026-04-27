import { getScraperForUrl, scrapeUrl, ScrapeError } from "@/lib/services/scraper.service";
import { DefaultScraper } from "@/lib/services/scrapers/default.scraper";
import { TikTokScraper } from "@/lib/services/scrapers/tiktok.scraper";
import { XScraper } from "@/lib/services/scrapers/x.scraper";
import { FacebookScraper } from "@/lib/services/scrapers/facebook.scraper";
import { RedditScraper } from "@/lib/services/scrapers/reddit.scraper";
import { InstagramScraper } from "@/lib/services/scrapers/instagram.scraper";

describe("getScraperForUrl", () => {
  it("returns TikTokScraper for tiktok.com URLs", () => {
    const scraper = getScraperForUrl("https://www.tiktok.com/@user/video/123");
    expect(scraper).toBeInstanceOf(TikTokScraper);
  });

  it("returns TikTokScraper for vm.tiktok.com short links", () => {
    const scraper = getScraperForUrl("https://vm.tiktok.com/abc123");
    expect(scraper).toBeInstanceOf(TikTokScraper);
  });

  it("returns XScraper for x.com URLs", () => {
    const scraper = getScraperForUrl("https://x.com/user/status/123456");
    expect(scraper).toBeInstanceOf(XScraper);
  });

  it("returns XScraper for twitter.com URLs", () => {
    const scraper = getScraperForUrl("https://twitter.com/user/status/123456");
    expect(scraper).toBeInstanceOf(XScraper);
  });

  it("returns XScraper for mobile.twitter.com URLs", () => {
    const scraper = getScraperForUrl("https://mobile.twitter.com/user/status/123");
    expect(scraper).toBeInstanceOf(XScraper);
  });

  it("returns FacebookScraper for facebook.com URLs", () => {
    const scraper = getScraperForUrl("https://www.facebook.com/user/posts/123");
    expect(scraper).toBeInstanceOf(FacebookScraper);
  });

  it("returns FacebookScraper for fb.com URLs", () => {
    const scraper = getScraperForUrl("https://fb.com/user/posts/123");
    expect(scraper).toBeInstanceOf(FacebookScraper);
  });

  it("returns FacebookScraper for m.facebook.com URLs", () => {
    const scraper = getScraperForUrl("https://m.facebook.com/story/123");
    expect(scraper).toBeInstanceOf(FacebookScraper);
  });

  it("returns RedditScraper for reddit.com URLs", () => {
    const scraper = getScraperForUrl("https://www.reddit.com/r/science/comments/abc123/");
    expect(scraper).toBeInstanceOf(RedditScraper);
  });

  it("returns RedditScraper for old.reddit.com URLs", () => {
    const scraper = getScraperForUrl("https://old.reddit.com/r/news/comments/xyz/");
    expect(scraper).toBeInstanceOf(RedditScraper);
  });

  it("returns InstagramScraper for instagram.com URLs", () => {
    const scraper = getScraperForUrl("https://www.instagram.com/p/ABC123/");
    expect(scraper).toBeInstanceOf(InstagramScraper);
  });

  it("returns InstagramScraper for instagram.com reel URLs", () => {
    const scraper = getScraperForUrl("https://www.instagram.com/reel/XYZ789/");
    expect(scraper).toBeInstanceOf(InstagramScraper);
  });

  it("returns DefaultScraper for generic news sites", () => {
    const scraper = getScraperForUrl("https://www.bbc.com/news/article-123");
    expect(scraper).toBeInstanceOf(DefaultScraper);
  });

  it("returns DefaultScraper for unknown domains", () => {
    const scraper = getScraperForUrl("https://randomsite.org/page");
    expect(scraper).toBeInstanceOf(DefaultScraper);
  });

  it("handles uppercase hostnames correctly", () => {
    const scraper = getScraperForUrl("https://WWW.TIKTOK.COM/@user/video/1");
    expect(scraper).toBeInstanceOf(TikTokScraper);
  });
});

describe("scrapeUrl", () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("delegates to the correct scraper and returns its result", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Test TikTok",
          author_name: "user",
          thumbnail_url: "https://example.com/thumb.jpg",
        }),
    });

    const result = await scrapeUrl("https://www.tiktok.com/@user/video/123");

    expect(result.title).toBe("Test TikTok");
    expect(result.thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });

  it("delegates generic URLs to DefaultScraper", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          "<html><head><title>Test Page</title></head><body>Content</body></html>"
        ),
    });

    const result = await scrapeUrl("https://example.com/article");

    expect(result.title).toBe("Test Page");
  });
});

describe("ScrapeError", () => {
  it("has correct name and properties", () => {
    const error = new ScrapeError("test message", "https://example.com");

    expect(error.name).toBe("ScrapeError");
    expect(error.message).toBe("test message");
    expect(error.url).toBe("https://example.com");
    expect(error).toBeInstanceOf(Error);
  });
});
