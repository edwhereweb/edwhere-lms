# Cloudflare R2 — Implementation and Assumptions

This document describes how file uploads and downloads are implemented with Cloudflare R2, the decisions made, and assumptions that affect future changes. Use it when onboarding, debugging, or extending uploads (e.g. new upload types or student submissions).

---

## 1. Overview

- **Storage**: Single Cloudflare R2 bucket (private; no public bucket URL).
- **Upload mechanism**: Presigned PUT URLs. The client requests a short-lived URL from our API, then uploads the file directly to R2 from the browser. No file bytes pass through our Next.js server.
- **Download mechanism**: Proxy. Requests to `/api/files/<key>` are served by our API: we fetch the object from R2 and stream the body back with 200 + `Content-Type`. We do not redirect to a presigned R2 URL; proxying ensures `next/image` and iframes (e.g. PDF viewer) work without redirect/cross-origin issues.
- **Access model**: Public vs private is enforced in our app by key prefix, not by R2 bucket policy. Keys under `public/` are served without auth; keys under `private/` require auth and course-based access checks.

---

## 2. Architecture and Data Flow

### Upload flow

1. User selects a file in the UI (`FileUpload` component).
2. Client calls `POST /api/upload/presign` with `type`, `filename`, optional `contentType`, and (for course/chapter) `courseId` / `chapterId`.
3. Presign route: validates auth (Clerk + teacher), validates body (Zod), ensures `courseId`/`chapterId` when required, checks content-type allow-list, builds R2 key, returns `{ uploadUrl, key }`.
4. Client `PUT`s the file to `uploadUrl` (directly to R2). No auth header; the URL is pre-signed.
5. Client stores the app URL `/api/files/<key>` (e.g. via `onChange`) and the parent form submits that URL to the relevant API (PATCH course, POST attachment, PATCH chapter, etc.).

### Download / serving flow

1. A stored value is either a legacy URL (e.g. `https://utfs.io/...`) or an app path `/api/files/<key>` (e.g. `/api/files/public/course-images/...`).
2. For `next/image` or `<img>`, `src` is that value. For PDFs, `PdfViewer` uses it as iframe `src`. For attachments, links use `href={attachment.url}`.
3. Request hits `GET /api/files/[...path]`. The path is the R2 key (e.g. `public/course-images/69a.../uuid.jpg`).
4. Files route: parses key from path; if key starts with `private/`, runs auth and course-access checks; then calls `getObject(key)` from `lib/r2.ts`, streams the body back with appropriate `Content-Type` and `Cache-Control`.

---

## 3. Key Structure and Upload Types

All keys live in one bucket. Prefixes define both visibility and access rules:

| Prefix                                                    | Visibility | Auth for GET                                | Used for           |
| --------------------------------------------------------- | ---------- | ------------------------------------------- | ------------------ |
| `public/profile-images/{userId}/{uuid}.{ext}`             | Public     | None                                        | Profile avatar     |
| `public/course-images/{courseId}/{uuid}.{ext}`            | Public     | None                                        | Course cover image |
| `private/attachments/{courseId}/{uuid}-{sanitized}.{ext}` | Private    | Course access (teacher or enrolled student) | Course attachments |
| `private/chapter-pdfs/{chapterId}/{uuid}.pdf`             | Private    | Course access (teacher or enrolled student) | Chapter PDF        |

- **Public**: Anyone can request the file; no Clerk auth. Used for profile and course images shown in catalogs and cards.
- **Private**: Access is enforced in `app/api/files/[...path]/route.ts` by `authorizePrivateAccess`: user must be authenticated and either (1) teacher/admin, or (2) enrolled in the course (for attachments: courseId from key; for chapter-pdfs: courseId from chapter).

Future additions (e.g. student assignment submissions) should use a new prefix such as `private/submissions/{courseId}/{studentId}/{uuid}.{ext}` and a corresponding rule in `authorizePrivateAccess`.

---

## 4. Environment and Configuration

