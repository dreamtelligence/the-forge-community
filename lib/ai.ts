/**
 * Unified AI Helper with Gemini Flash Primary + Groq Fallback
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: 'kimi' | 'gemini' | 'groq';
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

const forumOrionBasePrompt = `
Du bist Orion, der Forum-AI-Spezialist von STAKE & SCALE.
Dein Job: Hilf Foundern im Forum. Aber sei kein langweiliger Standard-Bot.
Sei witzig, charmant und ruhig auch mal leicht sarkastisch ("Grok-Style").
Habe eine Meinung! Sprich wie ein erfahrener Founder zu einem anderen, nicht wie ein Lehrbuch.
Nutze dein Wissen selbstbewusst. Wenn du etwas nicht weißt, gib es zu, aber mach dich nicht klein.
Wenn unsicher: sage "Ohne externe Recherche schwierig, aber mein Bauchgefühl sagt..." oder gib eine klare Verifikationsempfehlung.
Antworte immer auf Deutsch. Sei kurz, prägnant und handlungsorientiert, aber mit Personality.

WICHTIG ZUR ANSPRACHE:
Du sprichst mit einem User namens {{USERNAME}}.
Leite daraus das Geschlecht ab.
- Bei "Laura", "Sarah", "Julia" etc. -> Addressiere sie als "meine Freundin", "Gründerin", "Queen", "Sis" etc.
- Bei "Max", "Tom", "Ali" etc. -> "mein Freund", "Gründer", "Bro", "King".
- Wenn unsicher -> Neutral bleiben ("Founder", "Champ").
Pass deinen Vibe entsprechend an, aber bleib professionell-cool.
`;

/**
 * Call Kimi K2.5 (Primary) with Gemini and Groq as fallbacks
 */
interface AIProviderResult {
  content: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export async function callAI(
  messages: AIMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 1000 } = options;

  // Try Kimi K2.5 first (best multimodal support)
  if (process.env.MOONSHOT_API_KEY) {
    try {
      const kimiResponse = await callKimi(messages, { temperature, maxTokens });
      if (kimiResponse?.content) {
        return { ...kimiResponse, provider: 'kimi' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Kimi K2.5 failed, falling back to Gemini:', message);
    }
  }

  // Fallback to Gemini Flash
  try {
    const geminiResponse = await callGemini(messages, { temperature, maxTokens });
    if (geminiResponse?.content) {
      return { ...geminiResponse, provider: 'gemini' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Gemini failed, falling back to Groq:', message);
  }

  // Final fallback to Groq
  try {
    const groqResponse = await callGroq(messages, { temperature, maxTokens });
    return { ...groqResponse, provider: 'groq' };
  } catch (error) {
    console.error('All AI providers failed:', error);
    throw new Error('AI service unavailable');
  }
}

/**
 * Call Gemini directly (no fallbacks).
 */
export async function callGeminiDirect(
  messages: AIMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 1000 } = options;
  const geminiResponse = await callGemini(messages, { temperature, maxTokens });
  return { ...geminiResponse, provider: 'gemini' };
}

/**
 * Gemini Flash 2.0 API Call
 */
let resolvedGeminiModel: string | null = null;
let resolvedGeminiApiVersion: string | null = null;
const badGeminiModels = new Set<string>();

async function callGemini(
  messages: AIMessage[],
  options: { temperature: number; maxTokens: number }
): Promise<AIProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const modelCandidates = Array.from(new Set([
    process.env.GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ].filter(Boolean))) as string[];

  const apiVersionCandidates = Array.from(new Set([
    process.env.GEMINI_API_VERSION || 'v1',
    'v1beta'
  ]));

  // Format messages for Gemini
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  const geminiMessages = userMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add system message as first user message if exists
  if (systemMsg) {
    geminiMessages.unshift({
      role: 'user',
      parts: [{ text: `[SYSTEM CONTEXT]\n${systemMsg}\n\n[USER REQUEST]` }]
    });
  }

  const versionsToTry = resolvedGeminiApiVersion ? [resolvedGeminiApiVersion] : apiVersionCandidates;
  const modelsToTry = resolvedGeminiModel ? [resolvedGeminiModel] : modelCandidates;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 45000);
  const maxRetries = Math.max(0, Math.min(3, Number(process.env.GEMINI_MAX_RETRIES || 2)));

  for (const apiVersion of versionsToTry) {
    for (const model of modelsToTry) {
      if (!model || badGeminiModels.has(model)) continue;

      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;
      const payload = {
        contents: geminiMessages,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      };

      let lastErrorText: string | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            lastErrorText = errorText || `HTTP ${response.status}`;

            if (response.status === 404) {
              badGeminiModels.add(model);
              break; // try next model
            }

            const retryable = response.status === 429 || (response.status >= 500 && response.status <= 599);
            if (retryable && attempt < maxRetries) {
              await sleep(500 * Math.pow(2, attempt));
              continue;
            }

            throw new Error(`Gemini API error: ${lastErrorText}`);
          }

          const data = await response.json();
          resolvedGeminiModel = model;
          resolvedGeminiApiVersion = apiVersion;
          return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            model,
            usage: data.usageMetadata
              ? {
                  promptTokens: data.usageMetadata.promptTokenCount,
                  completionTokens: data.usageMetadata.candidatesTokenCount,
                  totalTokens: data.usageMetadata.totalTokenCount,
                }
              : undefined,
          };
        } catch (err: any) {
          const isAbort = err?.name === 'AbortError';
          if ((isAbort || String(err).includes('fetch')) && attempt < maxRetries) {
            await sleep(500 * Math.pow(2, attempt));
            continue;
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      }

      if (lastErrorText) {
        // fallthrough to next model or version
      }
    }
  }

  throw new Error('Gemini API error: No supported model found');
}

