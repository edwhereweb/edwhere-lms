import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, Users, Zap } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();

  // Redirect signed-in users straight to the dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-slate-900/70 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-purple-400" />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">ed</span>
            <span className="text-purple-400">where</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-purple-600 hover:bg-purple-500 transition-colors duration-200 shadow-lg shadow-purple-900/40"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2 rounded-full text-sm font-semibold border border-white/20 hover:bg-white/10 transition-colors duration-200"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen text-center px-6 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium">
          <Zap className="h-4 w-4" />
          Next-gen Learning Management System
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Learn anything,{" "}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            anywhere
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl">
          edwhere is a modern LMS for teachers and students — create courses,
          track progress, and learn at your own pace.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/sign-up"
            className="px-8 py-4 rounded-full text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-200 shadow-xl shadow-purple-900/40"
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-4 rounded-full text-base font-semibold border border-white/20 hover:bg-white/10 transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: BookOpen,
            title: "Rich Course Builder",
            desc: "Create multi-chapter courses with video, attachments, and pricing — all in one place.",
          },
          {
            icon: GraduationCap,
            title: "Track Your Progress",
            desc: "Students can see exactly where they are and pick up right where they left off.",
          },
          {
            icon: Users,
            title: "Role-Based Access",
            desc: "Teachers manage their own courses; admins oversee the entire platform.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl p-6 bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors duration-200"
          >
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20">
              <Icon className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} edwhere. All rights reserved.
      </footer>
    </div>
  );
}
