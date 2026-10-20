import { PERSON, type Content } from './profile';

export const en: Content = {
  lang: 'en',
  meta: {
    path: '/',
    locale: 'en_US',
    title: 'Francisco Mauricio Ruiz, full-stack developer',
    description:
      'Computer Engineer and full-stack developer in San Miguel de Tucumán, Argentina. React, Next.js, Django and Ruby on Rails for US clients since 2023.',
    ogImage: '/og/en.png',
    ogImageAlt: 'Francisco Mauricio Ruiz, Computer Engineer and full-stack developer',
  },
  ui: {
    skipLink: 'Skip to content',
    siteNav: 'Site settings',
    themeToggle: 'Dark theme',
    otherLang: { lang: 'es', label: 'Español', href: '/es/', heroLabel: 'Leer en español' },
    downloadCv: 'Download CV (PDF)',
    cvHref: '/cv/en/CV_Francisco_Mauricio_Ruiz.pdf',
    footer: 'Built with Astro and served from Cloudflare.',
  },
  hero: {
    role: 'Computer Engineer and full-stack developer',
    intro:
      'I build high-traffic web applications for US clients from San Miguel de Tucumán, Argentina: React, Next.js and TypeScript on the frontend, Django and Ruby on Rails on the backend. Remote since 2023, working in English (C1) every day.',
    availability: 'Remote, flexible working hours.',
  },
  experience: {
    title: 'Experience',
    jobs: [
      {
        id: 'tinkun',
        role: 'Software Engineer, full-stack',
        company: 'Tinkun Tech',
        place: 'USA, remote',
        start: '2023-10',
        end: null,
        period: 'Oct 2023 – present',
        summary:
          'High-traffic web applications for international clients, as part of US teams working in Scrum with daily communication in English.',
        highlights: [
          "Lay's x FIFA World Cup 2026 global campaign: four microsites on one Django monorepo with subdomain routing, deployed on Render.",
          'Promotional sites for Doritos 250th and Match Day Pepsi under high user concurrency: development, client-facing QA and months of live program support.',
          'GenAI in production with the Claude API: purchase-receipt recognition and validation that awards bonuses in Pepsi programs, plus LLM moderation of user-generated content.',
          'Backends in Django (Python) and Ruby on Rails, including Rails 8 in production: REST APIs, PostgreSQL data modeling and background jobs with Celery and Sidekiq.',
          'Frontends in React, Next.js and TypeScript with TailwindCSS; JWT auth in HttpOnly cookies and OAuth with Okta.',
          'Deploys to AWS, Heroku and Render with Docker and GitHub Actions, test-first with Vitest, Playwright and Cypress.',
        ],
      },
      {
        id: 'sistelco',
        role: 'Software Engineer, full-stack',
        company: 'Sistelco S.R.L.',
        place: 'Argentina',
        start: '2023-03',
        end: '2023-10',
        period: 'Mar 2023 – Oct 2023',
        summary: 'Internal systems with Java and Spring Boot, React and MySQL.',
        highlights: [
          'Analysis, design and development of internal systems, with REST APIs consumed by the React client.',
          'Testing, containerization with Docker and on-premise deployment.',
        ],
      },
    ],
  },
  projects: {
    title: 'Projects',
    intro: 'Things I build and run on my own time.',
    items: [
      {
        id: 'turnero',
        name: 'Turnero',
        summary: 'A WhatsApp bot that books appointments, with an admin panel for the business.',
        details: [
          'WhatsApp Cloud API integration with HMAC-verified webhooks, idempotent per-appointment delivery and retries driven by Meta error codes.',
          'Docker Compose, CI in GitHub Actions, tests with pytest and Playwright, self-hosted on Linux with backups and restore.',
        ],
        stack: ['Django', 'DRF', 'Celery', 'PostgreSQL', 'Redis', 'WhatsApp Cloud API'],
      },
      {
        id: 'monogestor',
        name: 'MonoGestor',
        summary: 'A SaaS app for Argentine independent contractors (monotributistas) who export services.',
        details: [
          'TypeScript monorepo with a NestJS/Fastify API, a React PWA and a React Native/Expo mobile app.',
          'Background jobs with Redis and BullMQ, Web Push notifications, self-hosted with Docker on the home server.',
        ],
        stack: ['TypeScript', 'NestJS', 'Fastify', 'React', 'React Native', 'Expo', 'PostgreSQL', 'Prisma', 'Redis', 'BullMQ'],
      },
      {
        id: 'jobradar',
        name: 'jobradar',
        summary: 'A job-search radar for a small household.',
        details: [
          'Collects postings from public job APIs and ATS boards, extracts structured data with Claude, and scores every posting for each person against their skills and CV variants, ready in a daily digest.',
          'Claude Code runs headless with every tool disabled, so posting text cannot steer it. Applications are prepared, never sent automatically.',
        ],
        stack: ['Django 5', 'PostgreSQL 17', 'pgvector', 'Claude Code', 'Raspberry Pi'],
      },
      {
        id: 'home-server',
        name: 'Home server',
        summary: 'A Raspberry Pi 5 running 24/7, which hosts the projects above.',
        details: [
          '8 GB of RAM and a 3.6 TB NVMe drive; I migrated the system from the SD card to NVMe boot.',
          'Exposed through Cloudflare Tunnel, with a Django app live on its own subdomain.',
        ],
        stack: ['Raspberry Pi 5', 'Linux', 'Docker', 'Cloudflare Tunnel'],
        link: { label: 'projects.maumar.com.ar', href: 'https://projects.maumar.com.ar' },
      },
    ],
  },
  skills: {
    title: 'Skills',
    groups: [
      {
        id: 'frontend',
        name: 'Frontend',
        items: ['React', 'Next.js', 'TypeScript', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'TailwindCSS', 'React Native', 'Three.js', 'GSAP'],
      },
      {
        id: 'backend',
        name: 'Backend',
        items: ['Django (Python)', 'Django REST Framework', 'Celery', 'Ruby on Rails', 'Sidekiq', 'NestJS', 'Fastify', 'Java', 'Spring Boot', 'REST APIs', 'JWT', 'OAuth (Okta)'],
      },
      {
        id: 'data',
        name: 'Data',
        items: ['PostgreSQL', 'PostGIS', 'MySQL', 'Prisma', 'Redis', 'BullMQ', 'Production data migrations', 'Web scraping and automation'],
      },
      {
        id: 'infra',
        name: 'Infrastructure',
        items: ['AWS', 'Heroku', 'Render', 'Docker', 'Docker Compose', 'Linux', 'Self-hosting', 'Cloudflare Tunnel', 'Git and GitFlow', 'CI/CD with GitHub Actions'],
      },
      {
        id: 'testing',
        name: 'Testing',
        items: ['TDD', 'pytest', 'RSpec', 'Vitest', 'React Testing Library', 'Playwright', 'Cypress'],
      },
      {
        id: 'ai',
        name: 'AI',
        items: ['LLM API integration (Claude)', 'Data extraction with vision models', 'Text moderation', 'Claude Code', 'Codex', 'Prompt-Driven Development', 'Spec-Driven Development'],
      },
    ],
  },
  education: {
    title: 'Education',
    degree: 'Computer Engineering',
    school: 'Universidad Nacional de Tucumán (UNT)',
    period: '2019 – 2023',
    thesis:
      'Final project: a customer and service management system for an internet service provider, built with Java and Spring Boot, React and MySQL.',
    languages: 'Spanish is my native language; my English is advanced (C1), used every day with US teams and clients.',
  },
  contact: {
    title: 'Contact',
    intro: 'Email is the best way to reach me.',
    emailLabel: PERSON.email,
    links: [
      { label: 'GitHub', href: PERSON.github },
      { label: 'LinkedIn', href: PERSON.linkedin },
    ],
  },
  room: {
    enter: 'View the 3D room',
    exit: 'View CV / simple mode',
    label: '3D room',
    loading: 'Setting up the room…',
    back: 'Back',
    menu: 'Objects in the room',
    lamp: 'Desk lamp',
    hint: 'Click an object, or pick one from this list.',
    objects: 'Objects',
    desk: 'Desk',
    hotspots: {
      monitor: 'Monitor: experience',
      bookshelf: 'Bookshelf: projects',
      whiteboard: 'Whiteboard: skills',
      pi: 'Raspberry Pi: home server',
      phone: 'Phone: contact and CV',
      mug: 'Mug: education',
      window: 'Window: view',
    },
  },
};
