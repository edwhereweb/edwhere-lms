import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { BookOpen, Users, Tag, ChevronRight, ShieldCheck, Award } from 'lucide-react';

import { db } from '@/lib/db';
import { stripHtml } from '@/lib/format';
import { CourseBuyCta } from './_components/course-buy-cta';
import { CourseViewTracker } from './_components/course-view-tracker';

// ── Helpers ─────────────────────────────────────────────────────────────

const getCourseBySlug = cache(async function getCourseBySlug(slug: string) {
  // Try slug first, then fallback to ObjectId
  let course = await db.course.findFirst({
    where: { slug, isPublished: true },
    include: {
      category: true,
      chapters: {
        where: { isPublished: true, moduleId: null },
        select: { id: true, title: true, isFree: true, position: true },
        orderBy: { position: 'asc' }
      },
      modules: {
        orderBy: { position: 'asc' },
        include: {
          chapters: {
            where: { isPublished: true },
            select: { id: true, title: true, isFree: true, position: true },
            orderBy: { position: 'asc' }
          }
        }
      },
      instructors: {
        include: {
          profile: { select: { name: true, imageUrl: true } }
        }
      }
    }
  });

  if (!course) {
    course = await db.course.findFirst({
      where: { id: slug, isPublished: true },
      include: {
        category: true,
        chapters: {
          where: { isPublished: true, moduleId: null },
          select: { id: true, title: true, isFree: true, position: true },
          orderBy: { position: 'asc' }
        },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            chapters: {
              where: { isPublished: true },
              select: { id: true, title: true, isFree: true, position: true },
              orderBy: { position: 'asc' }
            }
          }
        },
        instructors: {
          include: {
            profile: { select: { name: true, imageUrl: true } }
          }
        }
      }
    });
  }

  return course;
});

// ── Metadata ────────────────────────────────────────────────────────────

