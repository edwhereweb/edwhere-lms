import { DEFAULT_PUBLIC_APP_URL, buildPublicUrl, getPublicBaseUrl } from '../url-utils';

describe('lib/url-utils', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    (process.env as { NODE_ENV: string }).NODE_ENV = originalNodeEnv ?? 'test';
  });

  describe('getPublicBaseUrl', () => {
    it('returns default public app URL when NEXT_PUBLIC_APP_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      expect(getPublicBaseUrl()).toBe(DEFAULT_PUBLIC_APP_URL);
    });

    it('returns configured NEXT_PUBLIC_APP_URL when valid and non-localhost', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-app.com/';
      expect(getPublicBaseUrl()).toBe('https://custom-app.com');
    });

    it('falls back to DEFAULT_PUBLIC_APP_URL when localhost and preferPublic is set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      expect(getPublicBaseUrl({ preferPublic: true })).toBe(DEFAULT_PUBLIC_APP_URL);
    });

    it('falls back to DEFAULT_PUBLIC_APP_URL when localhost and NODE_ENV is production', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
      expect(getPublicBaseUrl()).toBe(DEFAULT_PUBLIC_APP_URL);
    });

    it('allows localhost in non-production when preferPublic is false', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      (process.env as { NODE_ENV: string }).NODE_ENV = 'development';
      expect(getPublicBaseUrl({ preferPublic: false })).toBe('http://localhost:3000');
    });
  });

  describe('buildPublicUrl', () => {
    it('constructs clean absolute URLs with leading slash path and query params', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://learn.edwhere.com';
      const url = buildPublicUrl('/courses/aws-101', {
        queryParams: { ct: 'META_AWS_50', ref: 'email' }
      });
      expect(url).toBe('https://learn.edwhere.com/courses/aws-101?ct=META_AWS_50&ref=email');
    });

    it('normalizes missing leading slash in path', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://learn.edwhere.com';
      const url = buildPublicUrl('courses/aws-101');
      expect(url).toBe('https://learn.edwhere.com/courses/aws-101');
    });

    it('never exposes localhost when preferPublic is true', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      const url = buildPublicUrl('/courses/aws-101', { preferPublic: true });
      expect(url).toBe(`${DEFAULT_PUBLIC_APP_URL}/courses/aws-101`);
    });
  });
});
