import { z } from 'zod';

const fileUrl = z
  .string()
  .refine(
    (v) => v.startsWith('/api/files/') || /^https?:\/\//.test(v),
    'Must be a valid URL or file path'
  );

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200)
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: fileUrl.optional(),
  imageAlt: z.string().max(255).optional(),
  price: z.number().min(0).optional(),
  categoryId: z.string().optional(),
  isWebVisible: z.boolean().optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
    .optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional()
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  videoUrl: z.string().url().optional(),
  isFree: z.boolean().optional(),
  youtubeVideoId: z.string().max(50).nullable().optional(),
  content: z.string().max(100000).nullable().optional(),
  htmlContent: z.string().max(500000).nullable().optional(),
  gamifiedFlag: z.string().max(200).nullable().optional(),
  pdfUrl: fileUrl.nullable().optional()
});

const GOOGLE_DRIVE_REGEX =
  /^https:\/\/(drive|docs|sheets|slides|forms|sites|jamboard)\.google\.com\/.+/;

export const projectSubmissionSchema = z.object({
  driveUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url) => GOOGLE_DRIVE_REGEX.test(url),
      'Only Google Drive, Docs, Sheets, Slides, or Forms links are accepted'
    )
});

export const createChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  moduleId: z.string().optional().nullable(),
  contentType: z
    .enum([
      'VIDEO_MUX',
      'VIDEO_YOUTUBE',
      'TEXT',
      'HTML_EMBED',
      'PDF_DOCUMENT',
      'HANDS_ON_PROJECT',
      'EVALUATION'
    ])
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

export const submitFlagSchema = z.object({
  flag: z.string().min(1, 'Flag is required')
});

export const attachmentSchema = z.object({
  url: fileUrl,
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
  imageUrl: fileUrl.optional(),
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

// ── Quiz / Evaluation schemas ─────────────────────────────────────────────

export const createQuizSchema = z.object({
  isGraded: z.boolean().optional(),
  timeLimit: z.number().int().min(1, 'Timer must be at least 1 minute').nullable().optional(),
  randomize: z.boolean().optional(),
  maxAttempts: z.number().int().min(1, 'Attempts must be at least 1').nullable().optional(),
  maxTabSwitches: z.number().int().min(0).nullable().optional(),
  passScore: z.number().min(0).max(100).nullable().optional()
});

export const createQuestionSchema = z.object({
  body: z.string().min(1, 'Question text is required').max(10000),
  imageUrl: fileUrl.nullable().optional(),
  options: z
    .array(z.string().min(1, 'Option text cannot be empty'))
    .min(2, 'Must provide at least 2 options')
    .max(10, 'Cannot exceed 10 options'),
  correctOptions: z
    .array(z.number().int().min(0))
    .min(1, 'At least one correct option is required'),
  isMultipleChoice: z.boolean().optional()
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

// ── Upload (R2 presign) schemas ─────────────────────────────────────────

const UPLOAD_TYPE = z.enum([
  'profileImage',
  'courseImage',
  'courseAttachment',
  'chapterPdf',
  'questionImage',
  'blogAuthorImage',
  'blogPostImage',
  'blogPostCover'
]);
export type UploadType = z.infer<typeof UPLOAD_TYPE>;

const IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const;

const ATTACHMENT_CONTENT_TYPES = [
  ...IMAGE_CONTENT_TYPES,
  'application/pdf',
  'text/plain',
  'text/csv',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm'
] as const;

export const ALLOWED_CONTENT_TYPES: Record<UploadType, readonly string[]> = {
  profileImage: IMAGE_CONTENT_TYPES,
  courseImage: IMAGE_CONTENT_TYPES,
  courseAttachment: ATTACHMENT_CONTENT_TYPES,
  chapterPdf: ['application/pdf'],
  questionImage: IMAGE_CONTENT_TYPES,
  blogAuthorImage: IMAGE_CONTENT_TYPES,
  blogPostImage: IMAGE_CONTENT_TYPES,
  blogPostCover: IMAGE_CONTENT_TYPES
};

export const MAX_FILE_SIZES: Record<UploadType, number> = {
  profileImage: 4 * 1024 * 1024,
  courseImage: 4 * 1024 * 1024,
  courseAttachment: 16 * 1024 * 1024,
  chapterPdf: 16 * 1024 * 1024,
  questionImage: 250 * 1024,
  blogAuthorImage: 4 * 1024 * 1024,
  blogPostImage: 8 * 1024 * 1024,
  blogPostCover: 8 * 1024 * 1024
};

export const presignSchema = z.object({
  type: UPLOAD_TYPE,
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).optional(),
  courseId: z.string().optional(),
  chapterId: z.string().optional(),
  blogId: z.string().optional()
});

// ── Blog schemas ────────────────────────────────────────────────────────

export const upsertBlogAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  bio: z.string().max(2000).optional(),
  imageUrl: fileUrl.optional(),
  credentials: z.array(z.string()).optional(),
  role: z.string().max(100).optional(),
  userId: z.string().optional(),
  linkedinUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal(''))
});

export const upsertBlogCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
});

export const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300)
});

export const updateBlogPostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
    .optional(),
  content: z.string().min(1, 'Content is required').optional(),
  imageUrl: fileUrl.nullable().optional(),
  imageAlt: z.string().max(255).optional(),
  isPublished: z.boolean().optional(),
  authorId: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  courseIds: z.array(z.string()).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional()
});

export const upsertBlogTagMappingSchema = z.object({
  tagName: z.string().min(1, 'Tag name is required').max(100),
  courseId: z.string().min(1, 'Course ID is required')
});
