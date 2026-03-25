import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Users, Tag, ChevronRight } from 'lucide-react';

import { db } from '@/lib/db';
import { formatPrice, stripHtml } from '@/lib/format';

// ── Helpers ─────────────────────────────────────────────────────────────

async function getCourseBySlug(slug: string) {
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
}

// ── Metadata ────────────────────────────────────────────────────────────

export async function generateMetadata({
  params
}: {
  params: { courseId: string };
}): Promise<Metadata> {
  const course = await getCourseBySlug(params.courseId);
  if (!course || !(course as unknown as { isWebVisible: boolean }).isWebVisible) return {};

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.edwhere.com';
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
  const course = await getCourseBySlug(params.courseId);
  if (!course || !(course as unknown as { isWebVisible: boolean }).isWebVisible) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.edwhere.com';
  const totalChapters =
    course.chapters.length + course.modules.reduce((sum, m) => sum + m.chapters.length, 0);

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
              <div className="flex items-center gap-4">
                <Link
                  href={`/courses/${course.id}/start`}
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#6715FF] text-white font-opensans font-semibold text-base rounded-xl transition-all hover:bg-[#5210CC] hover:shadow-lg hover:shadow-purple-500/20"
                >
                  Enroll Now
                  {course.price ? ` — ${formatPrice(course.price)}` : ' — Free'}
                </Link>
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

      {/* Course Curriculum */}
      <section className="bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <h2 className="font-poppins text-2xl font-semibold text-gray-900 mb-8">
            Course Curriculum
          </h2>

          <div className="space-y-3">
            {/* Standalone chapters */}
            {course.chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-8">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-inter text-sm font-medium text-gray-800">
                    {chapter.title}
                  </span>
                </div>
                {chapter.isFree && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Free
                  </span>
                )}
              </div>
            ))}

            {/* Modules with chapters */}
            {course.modules.map((mod) => (
              <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-4 py-3">
                  <h3 className="font-inter text-sm font-semibold text-gray-800">{mod.title}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {mod.chapters.map((chapter, index) => (
                    <div key={chapter.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-400 w-8">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-inter text-sm text-gray-700">{chapter.title}</span>
                      </div>
                      {chapter.isFree && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Free
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {totalChapters === 0 && (
              <p className="text-center text-gray-400 font-inter py-8">Curriculum coming soon</p>
            )}
          </div>
        </div>
      </section>

      {/* Instructors */}
      {course.instructors.length > 0 && (
        <section className="bg-gray-50">
          <div className="max-w-[1200px] mx-auto px-6 py-16">
            <h2 className="font-poppins text-2xl font-semibold text-gray-900 mb-8">
              Your Instructors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {course.instructors.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden shrink-0">
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
                    <p className="font-inter font-semibold text-gray-900">{inst.profile.name}</p>
                    <p className="text-xs text-gray-500 font-inter">Instructor</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-16 text-center">
          <h2 className="font-poppins text-3xl font-semibold mb-4">Ready to get started?</h2>
          <p className="font-inter text-gray-400 mb-8 max-w-lg mx-auto">
            Enroll now and start learning with hands-on, expert-led training.
          </p>
          <Link
            href={`/courses/${course.id}/start`}
            className="inline-flex items-center justify-center px-10 py-4 bg-[#6715FF] text-white font-opensans font-semibold text-lg rounded-xl transition-all hover:bg-[#5210CC] hover:shadow-lg hover:shadow-purple-500/20"
          >
            Enroll Now
            {course.price ? ` — ${formatPrice(course.price)}` : ' — Free'}
          </Link>
        </div>
      </section>
    </>
  );
}
