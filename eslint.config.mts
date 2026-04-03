import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		files: ["**/*.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
				createSpan: "readonly",
				createFragment: "readonly",
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
		rules: {
			"array-bracket-spacing": ["error", "never"],
			"comma-dangle": ["error", "always-multiline"],
			"comma-spacing": ["error", { before: false, after: true }],
			"eol-last": ["error", "always"],
			"keyword-spacing": ["error", { before: true, after: true }],
			"no-multi-spaces": "error",
			"no-trailing-spaces": "error",
			"object-curly-spacing": ["error", "always"],
			quotes: ["error", "double", { avoidEscape: true }],
			semi: ["error", "always"],
			"space-before-blocks": ["error", "always"],
			"spaced-comment": ["error", "always", { markers: ["/"] }],
		},
	},
	...obsidianmd.configs.recommended,
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
