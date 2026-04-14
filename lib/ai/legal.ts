/**
 * AI Legal Helper - Contract Generation with Gemini/Groq
 */

import { callAI, type AIResponse } from './index';
import type {
  LegalDocumentType,
  ContractTerms,
  PartnerInfo,
  AIContractGenerationRequest,
} from '@/types/legal';

// ============================================
// TEMPLATE SYSTEM PROMPTS
// ============================================

const LEGAL_SYSTEM_PROMPT = `Du bist ein AI Legal Assistant für STAKE & SCALE.

AUFGABE: Erstelle professionelle, rechtssichere Verträge auf Deutsch.

WICHTIGE REGELN:
1. Verwende klare, präzise Rechtssprache
2. Strukturiere mit §§ 1-X (deutsche Standard-Klauselstruktur)
3. Füge Standard-Klauseln ein (Gerichtsstand, Salvatorische Klausel, etc.)
4. Nutze Placeholder für Signaturen: [SIGNATURE_DATE], [SIGNATURE_A], [SIGNATURE_B]
5. Nutze bereitgestellte Rechtsquellen als Arbeitsgrundlage; erfinde keine konkreten Paragraphen
6. Füge IMMER folgenden Disclaimer am Ende hinzu:

"RECHTLICHER HINWEIS: Dieser Vertrag wurde AI-generiert und dient als Vorlage.
Vor Unterzeichnung sollte der Vertrag durch einen Fachanwalt geprüft werden."

FORMAT: Professioneller Vertragstext, keine Markdown-Formatierung.`;

// ============================================
// DOCUMENT TYPE SPECIFIC INSTRUCTIONS
// ============================================

const DOCUMENT_TYPE_INSTRUCTIONS: Record<LegalDocumentType, string> = {
  NDA: `
VERTRAG: Gegenseitige Geheimhaltungsvereinbarung (Mutual NDA)

PFLICHT-KLAUSELN:
§1 Vertrauliche Informationen (Definition)
§2 Geheimhaltungspflichten
§3 Ausnahmen von der Geheimhaltungspflicht
§4 Rückgabe vertraulicher Informationen
§5 Laufzeit der Geheimhaltung
§6 Vertragsstrafe bei Verstoß
§7 Gerichtsstand und anwendbares Recht
§8 Salvatorische Klausel

BESONDERHEITEN:
- Klar definieren, was "vertrauliche Informationen" sind
- Ausnahmen präzise formulieren (öffentlich bekannt, rechtlich verpflichtet, etc.)
- Vertragsstrafe optional, aber empfohlen`,

  SERVICE_AGREEMENT: `
VERTRAG: Dienstleistungsvertrag (Service Agreement)

PFLICHT-KLAUSELN:
§1 Vertragsgegenstand und Leistungsumfang
§2 Vergütung und Zahlungsbedingungen
§3 Leistungszeit und Termine
§4 Pflichten des Auftragnehmers
§5 Pflichten des Auftraggebers
§6 Haftung und Gewährleistung
§7 Urheberrecht und Nutzungsrechte
§8 Vertraulichkeit
§9 Kündigung
§10 Gerichtsstand und anwendbares Recht
§11 Salvatorische Klausel

BESONDERHEITEN:
- Leistungsumfang sehr präzise beschreiben
- Zahlungsbedingungen klar definieren (Vorschuss, Teilzahlungen, Endzahlung)
- Haftungsbeschränkungen beachten`,

  PARTNERSHIP: `
VERTRAG: Partnerschaftsvereinbarung (B2B Partnership Agreement)

PFLICHT-KLAUSELN:
§1 Vertragsgegenstand und Ziele der Partnerschaft
§2 Leistungen der Partner
§3 Gewinn- und Verlustbeteiligung
§4 Zusammenarbeit und Kommunikation
§5 Vertraulichkeit
§6 Exklusivität (optional)
§7 Laufzeit und Verlängerung
§8 Kündigung
§9 Folgen der Beendigung
§10 Gerichtsstand und anwendbares Recht
§11 Salvatorische Klausel

BESONDERHEITEN:
- Revenue Sharing klar definieren
- Verantwortlichkeiten jedes Partners präzise festlegen
- Exit-Szenarien regeln`,

  SUPPLIER_CONTRACT: `
VERTRAG: Lieferantenvertrag (Supplier Contract)

PFLICHT-KLAUSELN:
§1 Vertragsgegenstand und Lieferumfang
§2 Preise und Zahlungsbedingungen
§3 Mindestbestellmengen (MOQ)
§4 Lieferzeiten und -bedingungen
§5 Qualitätsstandards und Abnahme
§6 Mängelhaftung und Gewährleistung
§7 Produkthaftung
§8 Vertraulichkeit
§9 Laufzeit und Kündigung
§10 Gerichtsstand und anwendbares Recht
§11 Salvatorische Klausel

BESONDERHEITEN:
- MOQ und Lead Times klar definieren
- Qualitätsstandards präzise beschreiben
- Lieferverzug und Konsequenzen regeln`,

  EMPLOYMENT: `
VERTRAG: Arbeitsvertrag (Employment Contract)

PFLICHT-KLAUSELN (nach deutschem Arbeitsrecht):
§1 Vertragsparteien
§2 Beginn und Dauer des Arbeitsverhältnisses
§3 Tätigkeitsbeschreibung
§4 Arbeitszeit
§5 Vergütung
§6 Urlaub
§7 Krankheit
§8 Nebentätigkeiten
§9 Verschwiegenheit
§10 Wettbewerbsverbot (optional)
§11 Beendigung des Arbeitsverhältnisses
§12 Schlussbestimmungen

BESONDERHEITEN:
- MUSS deutsches Arbeitsrecht beachten
- Kündigungsfristen nach BGB
- Bei Mini-Job: Regelungen für geringfügige Beschäftigung`,

  CUSTOM: `
VERTRAG: Individueller Vertrag (Custom Template)

PFLICHT-KLAUSELN:
§1 Vertragsgegenstand
§2-X: [Je nach Vertragstyp]
§X Gerichtsstand und anwendbares Recht
§X+1 Salvatorische Klausel

BESONDERHEITEN:
- Basiere auf den Angaben des Users
- Nutze Standard-Vertragsstruktur
- Ergänze fehlende Standard-Klauseln`,
};

