import { callAI } from './ai';
import { braveSearch } from './research';

export interface TrendOpportunity {
  title: string;
  description: string;
  matchScore: number;
  reasoning: string;
  platform: 'tiktok' | 'amazon' | 'google' | 'general';
  searchQuery: string;
}

export interface TrendReportData {
  sources: { title: string; url: string }[];
  trends: TrendOpportunity[];
}

export async function generateTrendReport(
  brandDNA: any, // Typed as any to avoid circular deps, effectively the Prisma BrandDNA type
  timeframe: string = 'current_month'
): Promise<TrendReportData> {
  const category = brandDNA.productCategory || 'General';
  const location = brandDNA.targetAudience?.location || 'Global';
  const targetGroup = brandDNA.targetAudience?.age || 'General Audience';

  // 1. Construct Search Queries
  // We search for multiple angles to get a broad view
  const queries = [
    `Trending ${category} products ${new Date().getFullYear()} ${location} tiktok`,
    `Amazon best sellers ${category} ${location} ${new Date().getFullYear()}`,
    `Exploding topics ${category} trends ${timeframe}`,
  ];

  // 2. Perform Web Search (Parallel)
  const searchResults = await Promise.all(
    queries.map(q => braveSearch(q, 3).catch(() => ({ results: [] })))
  );

  const flatResults = searchResults.flatMap(r => r.results);
  const uniqueSources = flatResults.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);

  if (uniqueSources.length === 0) {
    throw new Error('No trend data found. Please try again later.');
  }

  // 3. AI Analysis
  // We feed the search snippets into the LLM
  const context = uniqueSources
    .slice(0, 15) // Limit context window
    .map((r, i) => `[Source ${i + 1}] ${r.title}
${r.snippet}`)
    .join('\n\n');

  const systemPrompt = `You are a Trend Hunter AI for a Venture Studio. 
Your goal is to identify "Money Maker" product opportunities for a specific brand based on real-time web search data.
You must be critical and only select trends that are actually growing, not generic items.

Brand Context:
- Category: ${category}
- Target Audience: ${targetGroup} (${location})
- Values: ${brandDNA.values?.join(', ') || 'N/A'}

Output JSON format only:
{
  "trends": [
    {
      "title": "Product Name",
      "description": "Short description of the trend and why it's viral.",
      "matchScore": 85, (0-100, based on Brand Context)
      "reasoning": "Why this fits the brand values and audience.",
      "platform": "tiktok" | "amazon" | "google" | "general"
    }
  ]
}
Return exactly 3 distinct trends.`;

  const userMessage = `Analyze these search results and find 3 trending product opportunities for my brand.

SEARCH DATA:
${context}`;

  const aiResponse = await callAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    {
      temperature: 0.4,
    }
  );

  let parsedTrends: { trends: TrendOpportunity[] } = { trends: [] };
  
  try {
    // Clean code blocks if present
    const cleanJson = aiResponse.content.replace(/```json\s*|```/g, '');
    parsedTrends = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse AI trend response:', e);
    throw new Error('AI analysis failed to produce structured data.');
  }

  return {
    sources: uniqueSources.map(s => ({ title: s.title, url: s.url })),
    trends: parsedTrends.trends.map(t => ({ ...t, searchQuery: queries[0] })),
  };
}
