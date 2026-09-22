'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Video,
  Save,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { RegistrationsPanel } from './_components/registrations-panel';
import Link from 'next/link';

interface Webinar {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  scheduledAt: string;
  durationMinutes: number;
  isPublished: boolean;
  meetLink: string | null;
  takeaways: string[];
  presenterName: string | null;
  presenterPhotoUrl: string | null;
  presenterBio: string | null;
  presenterCredentials: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  _count: { registrations: number };
}

// Format a UTC date string to the value expected by datetime-local input
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export default function AdminWebinarEditorPage() {
  const { webinarId } = useParams<{ webinarId: string }>();
  const router = useRouter();

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form fields (controlled)
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [meetLink, setMeetLink] = useState('');
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [newTakeaway, setNewTakeaway] = useState('');
  const [presenterName, setPresenterName] = useState('');
  const [presenterBio, setPresenterBio] = useState('');
  const [presenterCredentials, setPresenterCredentials] = useState<string[]>([]);
  const [newCredential, setNewCredential] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get<Webinar>(`/api/admin/webinars/${webinarId}`);
        setWebinar(data);
        setTitle(data.title);
        setSlug(data.slug);
        setDescription(data.description ?? '');
        setScheduledAt(toLocalInputValue(data.scheduledAt));
        setDurationMinutes(data.durationMinutes);
        setMeetLink(data.meetLink ?? '');
        setTakeaways(data.takeaways);
        setPresenterName(data.presenterName ?? '');
        setPresenterBio(data.presenterBio ?? '');
        setPresenterCredentials(data.presenterCredentials);
        setMetaTitle(data.metaTitle ?? '');
        setMetaDescription(data.metaDescription ?? '');
      } catch {
        toast.error('Failed to load webinar');
        router.push('/admin/webinars');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [webinarId, router]);

  const handleSave = async () => {
    if (!webinar) return;
    setSaving(true);
    try {
      const { data } = await axios.patch<Webinar>(`/api/admin/webinars/${webinarId}`, {
        title,
        slug,
        description: description || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        durationMinutes,
        meetLink: meetLink || null,
        takeaways,
        presenterName: presenterName || null,
        presenterBio: presenterBio || null,
        presenterCredentials,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null
      });
      setWebinar(data);
      toast.success('Webinar saved');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error('This slug is already in use by another webinar.');
      } else {
        toast.error('Failed to save webinar');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!webinar) return;
    try {
      const { data } = await axios.patch<Webinar>(`/api/admin/webinars/${webinarId}`, {
        isPublished: !webinar.isPublished
      });
      setWebinar(data);
      toast.success(data.isPublished ? 'Webinar published' : 'Webinar unpublished');
    } catch {
      toast.error('Failed to update publish status');
    }
  };

  // Reusable R2 presign + upload helper
  const uploadFile = async (
    file: File,
    type: 'webinarBanner' | 'webinarPresenterPhoto'
  ): Promise<string> => {
    const { data: presignData } = await axios.post<{
      uploadUrl: string;
      key: string;
      publicUrl: string;
    }>('/api/upload/presign', {
      type,
      filename: file.name,
      contentType: file.type,
      webinarId
    });
    await fetch(presignData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });
    return presignData.publicUrl;
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadFile(file, 'webinarBanner');
      const { data } = await axios.patch<Webinar>(`/api/admin/webinars/${webinarId}`, {
        bannerUrl: url
      });
      setWebinar(data);
      toast.success('Banner uploaded');
    } catch {
      toast.error('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file, 'webinarPresenterPhoto');
      const { data } = await axios.patch<Webinar>(`/api/admin/webinars/${webinarId}`, {
        presenterPhotoUrl: url
      });
      setWebinar(data);
      toast.success('Presenter photo uploaded');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!webinar) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/webinars"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              Edit Webinar
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">/{webinar.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/webinars/${webinar.slug}`} target="_blank">
            <Button variant="outline" size="sm">
              Preview
            </Button>
          </Link>
          <Button id="toggle-publish-btn" variant="outline" size="sm" onClick={handleTogglePublish}>
            {webinar.isPublished ? (
              <>
                <EyeOff className="w-4 h-4 mr-1.5" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1.5" />
                Publish
              </>
            )}
          </Button>
          <Button id="save-webinar-btn" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium ${
          webinar.isPublished
            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
            : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${webinar.isPublished ? 'bg-green-500' : 'bg-yellow-500'}`}
        />
        {webinar.isPublished ? 'Published — visible to the public' : 'Draft — not publicly visible'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Basic Info
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="w-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="w-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="w-slug" className="text-sm font-medium">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/webinars/</span>
                <Input
                  id="w-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="w-desc" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="w-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
                placeholder="Describe what this webinar is about…"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="w-date" className="text-sm font-medium">
                  Date & Time
                </label>
                <input
                  id="w-date"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="w-duration" className="text-sm font-medium">
                  Duration (minutes)
                </label>
                <Input
                  id="w-duration"
                  type="number"
                  min={15}
                  max={480}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="w-meetlink" className="text-sm font-medium flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Google Meet / Meeting Link
              </label>
              <Input
                id="w-meetlink"
                type="url"
                placeholder="https://meet.google.com/xxx-xxx-xxx"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Can be added/updated at any time. Sent to registrants via WhatsApp before the
                session.
              </p>
            </div>
          </section>

          {/* Banner */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4" />
              Banner Image
            </h2>
            <p className="text-xs text-muted-foreground">
              Optimised for 1920×1080 (16:9). Max 8 MB.
            </p>
            {webinar.bannerUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border max-w-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={webinar.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <Button
              id="upload-banner-btn"
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
            >
              {uploadingBanner ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {webinar.bannerUrl ? 'Replace Banner' : 'Upload Banner'}
            </Button>
          </section>

          {/* Key Takeaways */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Key Takeaways
            </h2>
            <ul className="space-y-2">
              {takeaways.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-muted rounded-lg px-3 py-2">{item}</span>
                  <button
                    onClick={() => setTakeaways((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                id="new-takeaway"
                placeholder="Add a key takeaway…"
                value={newTakeaway}
                onChange={(e) => setNewTakeaway(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTakeaway.trim()) {
                      setTakeaways((prev) => [...prev, newTakeaway.trim()]);
                      setNewTakeaway('');
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!newTakeaway.trim()}
                onClick={() => {
                  if (newTakeaway.trim()) {
                    setTakeaways((prev) => [...prev, newTakeaway.trim()]);
                    setNewTakeaway('');
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </section>

          {/* Presenter */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Presenter Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="p-name" className="text-sm font-medium">
                  Presenter Name
                </label>
                <Input
                  id="p-name"
                  value={presenterName}
                  onChange={(e) => setPresenterName(e.target.value)}
                  maxLength={150}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Presenter Photo</label>
                <div className="flex items-center gap-3">
                  {webinar.presenterPhotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={webinar.presenterPhotoUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    id="upload-photo-btn"
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-bio" className="text-sm font-medium">
                Short Bio
              </label>
              <textarea
                id="p-bio"
                rows={3}
                value={presenterBio}
                onChange={(e) => setPresenterBio(e.target.value)}
                maxLength={2000}
                placeholder="Brief professional bio…"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Credentials */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Professional Certifications</label>
              <div className="flex flex-wrap gap-1.5">
                {presenterCredentials.map((cred, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs px-2.5 py-1 rounded-full"
                  >
                    {cred}
                    <button
                      onClick={() =>
                        setPresenterCredentials((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-credential"
                  placeholder="e.g. CEH, OSCP, ISO 27001 Auditor"
                  value={newCredential}
                  onChange={(e) => setNewCredential(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCredential.trim()) {
                        setPresenterCredentials((prev) => [...prev, newCredential.trim()]);
                        setNewCredential('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!newCredential.trim()}
                  onClick={() => {
                    if (newCredential.trim()) {
                      setPresenterCredentials((prev) => [...prev, newCredential.trim()]);
                      setNewCredential('');
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* SEO */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              SEO
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="w-meta-title" className="text-sm font-medium">
                Meta Title
              </label>
              <Input
                id="w-meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={200}
                placeholder={title}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="w-meta-desc" className="text-sm font-medium">
                Meta Description
              </label>
              <textarea
                id="w-meta-desc"
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={500}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">{metaDescription.length}/500</p>
            </div>
          </section>
        </div>

        {/* Right sidebar — registrations */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-card border border-border rounded-xl p-5">
            <RegistrationsPanel webinarId={webinarId} />
          </div>
        </div>
      </div>
    </div>
  );
}
