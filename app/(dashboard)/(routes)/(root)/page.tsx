import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Search, Quote, Menu } from 'lucide-react';
import { StatsCounter } from './_components/stats-counter';

const STATS = [
  { value: '35K+', label: 'Students' },
  { value: '6+', label: 'Years' },
  { value: '20+', label: 'Collaborations' }
];

const COURSES = [
  {
    title: '50 days challenge course, Cybersecurity- Mal',
    description:
      '50 days challenge in CyberSecurity. First step towards a career in cybersecurity.',
    price: '₹4,499',
    image: '/images/course-cybersecurity-56586a.png'
  },
  {
    title: 'C Programming Malayalam',
    description:
      'Master the fundamentals of C programming with hands-on exercises and real-world projects.',
    price: '₹899',
    image: '/images/course-c-programming-56586a.png'
  },
  {
    title: 'Python Programming in Malayalam for Beginners',
    description: 'Learn Python from scratch. Build practical skills for an IT career.',
    price: '₹899',
    image: '/images/course-python-56586a.png'
  }
];

const TESTIMONIALS = [
  {
    name: 'Sreerekh V',
    text: "Coming from a media background with zero experience in computer science, I honestly wasn't sure if I could even get the basics right. But I wanted to explore a completely new field, Edwhere's 50-day challenge. So far, it's been an eye-opening experience. The topics are simple and easy to understand. What I really appreciate is how approachable the learning process is and no heavy jargon, just clear explanations and practical knowledge. I'm genuinely looking forward to moving on to further certification next."
  },
  {
    name: 'Raneesh',
    text: 'Python course was both easy to understand and highly interesting. I want to express my gratitude to Mr. Manu, the instructor, for providing such a fantastic course. Your engaging teaching style and clear explanations made learning enjoyable. Thank you for your guidance'
  },
  {
    name: 'Jibin John',
    text: "I attended a 5-days boot camp at the Edwhere education center and had a good experience! The sessions were well-structured, and the instructor Manu Francis sir was knowledgeable and friendly. The environment was really motivating, also with the lab and I got to learn Cyber security a lot in a short time. Highly recommended for anyone looking to upskill or dive deep into new topics! It's my personal experience! Thank you Edwhere Education Team"
  }
];

const FREE_VIDEOS = [
  {
    title: 'Cybersecurity Mythbuster',
    image: '/images/yt-mythbuster-68bfb1.png',
    href: 'https://youtu.be/tRxZs2l0fqo'
  },
  {
    title: 'Cybersecurity careers',
    image: '/images/yt-careers-68bfb1.png',
    href: 'https://youtu.be/4CR5kyl76t0'
  },
  {
    title: 'Free cybersecurity courses',
    image: '/images/yt-free-courses-68bfb1.png',
    href: 'https://youtu.be/cy2WVi_PKCQ'
  },
  {
    title: 'Cybersecurity roadmap',
    image: '/images/yt-roadmap-68bfb1.png',
    href: 'https://youtu.be/vO8HGJHgvqQ'
  }
];

const CTA_CARDS = [
  {
    text: (
      <>
        If you&apos;re a total <strong>beginner just exploring</strong> to see if it&apos;s right
        for you.
      </>
    ),
    image: '/images/cta-bootcamp-4873c6.png',
    cta: 'Enrol now',
    href: '/search'
  },
  {
    text: (
      <>
        If you&apos;re a complete <strong>beginner but serious</strong> about getting into{' '}
        <strong>cybersecurity.</strong>
      </>
    ),
    image: '/images/cta-50days-4873c6.png',
    cta: 'Enrol now',
    href: '/search'
  },
  {
    text: (
      <>
        If you&apos;re <strong>very serious</strong> and looking for cybersecurity{' '}
        <strong>certifications.</strong>
      </>
    ),
    image: '/images/cta-ceh-4873c6.png',
    cta: 'Call us +91 8138041614',
    href: 'tel:+918138041614'
  }
];

