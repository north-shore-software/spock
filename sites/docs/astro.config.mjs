// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.spock.dev',
	server: { port: 4322 },
	integrations: [
		starlight({
			title: 'Spock',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/north-shore-software/spock' },
			],
			// One group per package. Pages in each are ordered by `sidebar.order` in their frontmatter.
			sidebar: [
				{ label: 'Start here', items: [{ slug: 'getting-started' }] },
				{ label: '@spock/router', items: [{ autogenerate: { directory: 'router' } }] },
				{ label: '@spock/toolbar', items: [{ autogenerate: { directory: 'toolbar' } }] },
			],
		}),
	],
});
