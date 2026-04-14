import React from 'react';
import { generateOrganizationSchema, generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/utils/seo';
import type { Locale } from '@/lib/i18n';
import deCopy from '@/lib/i18n/copy/de';
import enCopy from '@/lib/i18n/copy/en';

type FaqItem = {
  question: string;
  answer: string;
};

function getFaqItems(locale: Locale): FaqItem[] {
  const source = locale === 'en' ? enCopy : deCopy;
  const items = (source?.faq?.items ?? []) as Array<{ question?: string; answer?: string }>;
  return items
    .filter((item) => typeof item.question === 'string' && typeof item.answer === 'string')
    .map((item) => ({ question: item.question as string, answer: item.answer as string }));
}

export default function StructuredData({ locale }: { locale: Locale }) {
  const organizationSchema = generateOrganizationSchema();
  const softwareSchema = generateSoftwareApplicationSchema();
  const faqSchema = generateFAQSchema(getFaqItems(locale));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
