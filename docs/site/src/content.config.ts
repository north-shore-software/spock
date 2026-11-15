import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// The pages are the markdown files in docs/, one level up; this folder (site/) is only
// the tooling. Same rules as Starlight's own loader: files starting with `_` are skipped.
export const collections = {
	docs: defineCollection({
		loader: glob({ base: '..', pattern: ['**/[^_]*.{md,mdx}', '!site/**'] }),
		schema: docsSchema(),
	}),
};
