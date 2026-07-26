import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from './template.mjs';

/* A preview is published under a real business's brand on a URL that is not
   theirs. Without noindex + a canonical pointing at the preview itself, a
   full-fidelity mockup can be indexed as duplicate content and damage the
   prospect's own search presence, which is the opposite of the pitch. */
const PREVIEW_ORIGIN = process.env.PREVIEW_ORIGIN || '';
const isPreview = Boolean(PREVIEW_ORIGIN);

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });

/* Favicon: the station arch, drawn. Relative href in the markup so the client's
   tab never inherits another origin's icon. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="9" fill="#080D0C"/>
<path d="M14 46V25l7-6 11 0 11 6v21" fill="none" stroke="#D4F53C" stroke-width="6" stroke-linejoin="round"/>
<rect x="27" y="34" width="10" height="12" fill="#D4F53C"/>
</svg>`;
await writeFile(join(dist, 'favicon.svg'), favicon);

await writeFile(join(dist, 'index.html'), render({ noindex: isPreview, previewOrigin: PREVIEW_ORIGIN }));
if (isPreview) await writeFile(join(dist, '.nojekyll'), '');

await writeFile(
  join(dist, 'robots.txt'),
  isPreview
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\nSitemap: https://hyrox.is/sitemap.xml\n'
);

if (!isPreview) {
  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://hyrox.is/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`
  );
}

console.log(`built dist/index.html${isPreview ? ` [preview: noindex, ${PREVIEW_ORIGIN}]` : ''}`);
