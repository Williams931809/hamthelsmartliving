import { writeFile } from 'node:fs/promises';
import marketplaceHtml from '../lib/marketplace-html.ts';

await writeFile(new URL('../public/index.html', import.meta.url), marketplaceHtml);
