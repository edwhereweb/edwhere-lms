import {
  isGoogleMeetAvailableForCourse,
  isGoogleMeetEnabled
} from '../integrations/google/feature-flag';

describe('isGoogleMeetEnabled', () => {
  const original = process.env.GOOGLE_MEET_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_MEET_ENABLED;
    else process.env.GOOGLE_MEET_ENABLED = original;
  });

  it.each(['true', 'TRUE', ' true ', '"true"', '1'])('is enabled for %p', (v) => {
    process.env.GOOGLE_MEET_ENABLED = v;
    expect(isGoogleMeetEnabled()).toBe(true);
  });

  it.each(['false', '', '0'])('is disabled for %p', (v) => {
    process.env.GOOGLE_MEET_ENABLED = v;
    expect(isGoogleMeetEnabled()).toBe(false);
  });

  it('is disabled when unset', () => {
    delete process.env.GOOGLE_MEET_ENABLED;
    expect(isGoogleMeetEnabled()).toBe(false);
  });

  it('reads the env fresh on every call', () => {
    process.env.GOOGLE_MEET_ENABLED = 'false';
    expect(isGoogleMeetEnabled()).toBe(false);
    process.env.GOOGLE_MEET_ENABLED = 'true';
    expect(isGoogleMeetEnabled()).toBe(true);
  });

  it('requires both platform and course flags', () => {
    process.env.GOOGLE_MEET_ENABLED = 'true';
    expect(isGoogleMeetAvailableForCourse(true)).toBe(true);
    expect(isGoogleMeetAvailableForCourse(false)).toBe(false);
    process.env.GOOGLE_MEET_ENABLED = 'false';
    expect(isGoogleMeetAvailableForCourse(true)).toBe(false);
  });
});
