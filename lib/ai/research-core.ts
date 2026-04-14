type WebResult = {
  title: string;
  url: string;
  snippet: string;
  published?: string | null;
};

type WebSearchResponse = {
  results: WebResult[];
};

export async function braveSearch(query: string, count = 5): Promise<WebSearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_SEARCH_API_KEY not configured');
  }

  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brave Search API error: ${errorText}`);
  }

  const data = await response.json();
  const items = Array.isArray(data?.web?.results) ? data.web.results : [];

  return {
    results: items.map((item: any) => ({
      title: item?.title || 'Untitled',
      url: item?.url || '',
      snippet: item?.description || item?.snippet || '',
      published: item?.page_age || item?.age || null,
    })),
  };
}
