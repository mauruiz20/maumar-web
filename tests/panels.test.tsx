import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { en } from '../src/content/en';
import { es } from '../src/content/es';
import { hotspotById } from '../src/room/hotspots';
import { PanelBody, panelTitle } from '../src/room/panels';

describe.each([
  ['en', en],
  ['es', es],
])('the home server panel in %s', (_, content) => {
  const what = hotspotById('pi').content;
  const name = content.projects.items.find((p) => p.id === 'home-server')!.name;
  const html = renderToStaticMarkup(createElement(PanelBody, { content, what, book: 'turnero', onBook: () => {} }));

  it('is titled with the project name', () => {
    expect(panelTitle(content, what)).toBe(name);
  });

  it('does not repeat the name under the title', () => {
    expect(html).not.toContain(`<h3>${name}</h3>`);
    expect(html).toContain(content.projects.items.find((p) => p.id === 'home-server')!.summary);
  });

  it('still names the selected project inside the bookshelf panel', () => {
    const shelf = renderToStaticMarkup(
      createElement(PanelBody, { content, what: hotspotById('bookshelf').content, book: 'turnero', onBook: () => {} }),
    );
    const turnero = content.projects.items.find((p) => p.id === 'turnero')!.name;
    expect(shelf).toContain(`<h3>${turnero}</h3>`);
  });
});
