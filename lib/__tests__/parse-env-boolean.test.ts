import { parseEnvBoolean } from '@/lib/parse-env-boolean';

describe('parseEnvBoolean', () => {
  it.each(['true', 'TRUE', ' true ', '"true"', "'true'", '1', 'yes', 'on', true, 1])(
    'treats %p as true',
    (v) => expect(parseEnvBoolean(v)).toBe(true)
  );
  it.each(['false', '0', 'no', 'off', 'garbage', false, 0])('treats %p as false', (v) =>
    expect(parseEnvBoolean(v)).toBe(false)
  );
  it('uses fallback for undefined/empty', () => {
    expect(parseEnvBoolean(undefined)).toBe(false);
    expect(parseEnvBoolean('', true)).toBe(true);
  });
});
