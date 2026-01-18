import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";

const enableCoverage = process.env.E2E_COVERAGE === "true";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// Istanbul instrumentation for E2E coverage
		...(enableCoverage
			? [
					istanbul({
						include: ["src/**/*.ts", "src/**/*.svelte"],
						exclude: ["node_modules", "**/*.test.ts", "**/*.spec.ts"],
						extension: [".ts", ".svelte"],
						requireEnv: false,
						forceBuildInstrument: true,
					}),
				]
			: []),
	],
	server: {
		fs: {
			// Allow serving files from convex directory
			allow: [".", "convex"],
		},
	},
});
