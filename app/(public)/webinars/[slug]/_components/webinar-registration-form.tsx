'use client';

import { useState } from 'react';
import { CheckCircle, Loader2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { COUNTRY_CODES } from '@/lib/countries';

interface Props {
  webinarId: string;
  isPast: boolean;
}

export function WebinarRegistrationForm({ webinarId, isPast }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  // Honeypot — intentionally left empty, hidden from real users
  const [website, setWebsite] = useState('');

  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  if (isPast) {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 border border-border rounded-2xl p-6 text-center text-muted-foreground">
        <p className="text-sm font-medium">This webinar has concluded.</p>
        <p className="text-xs mt-1">Stay tuned for upcoming sessions.</p>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="font-bold text-lg">You&apos;re registered! 🎉</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          A confirmation has been sent to your WhatsApp. The meeting link will be shared via
          WhatsApp before the session starts.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/webinars/${webinarId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, countryCode, phone, website })
      });

      if (res.status === 409) {
        toast.error("You're already registered for this webinar.");
        return;
      }

      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? 'Too many attempts. Please try again later.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setRegistered(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm"
    >
      <h3 className="font-bold text-lg">Register for Free</h3>
      <p className="text-sm text-muted-foreground -mt-1">
        No account required. Meeting link delivered via WhatsApp.
      </p>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label htmlFor="reg-name" className="text-sm font-medium">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-name"
          type="text"
          required
          minLength={2}
          maxLength={150}
          placeholder="e.g. Priya Nair"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="reg-email" className="text-sm font-medium">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-email"
          type="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Phone with country code */}
      <div className="space-y-1.5">
        <label htmlFor="reg-phone" className="text-sm font-medium">
          WhatsApp Number <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <select
            id="reg-country-code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="h-10 text-sm border border-input rounded-lg px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.label} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              id="reg-phone"
              type="tel"
              required
              minLength={7}
              maxLength={15}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full h-10 text-sm border border-input rounded-lg pl-9 pr-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Enter digits only — the meeting link will be sent here via WhatsApp.
        </p>
      </div>

      {/* Honeypot — visually hidden, must remain empty */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="reg-website">Website</label>
        <input
          id="reg-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        id="webinar-register-submit"
        disabled={loading}
        className="w-full h-11 bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Registering…
          </>
        ) : (
          <span>Register Now - Free</span>
        )}
      </button>

      <p className="text-[11px] text-center text-muted-foreground">
        By registering, you agree to receive session updates via WhatsApp.
      </p>
    </form>
  );
}
