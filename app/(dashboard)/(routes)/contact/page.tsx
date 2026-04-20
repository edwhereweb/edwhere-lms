'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Phone, MapPin, MessageCircle, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { PublicNavbar } from '@/components/public-navbar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/* ─── Design tokens ─── */
const RED = '#F80602';

/* ─── Shared nav data ─── */

/* ─── Form schema ─── */
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Enter a valid phone number').max(20),
  email: z.string().email('Enter a valid email address'),
  message: z.string().min(10, 'Please describe your query in at least 10 characters')
});
type FormValues = z.infer<typeof formSchema>;

const PHONE_DISPLAY = '+91 81380 41614';
const PHONE_RAW = '+918138041614';
const WA_LINK = `https://wa.me/${PHONE_RAW}`;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', phone: '', email: '', message: '' }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/contact', values);
      setSubmitted(true);
      toast.success("Your enquiry has been received! We'll reach out soon.");
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar (identical to homepage) ── */}
      <PublicNavbar supportsDarkTheme />

      {/* ── Page hero ── */}
      <section className="bg-[#111111] text-white py-14 px-4 text-center">
        <p className="font-inter text-[#F80602] text-xs font-semibold uppercase tracking-[0.2em] mb-3">
          Get in Touch
        </p>
        <h1 className="font-poppins text-4xl md:text-5xl font-normal tracking-wide">Contact Us</h1>
        <p className="font-poppins text-lg text-white/70 mt-4 max-w-xl mx-auto leading-[2em]">
          Have a question about our courses or want to know more? We&apos;d love to hear from you.
        </p>
      </section>

      {/* ── Content grid ── */}
      <section className="max-w-[1140px] mx-auto px-6 py-16 grid md:grid-cols-5 gap-10">
        {/* Left: contact info cards */}
        <div className="md:col-span-2 flex flex-col gap-5">
          {/* Call card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: `${RED}1A` }}
              >
                <Phone className="h-5 w-5" style={{ color: RED }} />
              </div>
              <h2 className="font-opensans font-semibold text-zinc-900 dark:text-zinc-100">
                Call Us
              </h2>
            </div>
            <p className="mb-3 font-inter text-sm text-zinc-500 dark:text-zinc-400">
              Available Mon–Sat, 9 AM – 6 PM IST
            </p>
            <a
              href={`tel:${PHONE_RAW}`}
              className="font-poppins font-semibold text-lg flex items-center gap-2 hover:text-[#F80602] transition-colors"
            >
              <Phone className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
          </div>

          {/* WhatsApp card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: `${RED}1A` }}
              >
                <MessageCircle className="h-5 w-5" style={{ color: RED }} />
              </div>
              <h2 className="font-opensans font-semibold text-zinc-900 dark:text-zinc-100">
                WhatsApp
              </h2>
            </div>
            <p className="mb-4 font-inter text-sm text-zinc-500 dark:text-zinc-400">
              Message us directly on WhatsApp
            </p>
            <Link
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#171717] hover:bg-[#F80602] text-white font-opensans font-semibold text-sm rounded-xl transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </Link>
          </div>

          {/* Address card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: `${RED}1A` }}
              >
                <MapPin className="h-5 w-5" style={{ color: RED }} />
              </div>
              <h2 className="font-opensans font-semibold text-zinc-900 dark:text-zinc-100">
                Visit Us
              </h2>
            </div>
            <address className="font-inter text-sm leading-7 text-zinc-600 not-italic dark:text-zinc-300">
              <span className="block font-semibold text-zinc-900 dark:text-zinc-100">CTRDI</span>
              Cybersecurity Trainings Research &amp; Development Institute
              <br />
              Phoger Edwhere Learning LLP
              <br />
              Grandeland Building, 4th Floor
              <br />
              Metro Pillar No. 47, Aluva
              <br />
              Kochi, Kerala, India – 683101
            </address>
            <Link
              href="https://maps.google.com/?q=Grandeland+Building+Aluva+Kochi+Kerala"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-inter hover:underline"
              style={{ color: RED }}
            >
              <MapPin className="h-3 w-3" />
              Open in Maps
            </Link>
          </div>
        </div>

        {/* Right: Enquiry form */}
        <div className="md:col-span-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center"
                  style={{ background: `${RED}1A` }}
                >
                  <CheckCircle2 className="h-8 w-8" style={{ color: RED }} />
                </div>
                <h2 className="font-poppins text-2xl">Message Received!</h2>
                <p className="max-w-sm font-inter leading-7 text-zinc-500 dark:text-zinc-400">
                  Thank you for reaching out. Our team will get back to you shortly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    form.reset();
                  }}
                  className="mt-2 border-2 border-[#171717] px-6 py-2.5 font-opensans text-sm font-semibold uppercase tracking-[0.15em] text-[#171717] transition-all hover:border-[#F80602] hover:bg-[#F80602] hover:text-white dark:border-zinc-100 dark:text-zinc-100"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-poppins text-2xl mb-1">Send Us a Message</h2>
                <p className="mb-6 font-inter text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                  Fill in your details and we&apos;ll get back to you as soon as possible.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-inter text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              Full Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                className="font-inter rounded-none border-gray-200 bg-white focus-visible:ring-[#F80602] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-inter text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+91 98765 43210"
                                className="font-inter rounded-none border-gray-200 bg-white focus-visible:ring-[#F80602] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-inter text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              className="font-inter rounded-none border-gray-200 bg-white focus-visible:ring-[#F80602] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-inter text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Your Query
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us what you'd like to know about our courses, pricing, schedule, etc."
                              rows={5}
                              className="font-inter resize-none rounded-none border-gray-200 bg-white focus-visible:ring-[#F80602] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#171717] bg-[#171717] px-7 py-3 font-opensans text-sm font-semibold uppercase tracking-[0.21em] text-white transition-all hover:border-[#F80602] hover:bg-[#F80602] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:border-[#F80602] dark:hover:bg-[#F80602] dark:hover:text-white"
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </Form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer (identical to homepage) ── */}
      <footer className="border-t border-zinc-200 bg-[#F7F7F7] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-inter font-medium text-zinc-800 dark:text-zinc-200">
              <span>Edwhere Learning &copy; {new Date().getFullYear()}</span>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <Link href="#" className="transition-colors hover:text-[#F80602]">
                Privacy policy
              </Link>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <Link href="#" className="transition-colors hover:text-[#F80602]">
                Terms of use
              </Link>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <Link href="/contact" className="transition-colors hover:text-[#F80602]">
                Contact us
              </Link>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <Link href="#" className="transition-colors hover:text-[#F80602]">
                Refund policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
