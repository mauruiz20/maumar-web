import type { Lang } from '../lib/lang';

/** Facts that are the same in every language. */
export const PERSON = {
  name: 'Francisco Mauricio Ruiz',
  email: 'ruizmauricio012@gmail.com',
  github: 'https://github.com/mauruiz20',
  linkedin: 'https://www.linkedin.com/in/ruiz-francisco-mauricio',
  site: 'https://maumar.com.ar',
  locality: 'San Miguel de Tucumán',
  country: 'AR',
} as const;

export interface Link {
  label: string;
  href: string;
}

export interface Meta {
  /** Path of this page on the site, with trailing slash. */
  path: '/' | '/es/';
  /** Open Graph locale, e.g. en_US. */
  locale: string;
  title: string;
  description: string;
  ogImage: string;
  ogImageAlt: string;
}

export interface Ui {
  skipLink: string;
  siteNav: string;
  themeToggle: string;
  /** Link to the same page in the other language. */
  otherLang: { lang: Lang; label: string; href: string; heroLabel: string };
  downloadCv: string;
  cvHref: string;
  footer: string;
}

export interface Hero {
  role: string;
  intro: string;
  availability: string;
}

export interface Job {
  id: string;
  role: string;
  company: string;
  place: string;
  /** ISO year-month, for <time datetime>. */
  start: string;
  /** ISO year-month, or null while current. */
  end: string | null;
  period: string;
  summary: string;
  highlights: string[];
}

export interface Project {
  id: 'turnero' | 'monogestor' | 'jobradar' | 'home-server';
  name: string;
  summary: string;
  details: string[];
  /** Technology names, identical across languages. */
  stack: string[];
  link?: Link;
}

export interface SkillGroup {
  id: 'frontend' | 'backend' | 'data' | 'infra' | 'testing' | 'ai';
  name: string;
  items: string[];
}

export interface Education {
  title: string;
  degree: string;
  school: string;
  period: string;
  thesis: string;
  languages: string;
}

export interface Contact {
  title: string;
  intro: string;
  emailLabel: string;
  links: Link[];
}

export interface Content {
  lang: Lang;
  meta: Meta;
  ui: Ui;
  hero: Hero;
  experience: { title: string; jobs: Job[] };
  projects: { title: string; intro: string; items: Project[] };
  skills: { title: string; groups: SkillGroup[] };
  education: Education;
  contact: Contact;
}
