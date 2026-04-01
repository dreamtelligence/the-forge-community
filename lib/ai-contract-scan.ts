import type { ContractScanResult } from '@/types/contract-scan';

const CONTRACT_SCAN_PROMPT = `Du bist ein wirtschaftlicher Vertragsanalyst fuer Startups.
Analysiere den Vertrag auf wirtschaftliche Risiken, Kostenfallen und Plausibilitaet.
Antworte AUSSCHLIESSLICH als JSON, ohne Markdown oder Erklaerungen.

REGELN:
- riskScore: 0 = sehr geringes Risiko, 100 = extrem hohes Risiko.
- summary: 3-6 kurze, klare Bullet-Statements.
- costSummary: nur Werte, die im Vertrag stehen. Wenn unklar, leeren String setzen.
- riskFlags: klare Titel, konkrete Details, wo moeglich Klausel/Abschnitt nennen.
- plausibilityIssues: nenne Inkonsistenzen, Widersprueche, fehlende Summen, unrealistische Kosten.
- missingInfo: fehlende wirtschaftliche Eckdaten (Preis, Laufzeit, Kuendigungsfrist, etc.).
- counterOfferOptions: 3-6 konkrete Verhandlungsvorschlaege.
- emailDraft: kurze, professionelle Email auf Deutsch, mit freundlichem Ton, und mind. 2 klaren Gegenangeboten.

Gib genau dieses JSON-Format zurueck:
{
  "riskScore": 0,
  "summary": ["..."],
  "costSummary": {
    "currency": "EUR",
    "totalEstimated": "",
    "recurringCosts": "",
    "oneTimeCosts": "",
    "paymentTerms": "",
    "priceIncreaseClause": "",
    "minimumCommitment": "",
    "autoRenewal": ""
  },
  "riskFlags": [
    { "severity": "high", "title": "", "detail": "", "clause": "" }
  ],
  "plausibilityIssues": ["..."],
  "missingInfo": ["..."],
  "counterOfferOptions": ["..."],
  "emailDraft": {
    "subject": "",
    "body": ""
  }
}`;

const MODEL_CANDIDATES = [
  process.env.GEMINI_CONTRACT_MODEL,
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
].filter(Boolean) as string[];

const API_VERSION_CANDIDATES = Array.from(
  new Set([process.env.GEMINI_API_VERSION || 'v1', 'v1beta'])
);

const extractJson = (text: string): ContractScanResult => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain JSON');
  }
  return JSON.parse(text.slice(start, end + 1)) as ContractScanResult;
};

export async function analyzeContractPdf(params: {
  fileName: string;
  buffer: Buffer;
  context?: string;
}): Promise<ContractScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const base64 = params.buffer.toString('base64');
  const contextNote = params.context?.trim()
    ? `NUTZER-KONTEXT: ${params.context.trim()}`
    : 'NUTZER-KONTEXT: (keine Zusatzinfos)';

  let lastError: Error | null = null;

  for (const apiVersion of API_VERSION_CANDIDATES) {
    for (const model of MODEL_CANDIDATES) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${CONTRACT_SCAN_PROMPT}\n\n${contextNote}` },
                    {
                      inline_data: {
                        mime_type: 'application/pdf',
                        data: base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1400,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 404) {
            continue;
          }
          throw new Error(`Gemini API error: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return extractJson(text);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown Gemini error');
      }
    }
  }

  throw lastError || new Error('Gemini API error: No supported model found');
}
