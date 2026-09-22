import type { Metadata } from 'next';
import { db } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, Clock, Users, ChevronRight, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Webinars | Edwhere Learning',
  description:
    'Join our live webinars hosted by industry experts. Learn, ask questions, and level up your skills — completely free.'
};

const WebinarsPage = async () => {
  const webinars = await db.webinar.findMany({
    where: { isPublished: true },
    include: { _count: { select: { registrations: true } } },
    orderBy: { scheduledAt: 'asc' }
  });

  const now = new Date();
  const upcoming = webinars.filter((w) => w.scheduledAt >= now);
  const previous = webinars.filter((w) => w.scheduledAt < now);

  return (
    <div className="pb-24">
      {/* Hero */}
      <div className="bg-slate-900 py-20 px-6 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.15),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Live Webinars
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            Learn From{' '}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Industry Experts
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Free live sessions. Real questions. Deep expertise. Register now and get the link
            delivered straight to your WhatsApp.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 space-y-16">
        {/* Upcoming */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-7 bg-red-500 rounded-full" />
            <h2 className="text-2xl font-bold">Upcoming Webinars</h2>
            {upcoming.length > 0 && (
              <span className="ml-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
                {upcoming.length} upcoming
              </span>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-3xl text-muted-foreground">
              <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No upcoming webinars scheduled yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((w) => (
                <WebinarCard key={w.id} webinar={w} variant="upcoming" />
              ))}
            </div>
          )}
        </section>

        {/* Previous */}
        {previous.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-7 bg-slate-400 rounded-full" />
              <h2 className="text-2xl font-bold text-muted-foreground">Previous Webinars</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
              {previous.map((w) => (
                <WebinarCard key={w.id} webinar={w} variant="past" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// ── Webinar Card ──────────────────────────────────────────────────────────────

interface WebinarCardProps {
  webinar: {
    id: string;
    title: string;
    slug: string;
    bannerUrl: string | null;
    scheduledAt: Date;
    durationMinutes: number;
    presenterName: string | null;
    _count: { registrations: number };
  };
  variant: 'upcoming' | 'past';
}

function WebinarCard({ webinar, variant }: WebinarCardProps) {
  const isUpcoming = variant === 'upcoming';

  return (
    <Link
      href={`/webinars/${webinar.slug}`}
      className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-border/80 transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Banner */}
      <div className="relative aspect-video bg-slate-800 overflow-hidden">
        {webinar.bannerUrl ? (
          <Image
            src={webinar.bannerUrl}
            alt={webinar.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <Video className="w-12 h-12 text-slate-500" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          {isUpcoming ? (
            <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Upcoming
            </span>
          ) : (
            <span className="bg-slate-700/80 backdrop-blur text-slate-300 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">
              Concluded
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-red-500 transition-colors">
          {webinar.title}
        </h3>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(webinar.scheduledAt, 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {format(webinar.scheduledAt, 'h:mm a')} · {webinar.durationMinutes}m
          </span>
          {webinar._count.registrations > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {webinar._count.registrations.toLocaleString()} registered
            </span>
          )}
        </div>

        {webinar.presenterName && (
          <p className="text-xs text-muted-foreground">
            By <span className="font-semibold text-foreground">{webinar.presenterName}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-2 mt-auto">
          <span
            className={`text-xs font-semibold ${isUpcoming ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            {isUpcoming ? 'Register Free →' : 'View Details →'}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default WebinarsPage;
