'use client';

import { useRouter } from 'next/navigation';
import { TemplateSelector, type Template } from '@/app/components/forge/TemplateSelector';

interface TemplateSelectorClientProps {
  templates: Template[];
  ventureId: string;
}

export default function TemplateSelectorClient({
  templates,
  ventureId,
}: TemplateSelectorClientProps) {
  const router = useRouter();

  return (
    <TemplateSelector
      templates={templates}
      onSelect={(templateId) => {
        router.push(`/forge/${ventureId}/legal/contracts/new?template=${templateId}`);
      }}
    />
  );
}