- **Required env vars** (validated in `lib/env.ts`): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
- **R2 API token**: Must have **Object Read**, **Object Write**, and **Object Delete** on the bucket (delete is used when replacing or removing files; see §6). No bucket-level delete or admin required.
- **CORS**: The bucket must have a CORS policy allowing the app origin (e.g. `http://localhost:3000`, production origin) and methods `GET`, `PUT`, `HEAD`, and headers the client sends (e.g. `Content-Type`). Without this, browser PUTs to the presigned URL fail with CORS errors. See [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/).

---

## 5. Stored Values and Validation

- **What we store in the DB**: A single string in existing fields (`Profile.imageUrl`, `Course.imageUrl`, `Attachment.url`, `Chapter.pdfUrl`). For new R2 uploads this is the **app path** `/api/files/<key>` (e.g. `/api/files/public/course-images/...`). We do not store the raw R2 key alone; the path is the key.
- **Validation** (`lib/validations.ts`): The `fileUrl` helper accepts either (1) a path starting with `/api/files/`, or (2) a full URL (`http`/`https`). So legacy URLs (e.g. UploadThing) and R2 app paths are both valid. Used in `updateCourseSchema.imageUrl`, `updateChapterSchema.pdfUrl`, `attachmentSchema.url`, `profileUpdateSchema.imageUrl`, and the asset-detail-client `pdfUrl` schema.
- **Rendering**: Components use the stored value as-is for `src` or `href`. Relative `/api/files/...` works because the app is same-origin. For emails or external links you would need to prepend `NEXT_PUBLIC_APP_URL` (or the current origin).

---

## 6. Backward Compatibility and Legacy URLs

- **Existing UploadThing URLs**: Remain valid. They are full `https://...` URLs and pass the `fileUrl` validator. No DB migration. `next.config.js` keeps `utfs.io` in `images.remotePatterns` so `next/image` can optimize those images if needed.
- **Mixed content**: A course can have some images from UploadThing and some from R2; we only validate “URL or /api/files/ path” and render accordingly.

---

## 6. R2 Object Cleanup (Deletion)

We delete objects from R2 when the corresponding entity is removed or when the file is replaced, so the bucket does not accumulate orphaned objects.

- **Course deleted** (`DELETE /api/courses/[courseId]`): Before deleting the course, we delete the course image (if R2), all attachment objects (if R2), and all chapter PDFs (if R2) for that course. Then the course and its relations are removed (Prisma cascade).
- **Course image replaced** (`PATCH /api/courses/[courseId]` with new `imageUrl`): Before updating, if the existing `imageUrl` is an R2 path and the new value is different, we delete the old object from R2.
- **Attachment deleted** (`DELETE /api/courses/[courseId]/attachments/[attachmentId]`): Before deleting the attachment record, if `attachment.url` is an R2 path, we delete that object from R2.
- **Chapter deleted** (`DELETE /api/courses/[courseId]/chapters/[chapterId]`): Before deleting the chapter, if the chapter has a `pdfUrl` that is an R2 path, we delete that object from R2.
- **Chapter PDF replaced or removed** (`PATCH /api/courses/[courseId]/chapters/[chapterId]` with new `pdfUrl` or `null`): Before updating, if the existing `pdfUrl` is an R2 path and the new value is different, we delete the old object from R2.
- **Profile image replaced** (`PATCH /api/profile/[id]` with new `imageUrl`): Before updating, if the existing `imageUrl` is an R2 path and the new value is different, we delete the old object from R2.

Only stored URLs that start with `/api/files/` are considered R2 keys; legacy (e.g. UploadThing) URLs are left unchanged. Deletion is best-effort: we catch and ignore errors (e.g. NoSuchKey) so that DB updates still succeed if R2 delete fails.

---

## 7. Assumptions and Decisions

