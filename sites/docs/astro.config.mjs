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
			sidebar: [
				{ label: 'Start here', items: [{ slug: 'getting-started' }] },
				{ label: 'Packages', items: [{ autogenerate: { directory: 'packages' } }] },
			],
		}),
	],
});
