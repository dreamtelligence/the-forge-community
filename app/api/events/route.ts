import { NextResponse } from 'next/server';
import { getEvents, addEvent } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventName, description, date, type, locationLink } = body;

    if (!eventName || !description || !date || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await addEvent({
      eventName,
      description,
      date,
      type,
      locationLink,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding event:', error);
    return NextResponse.json(
      { error: 'Failed to add event' },
      { status: 500 }
    );
  }
}
