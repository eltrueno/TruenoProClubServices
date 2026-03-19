const colors = require('tailwindcss/colors')
/** @type {import('tailwindcss').Config} */
export default {
	content: {
		files: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}', './node_modules/vue-tailwind-datepicker/**/*.js']
	},
	theme: {
		extend: {
			scale: {
				'115': '1.15'
			},
			fontSize: {
				'xxs': '0.5rem',
				'10xl': '12rem',
				'11xl': '13rem',
				'12xl': '14rem',
				'13xl': '15rem',
				'14xl': '16rem',
				'15xl': '18rem',
				'16xl': '20rem',
			},
			colors: {
				...colors,
				'vtd-primary': {
					'50': "#C80D0D",
					'100': "#C80D0D",
					'200': "#C80D0D",
					'300': "#C80D0D",
					'400': "#C80D0D",
					'500': "#C80D0D",
					'600': "#C80D0D",
					'700': "#C80D0D",
					'800': "#C80D0D",
					'900': "#C80D0D",
					'950': "#C80D0D",
				},
				'vtd-secondary': {
					'50': "#f9fafb",
					'100': "#A6ADBB",
					'200': "#e5e7eb",
					'300': "#d1d5db",
					'400': "#9ca3af",
					'500': "#6b7280",
					'600': "#4b5563",
					'700': "#374151",
					'800': "#1D232A",
					'900': "#111827",
					'950': "#030712"
				},
			}
		}
	},
	plugins: [require("@tailwindcss/typography"), require("daisyui")],
	daisyui: {
		themes: [
			{
				light: {
					...require("daisyui/src/theming/themes")["light"],
					primary: "#C80D0D",
					secondary: "#0037ff"
				},
				dark: {
					...require("daisyui/src/theming/themes")["dark"],
					primary: "#C80D0D",
					secondary: "#0037ff"
				},
			}
		],
	},
	safelist: [
		{
			pattern: /bg-(base|primary)-(100|200|300)/
		},
		{
			pattern: /(bg|text|border)-vtd-(primary|secondary)-(50|100|200|300|400|500|600|700|800|900|950)/
		}
	]
}
