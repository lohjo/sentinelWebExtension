import { RedditScraper } from "@/lib/services/scrapers/reddit.scraper";
import { ScrapeError } from "@/lib/services/scraper.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const scraper = new RedditScraper();

const mockRedditResponse = [
  {
    data: {
      children: [
        {
          data: {
            title: "Scientists discover high levels of microplastics in bottled water",
            selftext:
              "A new study published in PNAS found that bottled water contains significantly more microplastics than previously estimated.",
            author: "science_enthusiast",
            subreddit: "science",
            thumbnail: "https://b.thumbs.redditmedia.com/thumb.jpg",
            preview: {
              images: [
                {
                  source: {
                    url: "https://preview.redd.it/image.jpg?width=1024&amp;format=png",
                  },
                },
              ],
            },
            url: "https://www.reddit.com/r/science/comments/abc123/scientists_discover/",
          },
        },
      ],
    },
  },
];

function mockSuccessResponse(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe("RedditScraper", () => {
  it("extracts post title from Reddit JSON response", async () => {
    mockSuccessResponse(mockRedditResponse);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover/"
    );

    expect(result.title).toBe(
      "Scientists discover high levels of microplastics in bottled water"
    );
  });

  it("extracts selftext as content", async () => {
    mockSuccessResponse(mockRedditResponse);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover/"
    );

    expect(result.content).toContain("microplastics");
    expect(result.content).toContain("PNAS");
  });

  it("combines title and selftext in content", async () => {
    mockSuccessResponse(mockRedditResponse);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover/"
    );

    expect(result.content).toContain("Scientists discover");
    expect(result.content).toContain("new study published");
  });

  it("returns description with subreddit and author", async () => {
    mockSuccessResponse(mockRedditResponse);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover/"
    );

    expect(result.description).toBe(
      "Posted in r/science by u/science_enthusiast"
    );
  });

  it("extracts thumbnail from preview images with decoded ampersands", async () => {
    mockSuccessResponse(mockRedditResponse);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover/"
    );

    expect(result.thumbnailUrl).toBe(
      "https://preview.redd.it/image.jpg?width=1024&format=png"
    );
  });

  it("falls back to thumbnail URL when preview is not available", async () => {
    const noPreview = [
      {
        data: {
          children: [
            {
              data: {
                title: "Test post",
                selftext: "",
                author: "testuser",
                subreddit: "test",
                thumbnail: "https://b.thumbs.redditmedia.com/fallback.jpg",
                preview: null,
                url: "https://www.reddit.com/r/test/comments/xyz/",
              },
            },
          ],
        },
      },
    ];
    mockSuccessResponse(noPreview);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/test/comments/xyz/"
    );

    expect(result.thumbnailUrl).toBe(
      "https://b.thumbs.redditmedia.com/fallback.jpg"
    );
  });

  it("returns null thumbnail when only non-URL thumbnail exists", async () => {
    const selfThumb = [
      {
        data: {
          children: [
            {
              data: {
                title: "Text post",
                selftext: "Just text",
                author: "user",
                subreddit: "askreddit",
                thumbnail: "self",
                preview: null,
                url: "https://www.reddit.com/r/askreddit/comments/123/",
              },
            },
          ],
        },
      },
    ];
    mockSuccessResponse(selfThumb);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/askreddit/comments/123/"
    );

    expect(result.thumbnailUrl).toBeNull();
  });

  it("builds correct JSON URL by appending .json to the path", async () => {
    mockSuccessResponse(mockRedditResponse);

    await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover/"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.reddit.com/r/science/comments/abc123/scientists_discover.json",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("HackomaniaBot"),
        }),
      })
    );
  });

  it("strips trailing slash before appending .json", async () => {
    mockSuccessResponse(mockRedditResponse);

    await scraper.scrape(
      "https://www.reddit.com/r/science/comments/abc123/"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.reddit.com/r/science/comments/abc123.json",
      expect.anything()
    );
  });

  it("throws ScrapeError when post data cannot be extracted", async () => {
    mockSuccessResponse({ unexpected: "format" });

    await expect(
      scraper.scrape("https://www.reddit.com/r/test/comments/bad/")
    ).rejects.toThrow(ScrapeError);
    await expect(
      scraper.scrape("https://www.reddit.com/r/test/comments/bad/")
    ).rejects.toMatchObject({
      message: "Could not extract post data from Reddit response",
    });
  });

  it("throws ScrapeError for non-200 HTTP status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    await expect(
      scraper.scrape("https://www.reddit.com/r/test/comments/blocked/")
    ).rejects.toThrow(ScrapeError);
  });

  it("throws ScrapeError for network errors", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      scraper.scrape("https://www.reddit.com/r/test/comments/down/")
    ).rejects.toThrow(ScrapeError);
  });

  it("truncates content exceeding max length", async () => {
    const longSelftext = "a".repeat(20_000);
    const longPost = [
      {
        data: {
          children: [
            {
              data: {
                title: "Long post",
                selftext: longSelftext,
                author: "user",
                subreddit: "test",
                thumbnail: null,
                preview: null,
                url: "https://www.reddit.com/r/test/comments/long/",
              },
            },
          ],
        },
      },
    ];
    mockSuccessResponse(longPost);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/test/comments/long/"
    );

    expect(result.content.length).toBe(10_000);
  });

  it("handles post with no selftext gracefully", async () => {
    const titleOnly = [
      {
        data: {
          children: [
            {
              data: {
                title: "Link post to external site",
                selftext: "",
                author: "linkposter",
                subreddit: "news",
                thumbnail: null,
                preview: null,
                url: "https://www.reddit.com/r/news/comments/link/",
              },
            },
          ],
        },
      },
    ];
    mockSuccessResponse(titleOnly);

    const result = await scraper.scrape(
      "https://www.reddit.com/r/news/comments/link/"
    );

    expect(result.content).toBe("Link post to external site");
  });
});
