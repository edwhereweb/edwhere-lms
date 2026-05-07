'use client';

import { useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CertificateData {
  credentialId: string;
  recipientName: string;
  courseName: string;
  duration: string;
  deliveryMode: string;
  dateOfAchievement: string;
  createdAt: string;
}

export default function VerifyCertificatePage() {
  const [credentialId, setCredentialId] = useState('');
  const [dateOfAchievement, setDateOfAchievement] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialId.trim() || !dateOfAchievement) {
      setError('Please provide both Credential ID and Date of Achievement.');
      return;
    }
    setLoading(true);
    setError('');
    setCertificate(null);
    try {
      const { data } = await axios.post('/api/certificates/verify', {
        credentialId: credentialId.trim(),
        dateOfAchievement
      });
      setCertificate(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError(
          'We could not find a certificate matching these details. Please check the Credential ID and date and try again.'
        );
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16">
        {!certificate ? (
          /* ── Verification Form ──────────────────────── */
          <div className="max-w-lg mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1F1F1F] mb-2">
                Certificate Verification
              </h1>
              <p className="text-[#ACB3C2] text-sm">
                Enter the details below to confirm the authenticity of an Edwhere credential.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 sm:p-8">
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="credentialId" className="text-[#1F1F1F] font-medium text-sm">
                    Credential ID
                  </Label>
                  <Input
                    id="credentialId"
                    placeholder="e.g. CERT-230515-A1B2C"
                    className="h-11 border-[#E5E5E5] text-[#1F1F1F] placeholder:text-[#ACB3C2] focus-visible:ring-[#F80602] focus-visible:border-[#F80602]"
                    value={credentialId}
                    onChange={(e) => {
                      setCredentialId(e.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dateOfAchievement" className="text-[#1F1F1F] font-medium text-sm">
                    Date of Achievement
                  </Label>
                  <Input
                    id="dateOfAchievement"
                    type="date"
                    className="h-11 border-[#E5E5E5] text-[#1F1F1F] focus-visible:ring-[#F80602] focus-visible:border-[#F80602] block w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={dateOfAchievement}
                    onChange={(e) => {
                      setDateOfAchievement(e.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-100 text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-sm leading-relaxed">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#F80602] hover:bg-[#d40000] text-white font-semibold transition-colors mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    'Verify Certificate'
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* ── Verified Result ────────────────────────── */
          <div className="max-w-xl mx-auto">
            {/* Status banner */}
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-4 mb-6">
              <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold text-sm">Certificate Verified</p>
                <p className="text-xs text-green-700 mt-0.5">
                  This credential was officially issued by Edwhere.
                </p>
              </div>
            </div>

            {/* Certificate detail card */}
            <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              {/* Card top bar */}
              <div className="bg-[#F80602] h-1.5 w-full" />

              <div className="p-6 sm:p-8 space-y-6">
                {/* Recipient */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ACB3C2] mb-1">
                    This certifies that
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#1F1F1F]">
                    {certificate.recipientName}
                  </p>
                </div>

                <div className="h-px bg-[#E5E5E5]" />

                {/* Course */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ACB3C2] mb-1">
                    has successfully completed
                  </p>
                  <p className="text-lg font-semibold text-[#F80602]">{certificate.courseName}</p>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ACB3C2] mb-1">
                      Duration
                    </p>
                    <p className="text-sm font-medium text-[#1F1F1F]">{certificate.duration}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ACB3C2] mb-1">
                      Mode
                    </p>
                    <p className="text-sm font-medium text-[#1F1F1F] capitalize">
                      {certificate.deliveryMode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ACB3C2] mb-1">
                      Date Achieved
                    </p>
                    <p className="text-sm font-medium text-[#1F1F1F]">
                      {certificate.dateOfAchievement}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#E5E5E5]" />

                {/* Credential ID & issuer */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ACB3C2] mb-1">
                      Credential ID
                    </p>
                    <code className="text-sm font-mono text-[#1F1F1F]">
                      {certificate.credentialId}
                    </code>
                  </div>
                  <Image
                    src="/edwhere-logo.png"
                    alt="Edwhere"
                    width={40}
                    height={40}
                    className="rounded opacity-80"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCertificate(null);
                setCredentialId('');
                setDateOfAchievement('');
              }}
              className="mt-5 w-full text-sm text-[#ACB3C2] hover:text-[#F80602] transition-colors py-2"
            >
              ← Verify another certificate
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-white py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4 flex-wrap text-xs text-[#ACB3C2]">
          <div className="flex items-center gap-2">
            <Image
              src="/edwhere-logo.png"
              alt="Edwhere"
              width={20}
              height={20}
              className="rounded opacity-70"
            />
            <span>© {new Date().getFullYear()} Edwhere. All rights reserved.</span>
          </div>
          <Link href="/" className="hover:text-[#F80602] transition-colors">
            Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
