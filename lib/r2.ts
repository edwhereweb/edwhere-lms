/**
 * Cloudflare R2 (S3-compatible) client for presigned uploads/downloads.
 * For browser uploads to work, the R2 bucket must have a CORS policy allowing
 * your app origin and PUT/GET/HEAD. See https://developers.cloudflare.com/r2/buckets/cors/
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    });
  }
  return _client;
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME!;
}

const PRESIGN_UPLOAD_EXPIRES = 900; // 15 minutes
const PRESIGN_DOWNLOAD_EXPIRES = 3600; // 1 hour

export async function createPresignedPutUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_UPLOAD_EXPIRES });
}

export async function createPresignedGetUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_DOWNLOAD_EXPIRES });
}

export type GetObjectResult = {
  body: ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: number;
};

/**
 * Fetches an object from R2 and returns a stream. Used to proxy files so
 * next/image and same-origin requests get a 200 response with the body.
 */
export async function getObject(key: string): Promise<GetObjectResult | null> {
  const client = getR2Client();
  const bucket = getBucket();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
  if (!res.Body) return null;
  const body = res.Body.transformToWebStream() as ReadableStream<Uint8Array>;
  return {
    body,
    contentType: res.ContentType ?? undefined,
    contentLength: res.ContentLength ?? undefined
  };
}

/**
 * Extracts the R2 object key from a stored URL. Returns null if the URL is not
 * an app file URL (e.g. legacy UploadThing or external).
 */
export function urlToR2Key(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const prefix = '/api/files/';
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length).trim();
  return key ? key : null;
}

/**
 * Deletes an object from R2 by key. Ignores NoSuchKey (idempotent).
 * R2 API token must have Object Delete permission.
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucket();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return;
    }
    throw error;
  }
}