const NAV_LINKS = [
  { label: 'Courses', href: '/search' },
  { label: 'About Us', href: 'https://edwhere.com/about-us/' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Webinars', href: '#' }
];

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/edwhere-logo.png"
              alt="Edwhere"
              width={44}
              height={44}
              className="rounded"
            />
          </Link>

          <div className="hidden lg:flex items-center border border-[#E5E5E5] rounded px-3 py-2 w-72 mx-6">
            <Search className="h-4 w-4 text-[#ACB3C2] mr-2 shrink-0" />
            <span className="text-sm text-[#ACB3C2] font-inter">Search</span>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-2.5 text-sm font-medium font-inter text-[#1F1F1F] capitalize transition-colors hover:text-[#EC4130]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              className="ml-3 px-5 py-2 text-sm font-semibold font-inter text-white bg-[#171717] rounded transition-all hover:bg-[#EC4130] hover:shadow-md"
            >
              Login
            </Link>
          </nav>

          <button className="lg:hidden p-2" aria-label="Menu">
            <Menu className="h-6 w-6 text-[#1F1F1F]" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white shadow-[0_0_9px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="mx-auto pl-6 min-h-[85vh] md:min-h-[90vh] flex flex-col">
          <div className="flex flex-col md:flex-row items-stretch gap-10 md:gap-0 flex-1 pr-6">
            {/* Left: text content */}
            <div className="flex-1 w-full md:w-[60%] md:pr-10 flex flex-col items-center text-center md:text-left md:justify-center">
              <Image
                src="/images/hero-logo-56586a.png"
                alt="Edwhere Learning"
                width={86}
                height={86}
                className="rounded-2xl mb-6"
              />

              <h1 className="font-poppins text-[42px] font-normal tracking-wide text-black leading-tight">
                Edwhere Learning
              </h1>

              <p className="mt-5 font-poppins text-[21px] text-black leading-[2.2em] max-w-[780px] text-center">
                Hands-on, Accredited Training in Cybersecurity, Data analytics, IOT, AI, Programming
                and latest technologies
              </p>

              <div className="mt-5">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#171717] text-white font-poppins font-semibold text-sm uppercase tracking-[0.21em] border-2 border-[#171717] transition-all hover:bg-[#EC4130] hover:border-[#EC4130] hover:shadow-lg"
                >
                  Explore All courses
                </Link>
              </div>

              <div className="mt-14 flex items-center justify-center md:justify-start gap-10">
                <div className="flex flex-col items-center gap-4">
                  <Image
                    src="/images/accreditation-badge.png"
                    alt="Accredited"
                    width={138}
                    height={100}
                    className="object-contain"
                  />
                  <span className="font-poppins text-lg text-black leading-[2.2em]">
                    Accredited
                  </span>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <Image
                    src="/images/certification-badge-56586a.png"
                    alt="Certified"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                  <span className="font-poppins text-lg text-black leading-[2.2em]">Certified</span>
                </div>
              </div>
            </div>

            {/* Right: hero illustration — hidden on mobile, fills parent height on md+ */}
            <div className="hidden md:block md:w-[35%] relative">
              <Image
                src="/images/hero-illustration.jpg"
                alt="Edwhere illustration"
                fill
                className="object-cover object-center"
                sizes="(min-width: 768px) 40vw, 0px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why choose Edwhere? */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="font-poppins text-[21px] tracking-[0.05em] mb-3">
            Why choose <span className="font-semibold">Edwhere</span>?
          </h2>

          <StatsCounter stats={STATS} />
        </div>
      </section>

      {/* Explore Our Courses */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <h2 className="font-opensans text-4xl font-semibold text-center mb-12">
            Explore Our Courses
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COURSES.map((course) => (
              <div key={course.title} className="rounded-2xl overflow-hidden flex flex-col group">
                <Link href="/search" className="block">
                  <div className="relative h-60 overflow-hidden rounded-2xl">
                    <Image
                      src={course.image}
                      alt={course.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </Link>

                <div className="py-4 px-1 flex flex-col flex-1">
                  <h3 className="font-opensans text-lg font-semibold text-black mb-1 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="font-opensans text-base font-light text-black leading-8 mb-4 flex-1 line-clamp-2">
                    {course.description}
                  </p>
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-[#6715FF] text-white font-opensans font-semibold text-base rounded-xl transition-all self-start hover:bg-[#EC4130] hover:shadow-md"
                  >
                    Enroll for {course.price}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-auto flex justify-center shrink-0">
              <Image
                src="/images/app-screenshot-55c38c.png"
                alt="Edwhere Mobile App"
                width={240}
                height={443}
                className="rounded-2xl"
              />
            </div>

            <div className="w-full flex-1">
              <h3 className="font-poppins text-[27px] font-semibold leading-snug">
                Download Edwhere Learning&apos;s
                <br />
                app now and get amazing offers
              </h3>
              <div className="mt-5 flex flex-col gap-7">
                <p className="font-inter text-lg font-light text-white leading-relaxed">
                  Download our app now and get access to our latest courses including Free contents.
                  Download now
                </p>
                <Link href="#" className="inline-block w-fit transition-transform hover:scale-105">
                  <Image
                    src="/images/playstore-badge-56586a.png"
                    alt="Get it on Google Play"
                    width={136}
                    height={40}
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white" id="about">
        <div className="max-w-[1140px] mx-auto px-6 py-20">
          <h2 className="font-poppins text-[40px] text-center mb-20">What our students say</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial) => (
              <div key={testimonial.name} className="flex flex-col">
                <Quote className="h-6 w-6 text-[#808080] mb-4 rotate-180" />
                <p className="font-poppins text-lg text-black leading-[2em] flex-1">
                  {testimonial.text}
                </p>
                <p className="font-poppins text-sm text-[#888888] mt-6 leading-[2em]">
                  {testimonial.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Cybersecurity content */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <div className="text-center mb-4">
            <h2 className="font-poppins text-[40px] text-white mb-3">Free Cybersecurity content</h2>
            <p className="font-poppins text-[26px] italic text-white">Watch our free videos</p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FREE_VIDEOS.map((video) => (
              <div key={video.title} className="flex flex-col items-center group">
                <h4 className="font-poppins text-lg text-white text-center mb-4 h-12 flex items-center">
                  {video.title}
                </h4>
                <div className="relative w-full aspect-video overflow-hidden rounded-lg mb-4">
                  <Image
                    src={video.image}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <Link
                  href={video.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-7 py-3 bg-[#EC4130] text-white font-opensans font-semibold text-sm uppercase tracking-[0.21em] border-2 border-[#EC4130] transition-all hover:bg-white hover:text-[#EC4130] hover:shadow-md"
                >
                  Watch now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Want to learn cybersecurity? */}
      <section className="bg-white" id="contact">
        <div className="max-w-[1140px] mx-auto px-6 py-20">
          <h2 className="font-poppins text-[40px] text-center mb-20">
            Want to learn cybersecurity?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CTA_CARDS.map((card) => (
              <div key={card.cta} className="flex flex-col items-center text-center group">
                <p className="font-poppins text-lg text-black leading-[2em] mb-4">{card.text}</p>
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg mb-6">
                  <Image
                    src={card.image}
                    alt={card.cta}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <Link
                  href={card.href}
                  className="inline-flex items-center justify-center px-7 py-3 bg-[#171717] text-white font-opensans font-semibold text-sm uppercase tracking-[0.21em] border-2 border-[#171717] transition-all hover:bg-[#EC4130] hover:border-[#EC4130] hover:shadow-lg"
                >
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F7F7F7]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-inter font-medium text-[#232228]">
              <span>Edwhere Learning &copy; {new Date().getFullYear()}</span>
              <span className="text-gray-300">|</span>
              <Link href="#" className="transition-colors hover:text-[#EC4130]">
                Privacy policy
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="#" className="transition-colors hover:text-[#EC4130]">
                Terms of use
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="#" className="transition-colors hover:text-[#EC4130]">
                Contact us
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="#" className="transition-colors hover:text-[#EC4130]">
                Refund policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
