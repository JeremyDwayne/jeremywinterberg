export const SITE = {
  title: 'Jeremy Winterberg',
  description: 'Software engineer writing about code, systems, and the craft of building things.',
  url: 'https://jeremywinterberg.com',
  author: 'Jeremy Winterberg',
} as const;

export const NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Home', href: '/' },
  { label: 'Writing', href: '/writing' },
  { label: 'About', href: '/about' },
];

export const SOCIAL = {
  linkedin: 'https://www.linkedin.com/in/jeremywinterberg',
  github: 'https://github.com/JeremyDwayne',
} as const;
