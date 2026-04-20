'use client';

import * as z from 'zod';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil, User, Plus, X, Linkedin, Twitter, Globe } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BlogAuthor } from '@prisma/client';
import Link from 'next/link';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { upsertBlogAuthorSchema } from '@/lib/validations';
import { FileUpload } from '@/components/file-upload';
import Image from 'next/image';

interface ProfileFormProps {
  initialData: BlogAuthor | null;
}

type FormValues = z.infer<typeof upsertBlogAuthorSchema>;

export const ProfileForm = ({ initialData }: ProfileFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newCredential, setNewCredential] = useState('');
  const router = useRouter();

  const toggleEdit = () => setIsEditing((prev) => !prev);

  const form = useForm<FormValues>({
    resolver: zodResolver(upsertBlogAuthorSchema),
    defaultValues: {
      name: initialData?.name || '',
      role: initialData?.role || '',
      bio: initialData?.bio || '',
      imageUrl: initialData?.imageUrl || '',
      credentials: initialData?.credentials || [],
      linkedinUrl: initialData?.linkedinUrl || '',
      twitterUrl: initialData?.twitterUrl || '',
      websiteUrl: initialData?.websiteUrl || ''
    }
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: FormValues) => {
    try {
      // Treat empty strings as absent so the DB stores null rather than ''
      const payload = {
        ...values,
        linkedinUrl: values.linkedinUrl || undefined,
        twitterUrl: values.twitterUrl || undefined,
        websiteUrl: values.websiteUrl || undefined
      };
      await api.patch('/blogs/authors/me', payload);
      toast.success('Profile updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const addCredential = () => {
    if (!newCredential.trim()) return;
    const current = form.getValues('credentials') || [];
    form.setValue('credentials', [...current, newCredential.trim()]);
    setNewCredential('');
  };

  const removeCredential = (index: number) => {
    const current = form.getValues('credentials') || [];
    form.setValue(
      'credentials',
      current.filter((_, i) => i !== index)
    );
  };

  const socialLinks = [
    { url: initialData?.linkedinUrl, icon: Linkedin, label: 'LinkedIn' },
    { url: initialData?.twitterUrl, icon: Twitter, label: 'Twitter / X' },
    { url: initialData?.websiteUrl, icon: Globe, label: 'Website' }
  ].filter((s) => Boolean(s.url));

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-slate-900/50">
      <div className="font-medium flex items-center justify-between mb-4">
        Author Profile Appearance
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <div className="space-y-4">
          <div className="flex items-center gap-x-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border">
              {initialData?.imageUrl ? (
                <Image
                  fill
                  className="object-cover"
                  src={initialData.imageUrl}
                  alt={initialData.name}
                />
              ) : (
                <div className="h-full w-full bg-slate-200 flex items-center justify-center">
                  <User className="h-10 w-10 text-slate-500" />
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-bold">{initialData?.name || 'No name set'}</p>
              <p className="text-sm text-slate-500">{initialData?.role || 'No role set'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Bio</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
              {initialData?.bio || 'No bio set.'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Credentials &amp; Certifications</p>
            <div className="flex flex-wrap gap-2">
              {initialData?.credentials?.map((cred: string, i: number) => (
                <span
                  key={i}
                  className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 text-xs px-2 py-1 rounded-md border border-sky-200"
                >
                  {cred}
                </span>
              ))}
              {!initialData?.credentials?.length && (
                <p className="text-sm text-slate-500 italic">No credentials added.</p>
              )}
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Social &amp; Web</p>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(({ url, icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-x-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {socialLinks.length === 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Social &amp; Web</p>
              <p className="text-sm text-slate-500 italic">No social links added.</p>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Name</FormLabel>
                      <FormControl>
                        <Input disabled={isSubmitting} placeholder="e.g. John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Role</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isSubmitting}
                          placeholder="e.g. Senior Security Analyst"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={isSubmitting}
                          placeholder="Describe your expertise and background..."
                          className="h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Social links */}
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-x-1.5">
                        <Linkedin className="h-3.5 w-3.5" /> LinkedIn URL
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={isSubmitting}
                          placeholder="https://linkedin.com/in/yourprofile"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twitterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-x-1.5">
                        <Twitter className="h-3.5 w-3.5" /> Twitter / X URL
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={isSubmitting}
                          placeholder="https://twitter.com/yourhandle"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-x-1.5">
                        <Globe className="h-3.5 w-3.5" /> Website URL
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={isSubmitting}
                          placeholder="https://yourwebsite.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author Photo</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <FileUpload
                            endpoint="blogAuthorImage"
                            onChange={(url) => field.onChange(url)}
                          />
                          {field.value && (
                            <div className="relative h-20 w-20 rounded-full overflow-hidden border">
                              <Image
                                fill
                                className="object-cover"
                                src={field.value}
                                alt="Preview"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Credentials &amp; Certifications</FormLabel>
                  <div className="flex gap-x-2">
                    <Input
                      value={newCredential}
                      onChange={(e) => setNewCredential(e.target.value)}
                      placeholder="e.g. EC-Council CEH"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCredential())}
                    />
                    <Button type="button" onClick={addCredential} size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch('credentials')?.map((cred: string, i: number) => (
                      <span
                        key={i}
                        className="flex items-center gap-x-1 bg-sky-50 text-sky-600 border border-sky-100 px-2 py-1 rounded text-sm"
                      >
                        {cred}
                        <button type="button" onClick={() => removeCredential(i)}>
                          <X className="h-3 w-3 hover:text-rose-500" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-x-2 pt-4">
              <Button disabled={!isValid || isSubmitting} type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
