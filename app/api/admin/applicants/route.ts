import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const applicants = await prisma.founderApplication.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(applicants);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id, status } = await req.json();

    const application = await prisma.founderApplication.findUnique({ where: { id } });
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    const updated = await prisma.founderApplication.update({
      where: { id },
      data: { status }
    });

    // If status is APPROVED, send the email
    if (status === 'APPROVED') {
      try {
        if (!resend) {
          throw new Error('RESEND_API_KEY is not configured');
        }
        await resend.emails.send({
          from: 'STAKE & SCALE <info@stakeandscale.de>',
          to: application.email,
          subject: 'Willkommen bei STAKE & SCALE 🚀 (Action Required)',
          html: `
            <div style="font-family: sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px;">
              <h1 style="color: #FF9900; font-size: 24px;">Glückwunsch, Operator.</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
                Deine Bewerbung für den <b>Validator Batch</b> wurde soeben vom Nexus Core freigeschaltet. 
                Du hast nun exklusiven Zugang zu unserer Venture-Infrastruktur.
              </p>
              
              <div style="background-color: #111; border: 1px solid #333; padding: 20px; border-radius: 12px; margin: 30px 0;">
                <h2 style="color: #fff; font-size: 18px; margin-top: 0;">Nächste Schritte:</h2>
                <ol style="color: #ccc; padding-left: 20px;">
                  <li>Logge dich über den untenstehenden Link im Dashboard ein.</li>
                  <li>Sichere dir deinen Platz durch das Validator-Ticket (997€/Jahr).</li>
                  <li>Initialisiere deine erste Mission im Brand Studio.</li>
                </ol>
              </div>

              <a href="https://${req.headers.get('host')}/login?email=${application.email}" 
                 style="display: inline-block; background-color: #FF9900; color: #000; padding: 16px 32px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                System Initialisieren & Login
              </a>

              <p style="margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #222; pt: 20px;">
                Dies ist eine automatisierte Nachricht vom STAKE & SCALE Protokoll.<br>
                Support: info@stakeandscale.de
              </p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // We still return the updated application even if email fails, but log it
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
