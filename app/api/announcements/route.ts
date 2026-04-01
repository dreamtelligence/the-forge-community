import { NextResponse } from 'next/server';
import { getAnnouncements, addAnnouncement } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const announcements = await getAnnouncements();
    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, category, priority, author } = body;

    if (!title || !content || !category || !priority || !author) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await addAnnouncement({
      title,
      content,
      category,
      priority,
      author,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding announcement:', error);
    return NextResponse.json(
      { error: 'Failed to add announcement' },
      { status: 500 }
    );
  }
}
