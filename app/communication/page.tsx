import PageShell from '@/app/components/PageShell';
import CommunicationClient from './CommunicationClient';

export default function CommunicationPage() {
  return (
    <PageShell
      contentClassName="flex-1 relative overflow-hidden px-0 pb-0 pt-0 sm:px-0 lg:ml-[280px] lg:p-0 transition-all"
      containerClassName="relative w-full"
      showGlow={false}
    >
      <CommunicationClient />
    </PageShell>
  );
}
