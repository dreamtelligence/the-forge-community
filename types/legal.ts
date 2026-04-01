/**
 * Legal Studio - TypeScript Type Definitions
 *
 * Type-safe interfaces for legal document generation and management.
 * Synced with Prisma schema and database enums.
 */

import { z } from 'zod';
import type { LegalDocument, LegalDocumentType, LegalDocumentStatus } from '@prisma/client';

// ============================================
// PRISMA TYPE EXPORTS
// ============================================

export type {
  LegalDocument,
  LegalDocumentType,
  LegalDocumentStatus,
} from '@prisma/client';

// ============================================
// EXTENDED TYPES FOR UI
// ============================================

/**
 * Legal Document with Relations (for queries)
 */
export interface LegalDocumentWithRelations extends LegalDocument {
  venture: {
    id: string;
    name: string;
  };
  squad?: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Contract Terms Structure (stored as JSON)
 */
export interface ContractTerms {
  duration?: string;           // "12 months", "indefinite", "2 years"
  paymentTerms?: string;        // "Net 30", "50% upfront, 50% on delivery"
  scope?: string;               // Description of work/services
  deliverables?: string[];      // List of deliverables
  terminationClause?: string;   // How to terminate the contract
  liabilityLimit?: string;      // Liability cap
  governingLaw?: string;        // "Germany", "EU", etc.
  customClauses?: Record<string, string>; // Additional custom terms
}

/**
 * Partner Information
 */
export interface PartnerInfo {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  vatId?: string;               // Tax ID
  registrationNumber?: string;  // Company registration
}

/**
 * AI Generation Request
 */
export interface AIContractGenerationRequest {
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
}

/**
 * AI Generation Response
 */
export interface AIContractGenerationResponse {
  success: boolean;
  generatedContent?: string;
  aiPrompt?: string;
  provider?: 'gemini' | 'groq';
  error?: string;
  warnings?: string[];
}

/**
 * Document Statistics (for dashboard)
 */
export interface LegalDocumentStats {
  total: number;
  byStatus: Record<LegalDocumentStatus, number>;
  byType: Record<LegalDocumentType, number>;
  recentDocuments: LegalDocument[];
  expiringThisMonth: number;
}

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

/**
 * Contract Terms Validation
 */
export const ContractTermsSchema = z.object({
  duration: z.string().optional(),
  paymentTerms: z.string().optional(),
  scope: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  terminationClause: z.string().optional(),
  liabilityLimit: z.string().optional(),
  governingLaw: z.string().optional(),
  customClauses: z.record(z.string(), z.string()).optional(),
});

/**
 * Partner Info Validation
 */
export const PartnerInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  vatId: z.string().optional(),
  registrationNumber: z.string().optional(),
});

/**
 * Create Legal Document Request Validation
 */
export const CreateLegalDocumentSchema = z.object({
  ventureId: z.string().cuid('Invalid venture ID'),
  documentType: z.enum([
    'NDA',
    'SERVICE_AGREEMENT',
    'PARTNERSHIP',
    'SUPPLIER_CONTRACT',
    'EMPLOYMENT',
    'CUSTOM',
  ]),
  documentTitle: z.string().min(3, 'Document title too short').max(255, 'Document title too long'),
  partnerInfo: PartnerInfoSchema,
  contractTerms: ContractTermsSchema,
  additionalInstructions: z.string().max(1000, 'Instructions too long').optional(),
});

/**
 * Update Legal Document Request Validation
 */
export const UpdateLegalDocumentSchema = z.object({
  documentTitle: z.string().min(3).max(255).optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED']).optional(),
  generatedContent: z.string().optional(),
  partnerInfo: PartnerInfoSchema.partial().optional(),
  contractTerms: ContractTermsSchema.optional(),
  notes: z.string().max(5000).optional(),
  documentUrl: z.string().url().optional(),
  signatureUrl: z.string().url().optional(),
  sentAt: z.date().optional(),
  signedAt: z.date().optional(),
  expiresAt: z.date().optional(),
});

/**
 * AI Generation Request Validation
 */
export const AIGenerationRequestSchema = z.object({
  documentType: z.enum([
    'NDA',
    'SERVICE_AGREEMENT',
    'PARTNERSHIP',
    'SUPPLIER_CONTRACT',
    'EMPLOYMENT',
    'CUSTOM',
  ]),
  documentTitle: z.string().min(3).max(255),
  partnerInfo: PartnerInfoSchema,
  contractTerms: ContractTermsSchema,
  additionalInstructions: z.string().max(1000).optional(),
});

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if a value is a valid LegalDocumentType
 */
export function isValidDocumentType(value: string): value is LegalDocumentType {
  return [
    'NDA',
    'SERVICE_AGREEMENT',
    'PARTNERSHIP',
    'SUPPLIER_CONTRACT',
    'EMPLOYMENT',
    'CUSTOM',
  ].includes(value);
}

