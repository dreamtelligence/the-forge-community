import { NextRequest, NextResponse } from 'next/server';
import { addFounder } from '@/lib/notion';
import { prisma } from '@/lib/prisma';
import { RateLimiters } from '@/lib/rate-limit';
import { trackServerError } from '@/lib/error-tracking';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await RateLimiters.publicForm(request);
    if (rateLimited) return rateLimited;

    const body = await request.json();

    const { name, email, phone, instagram, why, role, capital, skill, turnstileToken } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Turnstile Verification
    const isHuman = await verifyTurnstileToken(turnstileToken);
    if (!isHuman) {
      return NextResponse.json(
        { success: false, error: 'Sicherheitsscheck fehlgeschlagen (Turnstile).' },
        { status: 403 }
      );
    }

    // 1. Save to Database (Primary Source)
    const application = await prisma.founderApplication.create({
      data: {
        name,
        email,
        phone,
        instagram,
        why,
        role,
        capital,
        skill,
        status: 'PENDING'
      }
    });

    // 2. Sync to Notion (Secondary / Backup) - Non-blocking
    addFounder({
      name,
      email,
      phone,
      instagram,
      why,
      role,
      capital,
      skill,
    }).catch(err => console.error('Notion Sync Error:', err));

    return NextResponse.json({
      success: true,
      message: 'Founder application submitted successfully',
      founderId: application.id,
    });
  } catch (error) {
    console.error('API Error:', error);
    await trackServerError(error, {
      route: '/api/founders/add',
      phase: 'submit',
    });
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
