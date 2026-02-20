import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200)
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().min(0).optional(),
  categoryId: z.string().optional()
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  videoUrl: z.string().url().optional(),
  isFree: z.boolean().optional(),
  youtubeVideoId: z.string().max(50).nullable().optional()
});

export const createChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200)
});

export const reorderChaptersSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0)
    })
  )
});

export const progressSchema = z.object({
  isCompleted: z.boolean()
});

export const attachmentSchema = z.object({
  url: z.string().url('Valid URL is required'),
  originalFilename: z.string().max(255).optional()
});

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100)
    .transform((v) => v.trim())
});

export const instructorSchema = z.object({
  profileId: z.string().min(1, 'profileId is required')
});

export const razorpayVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  courseId: z.string().min(1)
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional()
});
