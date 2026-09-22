import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWebinarReminderWhatsApp } from '@/lib/wacrm';
import { logError } from '@/lib/debug';

export async function GET(request: Request) {
  // Simple authorization to ensure this is only triggered by our secure cron job
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    // For 24h window
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find upcoming published webinars scheduled within the next 24 hours OR that just started
    const upcomingWebinars = await db.webinar.findMany({
      where: {
        isPublished: true,
        scheduledAt: {
          gt: now,
          lte: tomorrow
        }
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        meetLink: true
      }
    });

    if (upcomingWebinars.length === 0) {
      return NextResponse.json({ success: true, message: 'No upcoming webinars to process.' });
    }

    let total24h = 0;

    for (const webinar of upcomingWebinars) {
      // Determine which threshold this webinar currently meets
      const timeUntilStart = webinar.scheduledAt.getTime() - now.getTime();

      const meets24h = timeUntilStart > 0 && timeUntilStart <= 24 * 60 * 60 * 1000;

      // Find all registrations for this webinar
      const registrations = await db.webinarRegistration.findMany({
        where: { webinarId: webinar.id },
        select: {
          id: true,
          name: true,
          phone: true,
          countryCode: true,
          reminder24hSent: true
        }
      });

      if (registrations.length === 0) continue;

      for (const reg of registrations) {
        const fullPhone = `${(reg.countryCode ?? '91').replace('+', '')}${reg.phone}`;
        const wacrmOpts = {
          phone: fullPhone,
          name: reg.name,
          webinarTitle: webinar.title,
          scheduledAt: webinar.scheduledAt,
          meetLink: webinar.meetLink
        };

        const updates: Partial<{
          reminder24hSent: boolean;
        }> = {};

        // 24-hour reminder check
        if (meets24h && !reg.reminder24hSent) {
          await sendWebinarReminderWhatsApp(wacrmOpts);
          updates.reminder24hSent = true;
          total24h++;
        }

        if (Object.keys(updates).length > 0) {
          await db.webinarRegistration.update({
            where: { id: reg.id },
            data: updates
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${upcomingWebinars.length} webinars. Sent ${total24h} 24h reminders.`
    });
  } catch (error) {
    logError('CRON_WEBINAR_REMINDERS', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
