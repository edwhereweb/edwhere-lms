'use client';

import { useState } from 'react';
import axios from 'axios';
import { Phone, MessageCircle, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COUNTRY_CODES } from '@/lib/countries';

interface PhoneNumberPromptModalProps {
  isOpen: boolean;
  userName?: string;
}

export function PhoneNumberPromptModal({ isOpen, userName }: PhoneNumberPromptModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(isOpen);
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not open, don't render
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
      toast.error('Please enter a valid phone number (7-15 digits)');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/profile/phone', {
        countryCode,
        phone: cleanPhone
      });

      toast.success('Phone number saved successfully!');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to update phone number. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <MessageCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {userName ? `Welcome, ${userName}!` : 'Welcome to Edwhere!'}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Please enter your WhatsApp number to receive essential course updates, live session
            links, and study resources.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="user-phone-input" className="text-sm font-medium">
              WhatsApp Number <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <select
                id="country-code-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-10 text-sm border border-input rounded-lg px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={`${c.code}-${c.label}`} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-phone-input"
                  type="tel"
                  required
                  autoFocus
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="pl-9"
                  minLength={7}
                  maxLength={15}
                />
              </div>
            </div>
          </div>

          {/* Fallback support notice if their country code is not in the list */}
          <div className="rounded-lg border border-border/80 bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              Don&apos;t see your country code?
            </div>
            <p>
              Please{' '}
              <a
                href="https://wa.me/918138031614?text=Hi%2C%20my%20country%20code%20is%20not%20in%20the%20list%20on%20Edwhere.%20Please%20help%20me%20update%20my%20phone%20number."
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                WhatsApp us on +91 81380 31614
              </a>{' '}
              and our support team will update your account.
            </p>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isSubmitting || !phone}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Save & Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
