import type { AIMessage, AIResponse } from '@/lib/ai';
import { ORION_TOOL_DECLARATIONS, executeOrionToolCall, type ToolContext } from '@/lib/ai/orion-tools';

const GEMINI_TOOL_API_VERSION_CANDIDATES = Array.from(new Set([
  process.env.GEMINI_TOOL_API_VERSION,
  process.env.GEMINI_API_VERSION,
  'v1beta'
].filter(Boolean))) as string[];

const GEMINI_TOOL_MODEL_CANDIDATES = Array.from(new Set([
  process.env.GEMINI_TOOL_MODEL,
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-2.0-pro'
].filter(Boolean))) as string[];

const GEMINI_UNSUPPORTED_TOOL_MODELS = new Set([
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001'
]);

let resolvedGeminiToolModel: string | null = null;
let resolvedGeminiToolApiVersion: string | null = null;
const badGeminiToolModels = new Set<string>();

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
};

const toGeminiContents = (messages: AIMessage[]): GeminiContent[] => {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userMessages = messages.filter((m) => m.role !== 'system');
  const contents: GeminiContent[] = userMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  if (systemMsg) {
    contents.unshift({
      role: 'user',
      parts: [{ text: `[SYSTEM CONTEXT]\n${systemMsg}\n\n[USER REQUEST]` }]
    });
  }

  return contents;
};


const buildFunctionResponseParts = (responses: Array<{ name: string; response: any }>) => {
  return responses.map((item) => ({
    functionResponse: {
      name: item.name,
      response: item.response
    }
  }));
};

const fetchGemini = async (apiVersion: string, model: string, body: any) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Gemini API error: ${errorText}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
};

export async function callGeminiWithTools(
  messages: AIMessage[],
  options: { temperature: number; maxTokens: number },
  ctx: ToolContext
): Promise<AIResponse> {
  const contents = toGeminiContents(messages);
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  const apiVersions = resolvedGeminiToolApiVersion
    ? [resolvedGeminiToolApiVersion]
    : GEMINI_TOOL_API_VERSION_CANDIDATES;
  const modelCandidates = resolvedGeminiToolModel
    ? [resolvedGeminiToolModel]
    : GEMINI_TOOL_MODEL_CANDIDATES;

  let lastError: Error | null = null;
  let selectedModel: string | null = resolvedGeminiToolModel;
  let selectedApiVersion: string | null = resolvedGeminiToolApiVersion;

  const callGeminiWithModel = async (model: string, apiVersion: string, payload: any) => {
    const data = await fetchGemini(apiVersion, model, payload);
    if (!resolvedGeminiToolModel) {
      resolvedGeminiToolModel = model;
      resolvedGeminiToolApiVersion = apiVersion;
    }
    return data;
  };

  const sendRequest = async (payload: any) => {
    if (selectedModel && selectedApiVersion) {
      return callGeminiWithModel(selectedModel, selectedApiVersion, payload);
    }

    for (const apiVersion of apiVersions) {
      for (const model of modelCandidates) {
        if (!model || GEMINI_UNSUPPORTED_TOOL_MODELS.has(model) || badGeminiToolModels.has(model)) continue;
        try {
          const data = await callGeminiWithModel(model, apiVersion, payload);
          selectedModel = model;
          selectedApiVersion = apiVersion;
          return data;
        } catch (error) {
          const err = error as Error & { status?: number };
          if (err.status === 404) {
            badGeminiToolModels.add(model);
            continue;
          }
          lastError = err;
        }
      }
    }

    throw lastError || new Error('Gemini API error: No supported model found');
  };

  const toolConfig = {
    functionCallingConfig: {
      mode: 'AUTO'
    }
  };

  const tools = [{ functionDeclarations: ORION_TOOL_DECLARATIONS }];

  let turn = 0;
  const maxTurns = 4;
  let finalText = '';

  while (turn < maxTurns) {
    turn += 1;
    const payload = {
      contents,
      tools,
      toolConfig,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens
      }
    };

    const data = await sendRequest(payload);

    const usage = data?.usageMetadata;
    if (usage) {
      totalPromptTokens += usage.promptTokenCount || 0;
      totalCompletionTokens += usage.candidatesTokenCount || 0;
      totalTokens += usage.totalTokenCount || 0;
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts
      .map((part: any) => part?.functionCall || part?.function_call)
      .filter((call: any) => call && typeof call.name === 'string');

    if (functionCalls.length === 0) {
      finalText = parts
        .map((part: any) => part?.text)
        .filter(Boolean)
        .join('')
        .trim();
      break;
    }

    contents.push({
      role: 'model',
      parts: functionCalls.map((call: any) => ({ functionCall: call }))
    });

    const responses: Array<{ name: string; response: any }> = [];
    for (const call of functionCalls) {
      const name = call.name as string;
      try {
        const result = await executeOrionToolCall({ name, args: call.args }, ctx);
        responses.push({ name, response: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        responses.push({ name, response: { ok: false, error: message } });
      }
    }

    contents.push({
      role: 'user',
      parts: buildFunctionResponseParts(responses)
    });
  }

  return {
    content: finalText || 'Keine Antwort erhalten.',
    provider: 'gemini',
    model: selectedModel || resolvedGeminiToolModel || undefined,
    usage: {
      promptTokens: totalPromptTokens || undefined,
      completionTokens: totalCompletionTokens || undefined,
      totalTokens: totalTokens || undefined
    }
  };
}

export type { ToolContext };