/**
 * Check if a value is a valid LegalDocumentStatus
 */
export function isValidDocumentStatus(value: string): value is LegalDocumentStatus {
  return ['DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED'].includes(value);
}

/**
 * Check if document can be edited (status check)
 */
export function isDocumentEditable(status: LegalDocumentStatus): boolean {
  return status === 'DRAFT' || status === 'REVIEW';
}

/**
 * Check if document is finalized
 */
export function isDocumentFinalized(status: LegalDocumentStatus): boolean {
  return status === 'SIGNED' || status === 'ARCHIVED';
}

// ============================================
// TEMPLATE DEFINITIONS
// ============================================

/**
 * Legal Document Template
 */
export interface LegalDocumentTemplate {
  id: string;
  type: LegalDocumentType;
  name: string;
  description: string;
  icon: string;
  defaultTerms: Partial<ContractTerms>;
  aiInstructions: string;
  requiredFields: (keyof PartnerInfo)[];
}

/**
 * Available Templates
 */
export const LEGAL_DOCUMENT_TEMPLATES: LegalDocumentTemplate[] = [
  {
    id: 'nda',
    type: 'NDA',
    name: 'NDA (Non-Disclosure Agreement)',
    description: 'Protect confidential information shared with partners, suppliers, or contractors.',
    icon: 'Shield',
    defaultTerms: {
      duration: '2 years',
      governingLaw: 'Germany',
    },
    aiInstructions: 'Create a mutual non-disclosure agreement suitable for B2B partnerships.',
    requiredFields: ['companyName', 'contactName', 'contactEmail', 'address'],
  },
  {
    id: 'service-agreement',
    type: 'SERVICE_AGREEMENT',
    name: 'Service Agreement',
    description: 'Contract for hiring freelancers, contractors, or service providers.',
    icon: 'Briefcase',
    defaultTerms: {
      paymentTerms: 'Net 30',
      governingLaw: 'Germany',
    },
    aiInstructions: 'Generate a service agreement for freelance work with clear scope and payment terms.',
    requiredFields: ['companyName', 'contactName', 'contactEmail'],
  },
  {
    id: 'partnership',
    type: 'PARTNERSHIP',
    name: 'Partnership Agreement',
    description: 'B2B collaboration agreement for revenue sharing, co-marketing, or joint ventures.',
    icon: 'Users2',
    defaultTerms: {
      duration: '12 months',
      governingLaw: 'Germany',
    },
    aiInstructions: 'Create a partnership agreement with clear roles, responsibilities, and revenue sharing.',
    requiredFields: ['companyName', 'contactName', 'contactEmail', 'address'],
  },
  {
    id: 'supplier',
    type: 'SUPPLIER_CONTRACT',
    name: 'Supplier Contract',
    description: 'Terms and conditions for manufacturers, suppliers, or wholesalers.',
    icon: 'Factory',
    defaultTerms: {
      paymentTerms: '50% upfront, 50% on delivery',
      governingLaw: 'Germany',
    },
    aiInstructions: 'Generate a supplier contract with MOQ, delivery terms, and quality standards.',
    requiredFields: ['companyName', 'contactName', 'contactEmail', 'address'],
  },
  {
    id: 'employment',
    type: 'EMPLOYMENT',
    name: 'Employment Contract',
    description: 'Hire employees (full-time, part-time, or mini-job).',
    icon: 'UserCheck',
    defaultTerms: {
      governingLaw: 'Germany',
    },
    aiInstructions: 'Create an employment contract compliant with German labor law.',
    requiredFields: ['contactName', 'contactEmail', 'address'],
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get template by document type
 */
export function getTemplateByType(type: LegalDocumentType): LegalDocumentTemplate | undefined {
  return LEGAL_DOCUMENT_TEMPLATES.find((t) => t.type === type);
}

/**
 * Format document status for display
 */
export function formatDocumentStatus(status: LegalDocumentStatus): string {
  const statusMap: Record<LegalDocumentStatus, string> = {
    DRAFT: 'Draft',
    REVIEW: 'In Review',
    SENT: 'Sent to Partner',
    SIGNED: 'Signed',
    ARCHIVED: 'Archived',
    REJECTED: 'Rejected',
  };
  return statusMap[status] || status;
}

/**
 * Get status color (for UI badges)
 */
export function getStatusColor(status: LegalDocumentStatus): string {
  const colorMap: Record<LegalDocumentStatus, string> = {
    DRAFT: 'gray',
    REVIEW: 'blue',
    SENT: 'purple',
    SIGNED: 'green',
    ARCHIVED: 'gray',
    REJECTED: 'red',
  };
  return colorMap[status] || 'gray';
}
