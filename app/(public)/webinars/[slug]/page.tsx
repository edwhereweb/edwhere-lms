import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, Clock, CheckCircle2, Award, Users, Video, Link as LinkIcon } from 'lucide-react';
import { WebinarRegistrationForm } from './_components/webinar-registration-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

const getWebinar = cache(async (slug: string) => {
  return db.webinar.findUnique({
    where: { slug },
    include: { _count: { select: { registrations: true } } }
  });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const webinar = await getWebinar(params.slug);
  if (!webinar) return { title: 'Webinar Not Found' };
  return {
    title: webinar.metaTitle ?? `${webinar.title} | Edwhere Webinar`,
    description:
      webinar.metaDescription ??
      `Join our free live webinar: ${webinar.title}. Register now and get the link via WhatsApp.`,
    openGraph: {
      title: webinar.metaTitle ?? webinar.title,
      description: webinar.metaDescription ?? '',
      images: webinar.bannerUrl ? [{ url: webinar.bannerUrl }] : []
    }
  };
}

const WebinarDetailPage = async ({ params }: Props) => {
  const webinar = await getWebinar(params.slug);

  if (!webinar || !webinar.isPublished) return notFound();

  const now = new Date();
  const isPast = webinar.scheduledAt < now;

  return (
    <div className="pb-24">
      {/* Full-width Banner (1920×1080 aspect ratio enforced) */}
      <div className="relative w-full aspect-video max-h-[540px] bg-slate-900 overflow-hidden">
        {webinar.bannerUrl ? (
          <Image
            src={webinar.bannerUrl}
            alt={webinar.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
            <Video className="w-20 h-20 text-slate-600" />
          </div>
        )}
        {/* Dark overlay gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-5xl mx-auto">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm">
              {isPast ? (
                'Concluded'
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                  Upcoming Webinar
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-lg">
              {webinar.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(webinar.scheduledAt, 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {format(webinar.scheduledAt, 'h:mm a')} · {webinar.durationMinutes} minutes
              </span>
              {webinar._count.registrations > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {webinar._count.registrations.toLocaleString()} registered
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left — main content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            {webinar.description && (
              <section>
                <h2 className="text-xl font-bold mb-3">About This Webinar</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {webinar.description}
                </p>
              </section>
            )}

            {/* Key Takeaways */}
            {webinar.takeaways.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">What You Will Learn</h2>
                <ul className="space-y-2.5">
                  {webinar.takeaways.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Presenter */}
            {webinar.presenterName && (
              <section>
                <h2 className="text-xl font-bold mb-4">About the Presenter</h2>
                <div className="flex items-start gap-5 bg-card border border-border rounded-2xl p-5">
                  {webinar.presenterPhotoUrl ? (
                    <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 border-border">
          <Image
            src={webinar.presenterPhotoUrl}
            alt={webinar.presenterName}
            fill
            className="object-cover"
            sizes="80px"
          />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-2xl font-black text-slate-400">
                        {webinar.presenterName[0]}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="font-bold text-base">{webinar.presenterName}</p>
                      {webinar.presenterCredentials.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {webinar.presenterCredentials.map((cred) => (
                            <span
                              key={cred}
                              className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full"
                            >
                              <Award className="w-3 h-3" />
                              {cred}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {webinar.presenterBio && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {webinar.presenterBio}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Meet link — shown only if past and link is available */}
            {isPast && webinar.meetLink && (
              <section>
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                  <LinkIcon className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      Session Recording / Link
                    </p>
                    <a
                      href={webinar.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 underline break-all"
                    >
                      {webinar.meetLink}
                    </a>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right — registration sticky card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <WebinarRegistrationForm webinarId={webinar.id} isPast={isPast} />

              {/* Date reminder card below form */}
              {!isPast && (
                <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Session Details
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {format(webinar.scheduledAt, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {format(webinar.scheduledAt, 'h:mm a')} ({webinar.durationMinutes} min)
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Video className="w-4 h-4" />
                      Online — link sent via WhatsApp
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebinarDetailPage;
