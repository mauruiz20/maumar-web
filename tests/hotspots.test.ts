import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../src/content/en';
import { es } from '../src/content/es';
import { BOOKS, DECOR, HOTSPOTS, OVERVIEW, hotspotById } from '../src/room/hotspots';

const PUBLIC = join(import.meta.dirname, '..', 'public');
const isVec3 = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));

describe('hotspots', () => {
  it('has exactly the clickable objects of the inventory', () => {
    expect(HOTSPOTS.map((h) => h.id).sort()).toEqual(
      ['bookshelf', 'monitor', 'mug', 'phone', 'pi', 'whiteboard'].sort(),
    );
  });

  it('keeps decoration and the lamp out of the hotspots', () => {
    expect(DECOR).toEqual(['lamp', 'window', 'plant', 'rug', 'frame']);
    for (const id of DECOR) expect(HOTSPOTS.some((h) => (h.id as string) === id)).toBe(false);
  });

  it('maps every hotspot to the content it shows', () => {
    expect(hotspotById('monitor').content).toEqual({ kind: 'experience' });
    expect(hotspotById('bookshelf').content).toEqual({ kind: 'projects', projects: ['turnero', 'monogestor', 'jobradar'] });
    expect(hotspotById('whiteboard').content).toEqual({ kind: 'skills' });
    expect(hotspotById('pi').content).toEqual({ kind: 'project', project: 'home-server' });
    expect(hotspotById('phone').content).toEqual({ kind: 'contact' });
    expect(hotspotById('mug').content).toEqual({ kind: 'education' });
  });

  it('has a camera view and a marker for each hotspot', () => {
    expect(isVec3(OVERVIEW.position) && isVec3(OVERVIEW.target)).toBe(true);
    for (const h of HOTSPOTS) {
      expect(isVec3(h.view.position), h.id).toBe(true);
      expect(isVec3(h.view.target), h.id).toBe(true);
      expect(isVec3(h.marker), h.id).toBe(true);
    }
  });

  it('puts one book on the shelf per project it shows', () => {
    expect(BOOKS.map((b) => b.project)).toEqual(['turnero', 'monogestor', 'jobradar']);
  });

  describe.each([
    ['en', en],
    ['es', es],
  ])('in %s', (_, content) => {
    const projectIds = content.projects.items.map((p) => p.id);

    it('labels every hotspot and room control', () => {
      for (const h of HOTSPOTS) expect(content.room.hotspots[h.id].trim(), h.id).not.toBe('');
      for (const value of [content.room.enter, content.room.exit, content.room.label, content.room.loading,
        content.room.back, content.room.menu, content.room.lamp, content.room.hint]) {
        expect(value.trim()).not.toBe('');
      }
    });

    it('references projects that exist', () => {
      for (const h of HOTSPOTS) {
        if (h.content.kind === 'projects') for (const id of h.content.projects) expect(projectIds).toContain(id);
        if (h.content.kind === 'project') expect(projectIds).toContain(h.content.project);
      }
    });

    it('links a CV that exists for the phone', () => {
      expect(content.ui.cvHref.startsWith(`/cv/${content.lang}/`)).toBe(true);
      expect(existsSync(join(PUBLIC, content.ui.cvHref))).toBe(true);
    });
  });

  it('localizes the room controls', () => {
    expect(en.room.exit).toBe('View CV / simple mode');
    expect(es.room.exit).toBe('Ver CV / modo simple');
    expect(en.room.enter).toBe('View the 3D room');
    expect(es.room.enter).toBe('Ver la habitación 3D');
  });
});
