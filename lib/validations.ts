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
  youtubeVideoId: z.string().max(50).nullable().optional(),
  content: z.string().max(100000).nullable().optional(),
  htmlContent: z.string().max(500000).nullable().optional(),
  pdfUrl: z.string().url().nullable().optional()
});

export const createChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  moduleId: z.string().optional().nullable(),
  contentType: z
    .enum(['VIDEO_MUX', 'VIDEO_YOUTUBE', 'TEXT', 'HTML_EMBED', 'PDF_DOCUMENT'])
    .optional()
});

export const reorderChaptersSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
      moduleId: z.string().optional().nullable()
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

export const unenrollLearnerSchema = z.object({
  force: z.boolean().optional()
});

// ── Module schemas ──────────────────────────────────────────────────────

export const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200)
});

export const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  isFree: z.boolean().optional()
});

export const reorderModulesSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0)
    })
  )
});

// ── Contact / Lead schemas ──────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  message: z.string().min(5).max(5000)
});

export const createLeadSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
  source: z.string().default('MANUAL_ENTRY')
});

const VALID_LEAD_STATUSES = [
  'NEW_LEAD',
  'DECISION_PENDING',
  'RNR1',
  'RNR2',
  'PAYMENT_PENDING',
  'NOT_INTERESTED',
  'OFFLINE_INTERESTED',
  'FUTURE_OPTIONS'
] as const;

export const updateLeadSchema = z.object({
  status: z.enum(VALID_LEAD_STATUSES).optional(),
  notes: z.string().max(10000).optional()
});

// ── Message schemas ─────────────────────────────────────────────────────

export const messageBodySchema = z.object({
  content: z.string().min(1).max(4000),
  threadStudentId: z.string().optional()
});

export const markReadSchema = z.object({
  studentId: z.string().min(1)
});