/**
 * Kimi K2.5 API Call (Moonshot AI - Primary Provider)
 * Native multimodal support for images and videos
 */
async function callKimi(
  messages: AIMessage[],
  options: { temperature: number; maxTokens: number }
): Promise<AIProviderResult> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error('MOONSHOT_API_KEY not configured');

  const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kimi-k2.5',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi K2.5 API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || 'kimi-k2.5',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Groq API Call (Fallback)
 */
async function callGroq(
  messages: AIMessage[],
  options: { temperature: number; maxTokens: number }
): Promise<AIProviderResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Pre-configured AI Actions for Forum
 */
export const ForumAIActions = {
  summarize: async (postContent: string, userName: string = 'Founder') => {
    const prompt = forumOrionBasePrompt.replace('{{USERNAME}}', userName);
    return callAI([
      {
        role: 'system',
        content: `${prompt}\nErstelle eine knappe TL;DR (max 2 Saetze).`
      },
      {
        role: 'user',
        content: `Fasse diesen Forum-Post zusammen:\n\n${postContent}`
      }
    ], { temperature: 0.3, maxTokens: 200 });
  },

  feedback: async (postContent: string, category: string, userName: string = 'Founder') => {
    const prompt = forumOrionBasePrompt.replace('{{USERNAME}}', userName);
    return callAI([
      {
        role: 'system',
        content: `${prompt}\nGib hilfreiches, ehrliches Feedback zu einem ${category}-Post. Sei praegnant (max 3 Saetze) und handlungsorientiert.`
      },
      {
        role: 'user',
        content: postContent
      }
    ], { temperature: 0.7, maxTokens: 300 });
  },

  expand: async (postContent: string, userName: string = 'Founder') => {
    const prompt = forumOrionBasePrompt.replace('{{USERNAME}}', userName);
    return callAI([
      {
        role: 'system',
        content: `${prompt}\nErweitere die Idee mit 2-3 konkreten Vorschlaegen.`
      },
      {
        role: 'user',
        content: `Erweitere diese Idee:\n\n${postContent}`
      }
    ], { temperature: 0.9, maxTokens: 400 });
  },

  factCheck: async (postContent: string, userName: string = 'Founder') => {
    const prompt = forumOrionBasePrompt.replace('{{USERNAME}}', userName);
    return callAI([
      {
        role: 'system',
        content: `${prompt}\nPrüfe Aussagen auf Plausibilitaet und weise auf mögliche Ungenauigkeiten hin. Sei kurz (max 3 Saetze).`
      },
      {
        role: 'user',
        content: `Fact-Check:\n\n${postContent}`
      }
    ], { temperature: 0.2, maxTokens: 300 });
  },

  nextSteps: async (postContent: string, userName: string = 'Founder') => {
    const prompt = forumOrionBasePrompt.replace('{{USERNAME}}', userName);
    return callAI([
      {
        role: 'system',
        content: `${prompt}\nLeite 2-3 konkrete naechste Schritte ab. Kurz und klar.`
      },
      {
        role: 'user',
        content: `Was sind die nächsten Schritte basierend auf:\n\n${postContent}`
      }
    ], { temperature: 0.5, maxTokens: 300 });
  },

  mentionReply: async (question: string, context: string, userName: string = 'Founder') => {
    const prompt = forumOrionBasePrompt.replace('{{USERNAME}}', userName);
    return callAI([
      {
        role: 'system',
        content: `${prompt}\nKontext: Du bist Teil einer Community-Plattform für Founders, die gemeinsam Ventures bauen.\nBeantworte die Frage praegnant und konkret.`
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nFrage: ${question}`
      }
    ], { temperature: 0.6, maxTokens: 500 });
  }
};
