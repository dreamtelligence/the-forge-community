export type RiskSeverity = 'high' | 'medium' | 'low';

export type ContractScanResult = {
  riskScore: number;
  summary: string[];
  costSummary: {
    currency?: string;
    totalEstimated?: string;
    recurringCosts?: string;
    oneTimeCosts?: string;
    paymentTerms?: string;
    priceIncreaseClause?: string;
    minimumCommitment?: string;
    autoRenewal?: string;
  };
  riskFlags: Array<{
    severity: RiskSeverity;
    title: string;
    detail: string;
    clause?: string;
  }>;
  plausibilityIssues: string[];
  missingInfo: string[];
  counterOfferOptions: string[];
  emailDraft: {
    subject: string;
    body: string;
  };
};
