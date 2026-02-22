'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
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
const RED = '#EC4130';
const DARK = '#171717';

/* ─── Shared nav data ─── */
const NAV_LINKS = [
  { label: 'Courses', href: '/search' },
  { label: 'About Us', href: 'https://edwhere.com/about-us/' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Webinars', href: '#' }
];

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
      await axios.post('/api/contact', values);
      setSubmitted(true);
      toast.success("Your enquiry has been received! We'll reach out soon.");
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ── Navbar (identical to homepage) ── */}
      <PublicNavbar />

      {/* ── Page hero ── */}
      <section className="bg-[#111111] text-white py-14 px-4 text-center">
        <p className="font-inter text-[#EC4130] text-xs font-semibold uppercase tracking-[0.2em] mb-3">
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
          <div className="border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: `${RED}1A` }}
              >
                <Phone className="h-5 w-5" style={{ color: RED }} />
              </div>
              <h2 className="font-opensans font-semibold text-[#1F1F1F]">Call Us</h2>
            </div>
            <p className="font-inter text-sm text-[#888888] mb-3">
              Available Mon–Sat, 9 AM – 6 PM IST
            </p>
            <a
              href={`tel:${PHONE_RAW}`}
              className="font-poppins font-semibold text-lg flex items-center gap-2 hover:text-[#EC4130] transition-colors"
            >
              <Phone className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
          </div>

          {/* WhatsApp card */}
          <div className="border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="font-opensans font-semibold text-[#1F1F1F]">WhatsApp</h2>
            </div>
            <p className="font-inter text-sm text-[#888888] mb-4">
              Message us directly on WhatsApp
            </p>
            <Link
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-opensans font-semibold text-sm rounded-xl transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </Link>
          </div>

          {/* Address card */}
          <div className="border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: `${RED}1A` }}
              >
                <MapPin className="h-5 w-5" style={{ color: RED }} />
              </div>
              <h2 className="font-opensans font-semibold text-[#1F1F1F]">Visit Us</h2>
            </div>
            <address className="font-inter text-sm text-[#555] not-italic leading-7">
              <span className="font-semibold text-[#1F1F1F] block">CTRDI</span>
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
          <div className="border border-gray-100 rounded-2xl shadow-sm p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="font-poppins text-2xl">Message Received!</h2>
                <p className="font-inter text-[#888888] max-w-sm leading-7">
                  Thank you for reaching out. Our team will get back to you shortly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    form.reset();
                  }}
                  className="mt-2 px-6 py-2.5 border-2 border-[#171717] text-[#171717] font-opensans font-semibold text-sm uppercase tracking-[0.15em] transition-all hover:bg-[#EC4130] hover:border-[#EC4130] hover:text-white"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-poppins text-2xl mb-1">Send Us a Message</h2>
                <p className="font-inter text-sm text-[#888888] mb-6 leading-7">
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
                            <FormLabel className="font-inter text-xs font-semibold text-[#888] uppercase tracking-wider">
                              Full Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                className="font-inter rounded-none border-gray-200 focus-visible:ring-[#EC4130]"
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
                            <FormLabel className="font-inter text-xs font-semibold text-[#888] uppercase tracking-wider">
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+91 98765 43210"
                                className="font-inter rounded-none border-gray-200 focus-visible:ring-[#EC4130]"
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
                          <FormLabel className="font-inter text-xs font-semibold text-[#888] uppercase tracking-wider">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              className="font-inter rounded-none border-gray-200 focus-visible:ring-[#EC4130]"
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
                          <FormLabel className="font-inter text-xs font-semibold text-[#888] uppercase tracking-wider">
                            Your Query
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us what you'd like to know about our courses, pricing, schedule, etc."
                              rows={5}
                              className="font-inter rounded-none border-gray-200 focus-visible:ring-[#EC4130] resize-none"
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
                      className="w-full inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#171717] text-white font-opensans font-semibold text-sm uppercase tracking-[0.21em] border-2 border-[#171717] transition-all hover:bg-[#EC4130] hover:border-[#EC4130] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
              <Link href="/contact" className="transition-colors hover:text-[#EC4130]">
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
