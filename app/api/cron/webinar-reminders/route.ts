import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  sendWebinarReminderWhatsApp,
  sendWebinarReminder1hWhatsApp,
  sendWebinarReminder0mWhatsApp
} from '@/lib/wacrm';
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
    // For 0m window, we look back 1 hour to catch any that just started (prevent infinite historical sending)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    // For 24h window
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find upcoming published webinars scheduled within the next 24 hours OR that just started
    const upcomingWebinars = await db.webinar.findMany({
      where: {
        isPublished: true,
        scheduledAt: {
          gt: oneHourAgo,
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
    let total1h = 0;
    let total0m = 0;

    for (const webinar of upcomingWebinars) {
      // Determine which threshold this webinar currently meets
      const timeUntilStart = webinar.scheduledAt.getTime() - now.getTime();

      const meets24h = timeUntilStart > 0 && timeUntilStart <= 24 * 60 * 60 * 1000;
      const meets1h = timeUntilStart > 0 && timeUntilStart <= 60 * 60 * 1000;
      const meets0m = timeUntilStart <= 0 && timeUntilStart > -60 * 60 * 1000; // between now and 1 hr ago

      // Find all registrations for this webinar
      const registrations = await db.webinarRegistration.findMany({
        where: { webinarId: webinar.id },
        select: {
          id: true,
          name: true,
          phone: true,
          countryCode: true,
          reminder24hSent: true,
          reminder1hSent: true,
          reminder0mSent: true
        }
      });

      if (registrations.length === 0) continue;

      for (const reg of registrations) {
        const fullPhone = `+${(reg.countryCode ?? '+91').replace('+', '')}${reg.phone}`;
        const wacrmOpts = {
          phone: fullPhone,
          name: reg.name,
          webinarTitle: webinar.title,
          scheduledAt: webinar.scheduledAt,
          meetLink: webinar.meetLink
        };

        const updates: Partial<{
          reminder24hSent: boolean;
          reminder1hSent: boolean;
          reminder0mSent: boolean;
        }> = {};

        // 24-hour reminder check
        if (meets24h && !reg.reminder24hSent) {
          await sendWebinarReminderWhatsApp(wacrmOpts);
          updates.reminder24hSent = true;
          total24h++;
        }

        // 1-hour reminder check
        if (meets1h && !reg.reminder1hSent) {
          await sendWebinarReminder1hWhatsApp(wacrmOpts);
          updates.reminder1hSent = true;
          total1h++;
        }

        // 0-minute (live) reminder check
        if (meets0m && !reg.reminder0mSent) {
          await sendWebinarReminder0mWhatsApp(wacrmOpts);
          updates.reminder0mSent = true;
          total0m++;
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
      message: `Processed ${upcomingWebinars.length} webinars. Sent ${total24h} 24h reminders, ${total1h} 1h reminders, and ${total0m} 0m reminders.`
    });
  } catch (error) {
    logError('CRON_WEBINAR_REMINDERS', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
