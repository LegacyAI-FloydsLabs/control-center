import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	// When running under the Kernel at /agent-execution/, set base so
	// built assets reference the correct path.
	base: process.env.KERNEL_BASE || "/agent-execution/",
	plugins: [react(), tailwindcss()],
	server: {
		port: 9601,
		proxy: {
			"/api": "http://localhost:9600",
			"/ws/events": {
				target: "http://localhost:9600",
				ws: true,
				changeOrigin: true,
			},
			"/ws/": {
				target: "http://localhost:9600",
				ws: true,
				changeOrigin: true,
			},
			"/health": "http://localhost:9600",
		},
	},
	build: {
		outDir: "../dist/ui",
		emptyOutDir: true,
	},
});
