import { auth } from '@/auth';
import { researchWithAI, factCheckWithWeb, researchSupplier } from '@/lib/ai/research';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, type = 'general', attachments } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const attachmentList = Array.isArray(attachments) ? attachments : [];
    const isTextAttachment = (item: any) => {
      const mime = String(item?.type || '').toLowerCase();
      const name = String(item?.name || '').toLowerCase();
      return (
        mime.startsWith('text/') ||
        mime === 'application/json' ||
        name.endsWith('.txt') ||
        name.endsWith('.md') ||
        name.endsWith('.csv') ||
        name.endsWith('.json')
      );
    };
    const limitText = (value: string, max = 1200) =>
      value.length > max ? `${value.slice(0, max).trim()}…` : value;

    let attachmentContext = '';
    if (attachmentList.length > 0) {
      const lines: string[] = [];
      const snippets: string[] = [];
      for (const item of attachmentList) {
        const name = String(item?.name || 'file');
        const type = String(item?.type || 'unknown');
        const url = String(item?.url || '');
        lines.push(`- ${name} (${type}) ${url}`.trim());
        if (isTextAttachment(item) && url) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const text = await res.text();
              if (text.trim()) {
                snippets.push(`--- ${name} ---\n${limitText(text)}`);
              }
            }
          } catch {
            // ignore
          }
        }
      }
      attachmentContext = `
Anhänge:
${lines.join('\n')}
${snippets.length ? `\nDatei-Auszüge:\n${snippets.join('\n\n')}` : ''}
`.trim();
    }

    let result;
    const fullQuery = attachmentContext ? `${query}\n\n${attachmentContext}` : query;
    
    switch (type) {
      case 'supplier':
        result = await researchSupplier(fullQuery);
        break;
      case 'factcheck':
        result = await factCheckWithWeb(fullQuery);
        break;
      case 'general':
      default:
        result = await researchWithAI(fullQuery);
        break;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Research failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
