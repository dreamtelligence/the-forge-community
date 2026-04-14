/**
 * AI Research Assistant - Combines Brave Search with Gemini/Groq
 * Like Claude's web fetch capability
 */

import { callAI, AIMessage } from './ai';
import { braveSearch } from './research';

export interface ResearchResult {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    published?: string | null;
  }>;
  provider: 'gemini' | 'groq' | 'kimi';
  query: string;
}

/**
 * Research a topic with web search + AI synthesis
 * Usage: const result = await researchWithAI("Beste Lieferanten für Bio-Baumwolle");
 */
export async function researchWithAI(
  query: string,
  options: {
    systemPrompt?: string;
    maxSources?: number;
    temperature?: number;
  } = {}
): Promise<ResearchResult> {
  const { 
    systemPrompt = 'Du bist ein hilfreicher Research-Assistent. Beantworte die Frage basierend auf den Web-Ergebnissen. Zitiere Quellen mit [1], [2] etc.',
    maxSources = 5,
    temperature = 0.3 
  } = options;

  try {
    // 1. Web search
    const searchResults = await braveSearch(query, maxSources);
    
    if (searchResults.results.length === 0) {
      throw new Error('Keine Web-Ergebnisse gefunden');
    }

    // 2. Format context for AI
    const context = searchResults.results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
      .join('\n\n');

    // 3. Call AI with context
    const aiResponse = await callAI([
      {
        role: 'system',
        content: `${systemPrompt}\n\nWICHTIG: Codiere Quellen als [1], [2] etc. und liste sie am Ende auf.`
      },
      {
        role: 'user',
        content: `WEB-RECHERCHE ERGEBNISSE:\n${context}\n\nNUTZER-FRAGE: ${query}\n\nBitte beantworte die Frage basierend auf den obigen Ergebnissen. Zitiere Quellen.`
      }
    ], { temperature, maxTokens: 1500 });

    return {
      answer: aiResponse.content,
      sources: searchResults.results,
      provider: aiResponse.provider,
      query
    };

  } catch (error) {
    console.error('Research error:', error);
    throw error;
  }
}

/**
 * Quick fact check with web search
 * Usage: await factCheckWithWeb("Lieferzeit China 4 Wochen");
 */
export async function factCheckWithWeb(
  statement: string
): Promise<ResearchResult> {
  return researchWithAI(
    `Ist das korrekt: "${statement}"?`,
    {
      systemPrompt: 'Du bist ein Fact-Checker. Überprüfe die Aussage mit den Web-Ergebnissen. Bewerte als ✅ Korrekt, ⚠️ Teilweise korrekt, oder ❌ Falsch. Erkläre kurz.',
      maxSources: 3,
      temperature: 0.1
    }
  );
}

/**
 * Supplier research - specialized for sourcing
 * Usage: await researchSupplier("Bio-Baumwolle Hersteller Portugal");
 */
export async function researchSupplier(
  productQuery: string
): Promise<ResearchResult> {
  const enhancedQuery = `${productQuery} Hersteller Supplier Manufacturer Lieferant`;
  
  return researchWithAI(
    enhancedQuery,
    {
      systemPrompt: `Du bist ein Sourcing-Experte für E-Commerce. Finde relevante Hersteller/Lieferanten basierend auf den Web-Ergebnissen. 
Extrahiere: Firmenname, Standort, Website (falls gefunden), Spezialisierung.
Formatiere als Liste.`,
      maxSources: 8,
      temperature: 0.2
    }
  );
}

/**
 * Competitor analysis
 * Usage: await analyzeCompetitor("Nike DTC Strategie");
 */
export async function analyzeCompetitor(
  competitorQuery: string
): Promise<ResearchResult> {
  return researchWithAI(
    `${competitorQuery} Strategie Analyse Marketing`,
    {
      systemPrompt: 'Du bist ein Wettbewerbsanalyst. Analysiere die Strategie/Marketing/Taktiken basierend auf den Web-Ergebnissen. Identifiziere Stärken, Schwächen, Chancen.',
      maxSources: 6,
      temperature: 0.4
    }
  );
}

/**
 * AI Assistant with optional web search
 * Can be used in the sidebar/chat to auto-detect when search is needed
 */
export async function aiWithOptionalResearch(
  messages: AIMessage[],
  options: {
    enableResearch?: boolean;
    researchTrigger?: string[];
  } = {}
): Promise<ResearchResult | { answer: string; provider: string }> {
  const { enableResearch = true, researchTrigger = ['suche', 'finde', 'recherchiere', 'aktuell', 'neuigkeiten', 'preis', 'kosten'] } = options;
  
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
  
  // Auto-detect if research is needed
  const needsResearch = enableResearch && researchTrigger.some(trigger => 
    lastMessage.includes(trigger)
  );
  
  if (needsResearch) {
    // Extract search query from conversation
    const searchQuery = lastMessage.replace(/suche|finde|recherchiere|nach|für|mir/gi, '').trim();
    return researchWithAI(searchQuery);
  }
  
  // Regular AI call without research
  const response = await callAI(messages);
  return {
    answer: response.content,
    provider: response.provider
  };
}