// ============================================
// MAIN CONTRACT GENERATION FUNCTION
// ============================================

export async function generateContract(
  request: AIContractGenerationRequest
): Promise<AIResponse> {
  const {
    documentType,
    documentTitle,
    partnerInfo,
    contractTerms,
    brandContext,
    additionalInstructions,
    legalGrounding,
  } = request;

  // Build comprehensive prompt
  const prompt = buildContractPrompt({
    documentType,
    documentTitle,
    partnerInfo,
    contractTerms,
    brandContext,
    additionalInstructions,
    legalGrounding,
  });

  // Call AI (Gemini primary, Groq fallback)
  return await callAI(
    [
      {
        role: 'system',
        content: LEGAL_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.2, // Low temperature for legal precision
      maxTokens: 3000, // Contracts can be long
    }
  );
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildContractPrompt(params: {
  documentType: LegalDocumentType;
  documentTitle: string;
  partnerInfo: PartnerInfo;
  contractTerms: ContractTerms;
  brandContext?: {
    brandName: string;
    mission?: string;
    toneOfVoice?: string;
  };
  additionalInstructions?: string;
  legalGrounding?: {
    context: string;
    corpusVersion: string;
    lastSyncedAt?: string;
    citations: Array<{
      sourceId: string;
      title: string;
      url: string;
      jurisdiction: 'DE' | 'EU';
      excerpt: string;
    }>;
  };
}): string {
  const {
    documentType,
    documentTitle,
    partnerInfo,
    contractTerms,
    brandContext,
    additionalInstructions,
    legalGrounding,
  } = params;

  // Get document-specific instructions
  const typeInstructions = DOCUMENT_TYPE_INSTRUCTIONS[documentType];

  // Build prompt sections
  const sections: string[] = [
    `VERTRAGSTYP: ${documentType}`,
    `TITEL: ${documentTitle}`,
    '',
    typeInstructions,
    '',
    '=== VERTRAGSPARTEIEN ===',
    '',
    `PARTEI A (Auftraggeber):`,
    brandContext
      ? `Firma: ${brandContext.brandName}`
      : `Firma: [AUFTRAGGEBER_FIRMA]`,
    `[AUFTRAGGEBER_ADRESSE]`,
    ``,
    `PARTEI B (Auftragnehmer/Partner):`,
    `Firma: ${partnerInfo.companyName}`,
    `Vertreten durch: ${partnerInfo.contactName}`,
    `E-Mail: ${partnerInfo.contactEmail}`,
  ];

  if (legalGrounding?.context) {
    sections.push('');
    sections.push('=== RECHTLICHE ARBEITSGRUNDLAGE (DE/EU) ===');
    sections.push(`Korpus-Version: ${legalGrounding.corpusVersion}`);
    if (legalGrounding.lastSyncedAt) {
      sections.push(`Korpus-Stand: ${legalGrounding.lastSyncedAt}`);
    }
    sections.push(legalGrounding.context);
    sections.push(
      'Nutze diese Quellen fuer Struktur und Risikoklauseln. Falls unklar, konservative Formulierung waehlen und anwaltliche Pruefung markieren.'
    );
  }

  if (partnerInfo.contactPhone) {
    sections.push(`Telefon: ${partnerInfo.contactPhone}`);
  }

  if (partnerInfo.address) {
    sections.push(`Adresse: ${partnerInfo.address}`);
  }

  if (partnerInfo.vatId) {
    sections.push(`USt-IdNr.: ${partnerInfo.vatId}`);
  }

  sections.push('');
  sections.push('=== VERTRAGSBEDINGUNGEN ===');
  sections.push('');

  // Add contract terms
  if (contractTerms.duration) {
    sections.push(`Laufzeit: ${contractTerms.duration}`);
  }

  if (contractTerms.paymentTerms) {
    sections.push(`Zahlungsbedingungen: ${contractTerms.paymentTerms}`);
  }

  if (contractTerms.scope) {
    sections.push(`Leistungsumfang: ${contractTerms.scope}`);
  }

  if (contractTerms.deliverables && contractTerms.deliverables.length > 0) {
    sections.push(`Liefergegenstände:`);
    contractTerms.deliverables.forEach((item) => {
      sections.push(`  - ${item}`);
    });
  }

  if (contractTerms.terminationClause) {
    sections.push(`Kündigungsregelung: ${contractTerms.terminationClause}`);
  }

  if (contractTerms.liabilityLimit) {
    sections.push(`Haftungsbeschränkung: ${contractTerms.liabilityLimit}`);
  }

  if (contractTerms.governingLaw) {
    sections.push(`Anwendbares Recht: ${contractTerms.governingLaw}`);
  }

  // Add custom clauses
  if (contractTerms.customClauses) {
    sections.push('');
    sections.push('Zusätzliche Klauseln:');
    Object.entries(contractTerms.customClauses).forEach(([key, value]) => {
      sections.push(`${key}: ${value}`);
    });
  }

  // Add brand context
  if (brandContext?.toneOfVoice) {
    sections.push('');
    sections.push(`TONALITÄT: ${brandContext.toneOfVoice}`);
  }

  // Add additional instructions
  if (additionalInstructions) {
    sections.push('');
    sections.push('ZUSÄTZLICHE ANWEISUNGEN:');
    sections.push(additionalInstructions);
  }

  sections.push('');
  sections.push('AUSGABE: Vollständiger Vertragstext mit allen Klauseln.');

  return sections.join('\n');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate contract terms completeness
 */
export function validateContractTerms(
  documentType: LegalDocumentType,
  contractTerms: ContractTerms
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  // Required fields per document type
  const requiredFields: Record<LegalDocumentType, (keyof ContractTerms)[]> = {
    NDA: ['duration', 'governingLaw'],
    SERVICE_AGREEMENT: ['scope', 'paymentTerms', 'governingLaw'],
    PARTNERSHIP: ['scope', 'duration', 'governingLaw'],
    SUPPLIER_CONTRACT: ['paymentTerms', 'governingLaw'],
    EMPLOYMENT: ['paymentTerms', 'scope', 'governingLaw'],
    CUSTOM: [],
  };

  const required = requiredFields[documentType];

  required.forEach((field) => {
    if (!contractTerms[field]) {
      missingFields.push(field);
    }
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Format contract for display (add line numbers, etc.)
 */
export function formatContractForDisplay(content: string): string {
  const lines = content.split('\n');
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

/**
 * Extract contract sections (§§) for quick navigation
 */
export function extractContractSections(content: string): {
  section: string;
  content: string;
}[] {
  const sections: { section: string; content: string }[] = [];
  const lines = content.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  lines.forEach((line) => {
    // Detect section headers (§1, §2, etc.)
    const sectionMatch = line.match(/^§\s*(\d+)/);

    if (sectionMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          section: currentSection,
          content: currentContent.join('\n').trim(),
        });
      }

      // Start new section
      currentSection = line.trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  });

  // Add last section
  if (currentSection) {
    sections.push({
      section: currentSection,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections;
}
