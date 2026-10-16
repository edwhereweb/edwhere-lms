'use client';

import { useState } from 'react';
import axios from 'axios';
import { Pencil, Phone, MessageCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { type Profile } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COUNTRY_CODES } from '@/lib/countries';

interface PhoneNumberFormProps {
  initialData: Profile;
  id: string;
  isAdmin: boolean;
}

export const PhoneNumberForm = ({ initialData, id, isAdmin }: PhoneNumberFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Parse existing number if it starts with one of our country codes
  const existingPhone = initialData.phoneNumber ?? '';
  let initialCountry = '+91';
  let initialDigits = existingPhone.replace(/^\+/, '');

  for (const c of COUNTRY_CODES) {
    if (existingPhone.startsWith(c.code)) {
      initialCountry = c.code;
      initialDigits = existingPhone.slice(c.code.length);
      break;
    }
  }

  const [countryCode, setCountryCode] = useState(initialCountry);
  const [phone, setPhone] = useState(initialDigits);

  const toggleEdit = () => {
    setIsEditing((current) => !current);
    setCountryCode(initialCountry);
    setPhone(initialDigits);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
      toast.error('Please enter a valid phone number (7-15 digits)');
      return;
    }

    const fullPhone = `${countryCode}${cleanPhone}`;

    setIsSubmitting(true);
    try {
      await axios.patch(`/api/profile/${id}`, { phoneNumber: fullPhone });
      toast.success('Phone number updated');
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error('Failed to update phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onClear = async () => {
    setIsSubmitting(true);
    try {
      await axios.patch(`/api/profile/${id}`, { phoneNumber: null });
      toast.success('Phone number removed');
      setPhone('');
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error('Failed to remove phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-emerald-600" />
          <span>User Phone Number</span>
        </div>
        {isAdmin && (
          <Button onClick={toggleEdit} variant="ghost" size="sm">
            {isEditing ? (
              <>Cancel</>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Edit phone
              </>
            )}
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="mt-3 text-sm">
          {initialData.phoneNumber ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold text-foreground">
                {initialData.phoneNumber}
              </span>
              <a
                href={`https://wa.me/${initialData.phoneNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 ml-2"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Open WhatsApp
              </a>
            </div>
          ) : (
            <span className="text-slate-500 italic">No phone number provided</span>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-10 text-sm border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={`${c.code}-${c.label}`} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="flex-1"
              minLength={7}
              maxLength={15}
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting || !phone}>
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Save
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={toggleEdit}>
                Cancel
              </Button>
            </div>
            {initialData.phoneNumber && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-destructive hover:text-destructive text-xs"
                disabled={isSubmitting}
              >
                Remove number
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
