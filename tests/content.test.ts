import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../src/content/en';
import { es } from '../src/content/es';

const SRC = join(import.meta.dirname, '..', 'src');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('content parity', () => {
  it('has the same number of jobs and bullets per job', () => {
    expect(es.experience.jobs.length).toBe(en.experience.jobs.length);
    en.experience.jobs.forEach((job, i) => {
      expect(es.experience.jobs[i]!.highlights.length).toBe(job.highlights.length);
    });
  });

  it('has the same projects, with the same number of details', () => {
    expect(es.projects.items.map((p) => p.id)).toEqual(en.projects.items.map((p) => p.id));
    en.projects.items.forEach((p, i) => {
      expect(es.projects.items[i]!.details.length).toBe(p.details.length);
      expect(es.projects.items[i]!.stack).toEqual(p.stack);
    });
  });

  it('has the same skill groups with the same number of items', () => {
    expect(es.skills.groups.length).toBe(en.skills.groups.length);
    en.skills.groups.forEach((g, i) => {
      expect(es.skills.groups[i]!.items.length).toBe(g.items.length);
    });
  });

  it('declares its own language and points at the other one', () => {
    expect(en.lang).toBe('en');
    expect(es.lang).toBe('es');
    expect(en.meta.path).toBe('/');
    expect(es.meta.path).toBe('/es/');
  });
});

describe('content guard', () => {
  const contents = [en, es];
  const strings = contents.flatMap(allStrings);

  it.each([
    ['Go', /\bGo\b/],
    ['Azure', /azure/i],
    ['.NET', /\.net\b/i],
    ['Terraform', /terraform/i],
    ['Kubernetes', /kubernetes|\bk8s\b/i],
    ['GraphQL', /graphql/i],
  ])('never claims %s', (_, pattern) => {
    expect(strings.filter((s) => pattern.test(s))).toEqual([]);
  });

  it('never mentions Node.js in experience', () => {
    for (const content of contents) {
      const text = allStrings(content.experience).join('\n');
      expect(text).not.toMatch(/node(\.js)?\b/i);
    }
  });

  it('never contains a phone number anywhere in src/', () => {
    for (const file of filesUnder(SRC)) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/\+\s*54/);
      expect(text, file).not.toMatch(/3863/);
    }
  });

  it('never links jobradar.maumar.com.ar', () => {
    for (const file of filesUnder(SRC)) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/jobradar\.maumar/);
    }
  });
});