export async function generateMetadata({
  params
}: {
  params: { courseId: string };
}): Promise<Metadata> {
  const course = await getCourseBySlug(params.courseId);
  if (!course || !(course as unknown as { isWebVisible: boolean }).isWebVisible) return {};

  const pageTitle = course.metaTitle || course.title;
  const pageDescription =
    course.metaDescription || course.description || 'Learn with Edwhere Education';

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: `${pageTitle} | Edwhere Education`,
      description: pageDescription,
      type: 'website',
      images: course.imageUrl
        ? [
            {
              url: course.imageUrl,
              width: 1200,
              height: 630,
              alt: (course as { imageAlt?: string | null }).imageAlt || course.title
            }
          ]
        : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | Edwhere Education`,
      description: pageDescription,
      images: course.imageUrl ? [course.imageUrl] : undefined
    }
  };
}

// ── Page Component ──────────────────────────────────────────────────────

export default async function PublicCourseDetailPage({ params }: { params: { courseId: string } }) {
  const { userId } = await auth();
  const course = await getCourseBySlug(params.courseId);
  if (!course || !(course as unknown as { isWebVisible: boolean }).isWebVisible) notFound();
  const purchase = userId
    ? await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id
          }
        }
      })
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.edwhere.com';
  const totalChapters =
    course.chapters.length + course.modules.reduce((sum, m) => sum + m.chapters.length, 0);
  const isEnrolled = Boolean(purchase);

  const instructorNames = course.instructors.map((i) => i.profile.name);

  // ── JSON-LD Course Schema ──
  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.metaTitle || course.title,
    description: course.metaDescription || course.description || '',
    provider: {
      '@type': 'Organization',
      name: 'Edwhere Education',
      url: 'https://edwhere.com'
    },
    ...(course.imageUrl && { image: course.imageUrl }),
    ...(course.price != null && {
      offers: {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/courses/${course.slug || course.id}`
      }
    }),
    ...(instructorNames.length > 0 && {
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'Online',
        instructor: instructorNames.map((name) => ({
          '@type': 'Person',
          name
        }))
      }
    }),
    ...(course.category && {
      about: {
        '@type': 'Thing',
        name: course.category.name
      }
    })
  };

  return (
    <>
      <CourseViewTracker
        courseId={course.id}
        title={course.title}
        category={course.category?.name}
        amount={course.price}
      />
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-20">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            {/* Left: Info */}
            <div className="flex-1 order-2 md:order-1">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-sm text-gray-400 mb-6">
                <Link href="/courses" className="hover:text-white transition-colors">
                  Courses
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                {course.category && (
                  <>
                    <Link
                      href={`/courses?categoryId=${course.category.id}`}
                      className="hover:text-white transition-colors"
                    >
                      {course.category.name}
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
                <span className="text-gray-300 truncate max-w-[200px]">{course.title}</span>
              </nav>

              {course.category && (
                <span className="inline-block bg-[#6715FF] text-white text-xs font-semibold font-inter px-3 py-1 rounded-full mb-4">
                  {course.category.name}
                </span>
              )}

              <h1 className="font-poppins text-3xl md:text-4xl font-bold leading-tight mb-4">
                {course.title}
              </h1>

              {course.description && (
                <p className="font-inter text-base md:text-lg text-gray-300 leading-relaxed mb-6 max-w-2xl">
                  {stripHtml(course.description)}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-8">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {totalChapters} {totalChapters === 1 ? 'Chapter' : 'Chapters'}
                  </span>
                </div>
                {instructorNames.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{instructorNames.join(', ')}</span>
                  </div>
                )}
                {course.category && (
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    <span>{course.category.name}</span>
                  </div>
                )}
              </div>

              {/* Price + CTA */}
              <div className="flex flex-col items-start gap-3">
                <CourseBuyCta
                  courseId={course.id}
                  amount={course.price}
                  isAuthenticated={Boolean(userId)}
                  isEnrolled={isEnrolled}
                />
                <div className="text-sm text-gray-300 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Secure payment
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-4 w-4" /> Trusted instructors
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="w-full md:w-[45%] order-1 md:order-2 shrink-0">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
                <Image
                  src={course.imageUrl || '/images/course-placeholder.png'}
                  alt={(course as { imageAlt?: string | null }).imageAlt || course.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background border-b">
        <div className="max-w-[1200px] mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <p className="font-semibold text-foreground mb-1">Outcome-driven learning</p>
            <p className="text-sm text-muted-foreground">
              Build practical skills through guided modules and chapter milestones.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-semibold text-foreground mb-1">Trusted instruction</p>
            <p className="text-sm text-muted-foreground">
              Learn from experienced instructors with real-world domain expertise.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-semibold text-foreground mb-1">Secure and supported</p>
            <p className="text-sm text-muted-foreground">
              Secure payment checkout with support for purchase or refund assistance.
            </p>
          </div>
        </div>
      </section>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur p-4">
        <CourseBuyCta
          courseId={course.id}
          amount={course.price}
          isAuthenticated={Boolean(userId)}
          isEnrolled={isEnrolled}
        />
      </div>

      {/* Course Curriculum */}
      <section className="bg-background">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <h2 className="font-poppins text-2xl font-semibold text-foreground mb-8">
            Course Curriculum
          </h2>

          <div className="space-y-3">
            {/* Standalone chapters */}
            {course.chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted-foreground w-8">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-inter text-sm font-medium text-foreground">
                    {chapter.title}
                  </span>
                </div>
                {chapter.isFree && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded">
                    Free
                  </span>
                )}
              </div>
            ))}

            {/* Modules with chapters */}
            {course.modules.map((mod) => (
              <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted px-4 py-3">
                  <h3 className="font-inter text-sm font-semibold text-foreground">{mod.title}</h3>
                </div>
                <div className="divide-y divide-border">
                  {mod.chapters.map((chapter, index) => (
                    <div key={chapter.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-muted-foreground w-8">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-inter text-sm text-foreground">{chapter.title}</span>
                      </div>
                      {chapter.isFree && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded">
                          Free
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {totalChapters === 0 && (
              <p className="text-center text-muted-foreground font-inter py-8">
                Curriculum coming soon
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Instructors */}
      {course.instructors.length > 0 && (
        <section className="bg-muted">
          <div className="max-w-[1200px] mx-auto px-6 py-16">
            <h2 className="font-poppins text-2xl font-semibold text-foreground mb-8">
              Your Instructors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {course.instructors.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-sm"
                >
                  <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0">
                    {inst.profile.imageUrl ? (
                      <Image
                        src={inst.profile.imageUrl}
                        alt={inst.profile.name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#6715FF] flex items-center justify-center text-white text-lg font-bold">
                        {inst.profile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-inter font-semibold text-card-foreground">
                      {inst.profile.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-inter">Instructor</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-16 text-center pb-28 md:pb-16">
          <h2 className="font-poppins text-3xl font-semibold mb-4">Ready to get started?</h2>
          <p className="font-inter text-gray-400 mb-8 max-w-lg mx-auto">
            Build practical outcomes with expert mentorship, secure checkout, and support.
          </p>
          <div className="flex justify-center">
            <CourseBuyCta
              courseId={course.id}
              amount={course.price}
              isAuthenticated={Boolean(userId)}
              isEnrolled={isEnrolled}
            />
          </div>
        </div>
      </section>
    </>
  );
}
