import { PERSON, type Content } from './profile';

export const es: Content = {
  lang: 'es',
  meta: {
    path: '/es/',
    locale: 'es_AR',
    title: 'Francisco Mauricio Ruiz, desarrollador fullstack',
    description:
      'Ingeniero en Computación y desarrollador fullstack en San Miguel de Tucumán, Argentina. React, Next.js, Django y Ruby on Rails para clientes de EE.UU. desde 2023.',
    ogImage: '/og/es.png',
    ogImageAlt: 'Francisco Mauricio Ruiz, Ingeniero en Computación y desarrollador fullstack',
  },
  ui: {
    skipLink: 'Ir al contenido',
    siteNav: 'Preferencias del sitio',
    themeToggle: 'Tema oscuro',
    otherLang: { lang: 'en', label: 'English', href: '/', heroLabel: 'Read in English' },
    downloadCv: 'Descargar CV (PDF)',
    cvHref: '/cv/es/CV_Francisco_Mauricio_Ruiz.pdf',
    footer: 'Hecho con Astro y servido desde Cloudflare.',
  },
  hero: {
    role: 'Ingeniero en Computación y desarrollador fullstack',
    intro:
      'Construyo aplicaciones web de alta carga de usuarios para clientes de Estados Unidos desde San Miguel de Tucumán: React, Next.js y TypeScript en el frontend; Django y Ruby on Rails en el backend. Trabajo en remoto desde 2023, en inglés (C1) todos los días.',
    availability: 'Disponible para reubicarme en Córdoba capital o Buenos Aires.',
  },
  experience: {
    title: 'Experiencia',
    jobs: [
      {
        id: 'tinkun',
        role: 'Ingeniero de Software, fullstack',
        company: 'Tinkun Tech',
        place: 'EE.UU., remoto',
        start: '2023-10',
        end: null,
        period: 'oct. 2023 – actualidad',
        summary:
          'Aplicaciones web de alta carga para clientes internacionales, integrado a equipos de EE.UU. con Scrum y comunicación diaria en inglés.',
        highlights: [
          "Campaña global Lay's x FIFA World Cup 2026: cuatro microsites sobre un monorepo Django con ruteo por subdominios, desplegado en Render.",
          'Sitios promocionales para Doritos 250th y Match Day Pepsi con alta concurrencia de usuarios: desarrollo, QA junto al cliente y meses de soporte de programas en vivo.',
          'GenAI en producción con la API de Claude: reconocimiento y validación de recibos de compra para otorgar bonus en programas de Pepsi, y moderación con LLM de contenido generado por usuarios.',
          'Backend con Django (Python) y Ruby on Rails, incluido Rails 8 en producción: APIs REST, modelado de datos en PostgreSQL y trabajos en segundo plano con Celery y Sidekiq.',
          'Frontend con React, Next.js y TypeScript con TailwindCSS; autenticación JWT en cookies HttpOnly y OAuth con Okta.',
          'Despliegues en AWS, Heroku y Render con Docker y GitHub Actions, con enfoque TDD usando Vitest, Playwright y Cypress.',
        ],
      },
      {
        id: 'sistelco',
        role: 'Ingeniero de Software, fullstack',
        company: 'Sistelco S.R.L.',
        place: 'Argentina',
        start: '2023-03',
        end: '2023-10',
        period: 'mar. 2023 – oct. 2023',
        summary: 'Sistemas internos con Java y Spring Boot, React y MySQL.',
        highlights: [
          'Análisis, diseño y desarrollo de sistemas internos, con APIs REST consumidas desde el cliente React.',
          'Pruebas, contenedorización con Docker y despliegue on-premise.',
        ],
      },
    ],
  },
  projects: {
    title: 'Proyectos',
    intro: 'Lo que construyo y mantengo en mi tiempo libre.',
    items: [
      {
        id: 'turnero',
        name: 'Turnero',
        summary: 'Un bot de WhatsApp que agenda turnos, con un panel de administración para el negocio.',
        details: [
          'Integración con la WhatsApp Cloud API: webhooks verificados con HMAC, envío idempotente por turno y reintentos según los códigos de error de Meta.',
          'Docker Compose, CI en GitHub Actions, pruebas con pytest y Playwright, autohospedado en Linux con backups y restauración.',
        ],
        stack: ['Django', 'DRF', 'Celery', 'PostgreSQL', 'Redis', 'WhatsApp Cloud API'],
      },
      {
        id: 'monogestor',
        name: 'MonoGestor',
        summary: 'Una aplicación SaaS para monotributistas que exportan servicios.',
        details: [
          'Monorepo TypeScript con una API NestJS/Fastify, una PWA en React y una app móvil con React Native y Expo.',
          'Trabajos en segundo plano con Redis y BullMQ, notificaciones Web Push y autohospedaje con Docker en el servidor de casa.',
        ],
        stack: ['TypeScript', 'NestJS', 'Fastify', 'React', 'React Native', 'Expo', 'PostgreSQL', 'Prisma', 'Redis', 'BullMQ'],
      },
      {
        id: 'jobradar',
        name: 'jobradar',
        summary: 'Un radar de búsqueda laboral para un hogar chico.',
        details: [
          'Junta avisos de APIs públicas de empleo y tableros ATS, extrae datos estructurados con Claude y puntúa cada aviso para cada persona según sus skills y variantes de CV, listo en un resumen diario.',
          'Claude Code corre sin interfaz y con todas las herramientas deshabilitadas, así el texto de un aviso no puede manipularlo. Las postulaciones se preparan, nunca se envían solas.',
        ],
        stack: ['Django 5', 'PostgreSQL 17', 'pgvector', 'Claude Code', 'Raspberry Pi'],
      },
      {
        id: 'home-server',
        name: 'Servidor en casa',
        summary: 'Una Raspberry Pi 5 encendida 24/7 que aloja los proyectos de arriba.',
        details: [
          '8 GB de RAM y un disco NVMe de 3,6 TB; migré el sistema de la tarjeta SD a arranque desde NVMe.',
          'Expuesta con Cloudflare Tunnel, con una app Django publicada en su propio subdominio.',
        ],
        stack: ['Raspberry Pi 5', 'Linux', 'Docker', 'Cloudflare Tunnel'],
        link: { label: 'projects.maumar.com.ar', href: 'https://projects.maumar.com.ar' },
      },
    ],
  },
  skills: {
    title: 'Habilidades',
    groups: [
      {
        id: 'frontend',
        name: 'Frontend',
        items: ['React', 'Next.js', 'TypeScript', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'TailwindCSS', 'React Native', 'Three.js', 'GSAP'],
      },
      {
        id: 'backend',
        name: 'Backend',
        items: ['Django (Python)', 'Django REST Framework', 'Celery', 'Ruby on Rails', 'Sidekiq', 'NestJS', 'Fastify', 'Java', 'Spring Boot', 'APIs REST', 'JWT', 'OAuth (Okta)'],
      },
      {
        id: 'data',
        name: 'Datos',
        items: ['PostgreSQL', 'PostGIS', 'MySQL', 'Prisma', 'Redis', 'BullMQ', 'Migraciones de datos en producción', 'Web scraping y automatización'],
      },
      {
        id: 'infra',
        name: 'Infraestructura',
        items: ['AWS', 'Heroku', 'Render', 'Docker', 'Docker Compose', 'Linux', 'Autohospedaje', 'Cloudflare Tunnel', 'Git y GitFlow', 'CI/CD con GitHub Actions'],
      },
      {
        id: 'testing',
        name: 'Testing',
        items: ['TDD', 'pytest', 'RSpec', 'Vitest', 'React Testing Library', 'Playwright', 'Cypress'],
      },
      {
        id: 'ai',
        name: 'IA',
        items: ['Integración de APIs de LLM (Claude)', 'Extracción de datos con modelos de visión', 'Moderación de texto', 'Claude Code', 'Codex', 'Prompt-Driven Development', 'Spec-Driven Development'],
      },
    ],
  },
  education: {
    title: 'Educación',
    degree: 'Ingeniería en Computación',
    school: 'Universidad Nacional de Tucumán (UNT)',
    period: '2019 – 2023',
    thesis:
      'Proyecto final: un sistema de gestión de clientes y servicios para un proveedor de internet, con Java y Spring Boot, React y MySQL.',
    languages: 'Español nativo; inglés avanzado (C1), de uso diario con equipos y clientes de EE.UU.',
  },
  contact: {
    title: 'Contacto',
    intro: 'La forma más rápida de contactarme es por email.',
    emailLabel: PERSON.email,
    links: [
      { label: 'GitHub', href: PERSON.github },
      { label: 'LinkedIn', href: PERSON.linkedin },
    ],
  },
  room: {
    enter: 'Ver la habitación 3D',
    exit: 'Ver CV / modo simple',
    label: 'Habitación 3D',
    loading: 'Preparando la habitación…',
    back: 'Volver',
    menu: 'Objetos de la habitación',
    lamp: 'Lámpara de escritorio',
    hint: 'Hacé clic en un objeto o elegí uno de esta lista.',
    hotspots: {
      monitor: 'Monitor: experiencia',
      bookshelf: 'Biblioteca: proyectos',
      whiteboard: 'Pizarra: habilidades',
      pi: 'Raspberry Pi: servidor casero',
      phone: 'Teléfono: contacto y CV',
      mug: 'Taza: formación',
      window: 'Ventana: vista',
    },
  },
};
