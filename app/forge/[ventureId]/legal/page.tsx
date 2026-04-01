/**
 * Legal Studio - Main Page
 * Entry point for legal document management
 */

import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { StudioShell } from '@/app/components/forge/StudioShell';
import type { Template } from '@/app/components/forge/TemplateSelector';
import TemplateSelectorClient from './TemplateSelectorClient';
import { Scale, FileText, Shield, Briefcase, Users2, Factory, Plus } from 'lucide-react';
import Link from 'next/link';
import { LEGAL_DOCUMENT_TEMPLATES } from '@/types/legal';
import ForgeAIContextSetter from '@/app/components/forge/ForgeAIContextSetter';

export default async function LegalStudioPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) return notFound();

  const { ventureId } = await params;

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return notFound();

  // Fetch venture with Brand DNA and legal documents
  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: {
                userId: user.id,
                leftAt: null,
              },
            },
          },
        },
      ],
    },
    include: {
      brandDNA: true,
      legalDocuments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          createdBy: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!venture) return notFound();

  // Calculate stats
  const totalDocuments = await prisma.legalDocument.count({
    where: { ventureId: venture.id },
  });

  const draftDocuments = await prisma.legalDocument.count({
    where: { ventureId: venture.id, status: 'DRAFT' },
  });

  const signedDocuments = await prisma.legalDocument.count({
    where: { ventureId: venture.id, status: 'SIGNED' },
  });

  // Map templates to TemplateSelector format
  const iconMap: Record<string, React.ReactNode> = {
    Shield: <Shield className="w-5 h-5 text-blue-400" />,
    Briefcase: <Briefcase className="w-5 h-5 text-green-400" />,
    Users2: <Users2 className="w-5 h-5 text-purple-400" />,
    Factory: <Factory className="w-5 h-5 text-orange-400" />,
    UserCheck: <Users2 className="w-5 h-5 text-pink-400" />,
  };

  const templates: Template[] = LEGAL_DOCUMENT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    icon: iconMap[t.icon] || <FileText className="w-5 h-5" />,
  }));

  return (
    <StudioShell
      title="Legal Studio"
      description="Generate contracts and legal documents powered by AI"
      icon={<Scale className="w-6 h-6 text-[#FF9900]" />}
      brandDNA={venture.brandDNA}
      aiProvider="gemini"
      headerAction={
        <Link
          href={`/forge/${ventureId}/legal/contracts/new`}
          className="px-4 py-2 rounded-lg bg-[#FF9900] text-black font-bold hover:bg-[#FF9900] transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Document
        </Link>
      }
    >
      <ForgeAIContextSetter context="Legal Studio - Verträge, NDAs, Compliance & Vorlagen." />
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">
            Total Documents
          </p>
          <p className="text-3xl font-instrument-serif text-white">
            {totalDocuments}
          </p>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">
            Drafts
          </p>
          <p className="text-3xl font-instrument-serif text-white">
            {draftDocuments}
          </p>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">
            Signed
          </p>
          <p className="text-3xl font-instrument-serif text-white text-green-400">
            {signedDocuments}
          </p>
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-instrument-serif text-white mb-2">
              Choose a Template
            </h2>
            <p className="text-sm text-white/60">
              AI will generate a contract using your Brand DNA context
            </p>
          </div>
        </div>

        <TemplateSelectorClient templates={templates} ventureId={ventureId} />
      </div>

      {/* Recent Documents */}
      <div className="glass-card p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-instrument-serif text-white">
            Recent Documents
          </h2>
          <Link
            href={`/forge/${ventureId}/legal/contracts`}
            className="text-xs font-bold text-[#FF9900] hover:text-[#FF9900] transition-colors"
          >
            View All
          </Link>
        </div>

        {venture.legalDocuments && venture.legalDocuments.length > 0 ? (
          <div className="space-y-3">
            {venture.legalDocuments.map((doc) => {
              // Status badge color
              const statusColors = {
                DRAFT: 'bg-gray-500/10 text-gray-400',
                REVIEW: 'bg-blue-500/10 text-blue-400',
                SENT: 'bg-purple-500/10 text-purple-400',
                SIGNED: 'bg-green-500/10 text-green-400',
                ARCHIVED: 'bg-gray-500/10 text-gray-400',
                REJECTED: 'bg-red-500/10 text-red-400',
              };

              return (
                <Link
                  key={doc.id}
                  href={`/forge/${ventureId}/legal/contracts/${doc.id}`}
                  className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-white/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-white font-medium mb-1 truncate">
                      {doc.documentTitle}
                    </h4>
                    <p className="text-xs text-white/40">
                      {doc.partnerCompanyName || 'No partner set'} • Created by {doc.createdBy.name || doc.createdBy.email}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
                      statusColors[doc.status]
                    }`}
                  >
                    {doc.status}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Scale className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-sm text-white/40 mb-4">
              No documents yet. Generate your first contract to get started.
            </p>
            <Link
              href={`/forge/${ventureId}/legal/contracts/new?template=nda`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF9900] text-black font-bold hover:bg-[#FF9900] transition-all"
            >
              <Plus className="w-4 h-4" />
              Generate First Contract
            </Link>
          </div>
        )}
      </div>
    </StudioShell>
  );
}