- **Single bucket**: One R2 bucket for all upload types. Public vs private is determined by key prefix and enforced in our API.
- **No server-side size limit on presign**: `MAX_FILE_SIZES` in validations are defined but not enforced in the presign route. R2 accepts the upload; hard limits are enforced by R2/bucket config. To enforce per-type limits at presign time, add a `maxSize` check in the presign route and reject the request if the client sends a size (e.g. in the request body) above the limit.
- **Teacher-only upload**: Only teachers (and admins) can request presigned URLs. Students are not allowed to upload via this flow; future student submissions would require a new upload type and possibly different auth.
- **File serving is proxy, not redirect**: We stream the object from R2 so that `next/image` and iframes get a 200 response with the body. Redirects to presigned GET URLs were not used because they broke image display.
- **Lazy R2 client**: `lib/r2.ts` builds the S3 client on first use (getter), not at module load, so the app can build without R2 env vars.
- **Cleanup on replace/delete**: When an entity is deleted or its file field is updated, we delete the previous R2 object if the stored value was an R2 path (§6). The R2 API token must have Object Delete permission.
- **Missing object**: If the key does not exist in R2, `getObject` throws (e.g. NoSuchKey). The files route catches that and returns 404 so the API does not leak 500 for “file not found”.

---

## 8. Where to Change What

| Change                                    | Primary location(s)                                                                                                                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New upload type (e.g. student submission) | `lib/validations.ts` (UploadType, ALLOWED_CONTENT_TYPES, key prefix); `app/api/upload/presign/route.ts` (buildKey); `app/api/files/[...path]/route.ts` (authorizePrivateAccess); `components/file-upload.tsx` (endpoint prop); add R2 delete in relevant delete/PATCH routes (§6) |
| New content type or size limit            | `lib/validations.ts` (ALLOWED_CONTENT_TYPES, MAX_FILE_SIZES); optional enforcement in presign route                                                                                                                                                                               |
| Adjust key structure or naming            | `app/api/upload/presign/route.ts` (buildKey)                                                                                                                                                                                                                                      |
| Change access rules for private files     | `app/api/files/[...path]/route.ts` (authorizePrivateAccess, hasAccessToCourse)                                                                                                                                                                                                    |
| Presign expiry or caching headers         | `lib/r2.ts` (presign constants); `app/api/files/[...path]/route.ts` (Cache-Control)                                                                                                                                                                                               |
| R2 client or bucket config                | `lib/r2.ts`                                                                                                                                                                                                                                                                       |

---

## 9. Security and Edge Cases

- **Path traversal**: The key is built from path segments joined by `/`. We do not allow arbitrary keys; we only allow keys that start with `public/` or `private/` and match the expected segment pattern. Invalid prefix returns 400.
- **Private access**: For `private/attachments/{courseId}/...` we use `courseId` from the path. For `private/chapter-pdfs/{chapterId}/...` we load the chapter to get `courseId` then check course access. Enrolled students and teachers/admins can access; others get 403.
- **Public access**: No auth. Anyone who knows the path can request the file. So do not put sensitive data under `public/`.

---

## 10. Known Limitations and Future Work

- **Server-side size check**: Presign does not enforce `MAX_FILE_SIZES`; consider adding optional size in the presign body and rejecting if over limit.
- **Absolute URLs**: Stored values are relative `/api/files/...`. For sharing or emails, callers must prepend the app origin.
- **Student uploads**: Not implemented; would need a new upload type, key prefix, and access rules (e.g. only that student and course teachers can access).
- **Deletion**: We delete R2 objects when entities are deleted or when file fields are replaced (§6). The R2 token must have Object Delete permission.

---

## 11. File Reference

| File                               | Role                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/r2.ts`                        | R2 client (lazy), presigned PUT/GET helpers, getObject (stream), urlToR2Key, deleteObject     |
| `lib/env.ts`                       | R2 env validation                                                                             |
| `lib/validations.ts`               | fileUrl, presignSchema, UploadType, ALLOWED_CONTENT_TYPES, MAX_FILE_SIZES                     |
| `app/api/upload/presign/route.ts`  | POST presign; auth, validation, key building, presigned PUT                                   |
| `app/api/files/[...path]/route.ts` | GET file by key; public/private access, getObject, stream response, 404 on NoSuchKey          |
| `components/file-upload.tsx`       | Dropzone; presign → PUT to R2 → onChange with `/api/files/<key>`; optional courseId/chapterId |
| `middleware.ts`                    | `/api/files(.*)` is public (auth is inside the route for private keys)                        |
