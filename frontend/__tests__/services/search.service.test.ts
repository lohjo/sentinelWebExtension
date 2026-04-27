const mockSearch = jest.fn();

jest.mock("@tavily/core", () => ({
  tavily: () => ({ search: mockSearch }),
}));

import {
  searchForContext,
  buildSearchQuery,
  SearchError,
} from "@/lib/services/search.service";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.TAVILY_API_KEY = "test-tavily-key";
});

afterEach(() => {
  delete process.env.TAVILY_API_KEY;
});

const mockTavilyResponse = {
  query: "fact check: vaccine efficacy claims",
  responseTime: 1.5,
  images: [],
  results: [
    {
      title: "CDC Vaccine Data",
      url: "https://cdc.gov/vaccines",
      content: "Official vaccine efficacy data from the CDC.",
      score: 0.95,
      publishedDate: "2026-01-15",
    },
    {
      title: "WHO Report on Vaccines",
      url: "https://who.int/vaccines",
      content: "WHO analysis of global vaccine effectiveness.",
      score: 0.88,
      publishedDate: "2026-02-01",
    },
    {
      title: "Reuters Fact Check",
      url: "https://reuters.com/fact-check/vaccines",
      content: "Reuters fact-checked claims about vaccine side effects.",
      score: 0.82,
      publishedDate: "2026-01-20",
    },
  ],
  requestId: "req-123",
};

describe("searchForContext", () => {
  it("returns mapped search results with title, url, content, score", async () => {
    mockSearch.mockResolvedValue(mockTavilyResponse);

    const results = await searchForContext("fact check: vaccine claims");

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      title: "CDC Vaccine Data",
      url: "https://cdc.gov/vaccines",
      content: "Official vaccine efficacy data from the CDC.",
      score: 0.95,
    });
  });

  it("strips extra fields from Tavily results", async () => {
    mockSearch.mockResolvedValue(mockTavilyResponse);

    const results = await searchForContext("test query");

    expect(results[0]).not.toHaveProperty("publishedDate");
    expect(results[0]).not.toHaveProperty("rawContent");
  });

  it("passes correct search options to Tavily", async () => {
    mockSearch.mockResolvedValue({ ...mockTavilyResponse, results: [] });

    await searchForContext("test query");

    expect(mockSearch).toHaveBeenCalledWith("test query", {
      searchDepth: "basic",
      maxResults: 5,
      topic: "news",
    });
  });

  it("returns empty array when Tavily returns no results", async () => {
    mockSearch.mockResolvedValue({ ...mockTavilyResponse, results: [] });

    const results = await searchForContext("obscure query");

    expect(results).toEqual([]);
  });

  it("propagates Tavily API errors", async () => {
    mockSearch.mockRejectedValue(new Error("Tavily API rate limit exceeded"));

    await expect(searchForContext("test")).rejects.toThrow(
      "Tavily API rate limit exceeded"
    );
  });
});

describe("buildSearchQuery", () => {
  it("uses headline when available", () => {
    const query = buildSearchQuery(
      "Vaccines cause autism",
      "https://example.com/article"
    );
    expect(query).toBe("fact check: Vaccines cause autism");
  });

  it("falls back to sourceUrl when headline is null", () => {
    const query = buildSearchQuery(null, "https://example.com/claims");
    expect(query).toBe("fact check: https://example.com/claims");
  });
});

describe("SearchError", () => {
  it("has correct name and message", () => {
    const error = new SearchError("API key missing");
    expect(error.name).toBe("SearchError");
    expect(error.message).toBe("API key missing");
    expect(error).toBeInstanceOf(Error);
  });
});
