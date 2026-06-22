import { expect, test } from 'vitest';
import { SITE, SOCIAL } from '../consts';

test('site constants are configured', () => {
  expect(SITE.url).toBe('https://jeremywinterberg.com');
  expect(SOCIAL.github).toContain('JeremyDwayne');
});
