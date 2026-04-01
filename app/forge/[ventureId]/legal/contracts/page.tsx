import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { Scale, FileText, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function ContractsListPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) return notFound();

  const { ventureId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return notFound();

  const legalDocuments = await prisma.legalDocument.findMany({
    where: { ventureId: ventureId },
    orderBy: { createdAt: 'desc' },
    include: {
        createdBy: { select: { name: true, email: true } }
    }
  });

  return (
    <StudioShell
      title="Contracts"
      description="Alle rechtlichen Dokumente deines Ventures."
      icon={<Scale className="w-6 h-6 text-[#FF9900]" />}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-instrument-serif text-white">Dokumentenliste</h2>
          <Link
            href={`/forge/${ventureId}/legal/contracts/new`}
            className="px-4 py-2 rounded-lg bg-[#FF9900] text-black font-bold hover:bg-[#FF9900] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neues Dokument
          </Link>
        </div>

        {legalDocuments.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {legalDocuments.map((doc) => (
              <Link
                key={doc.id}
                href={`/forge/${ventureId}/legal/contracts/${doc.id}`}
                className="glass-card p-5 rounded-xl border border-white/10 hover:border-[#FF9900]/30 transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#FF9900]/10 transition-colors">
                  <FileText className="w-6 h-6 text-white/40 group-hover:text-[#FF9900] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{doc.documentTitle}</h3>
                  <p className="text-xs text-white/40">
                    {doc.partnerCompanyName || 'Kein Partner'} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                    doc.status === 'SIGNED' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'
                  }`}>
                    {doc.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 rounded-2xl border border-white/10 text-center">
            <Scale className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-sm text-white/40">Keine Dokumente gefunden.</p>
          </div>
        )}
      </div>
    </StudioShell>
  );
}
