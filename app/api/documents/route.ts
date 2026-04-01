import { NextResponse } from 'next/server';
import { getDocuments, addDocument } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const documents = await getDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, category, url, accessLevel } = body;

    if (!name || !description || !category || !url || !accessLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await addDocument({
      name,
      description,
      category,
      url,
      accessLevel,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding document:', error);
    return NextResponse.json(
      { error: 'Failed to add document' },
      { status: 500 }
    );
  }
}
