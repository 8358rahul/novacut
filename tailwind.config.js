/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#18181b',
        'surface-elevated': '#27272a',
        'surface-highlight': '#3f3f46',
        primary: {
          DEFAULT: '#00e5ff',
          dark: '#00b4d8',
          light: '#38bdf8',
        },
        accent: {
          DEFAULT: '#ff007a',
          rose: '#f43f5e',
        },
        gold: {
          DEFAULT: '#ffd700',
          amber: '#f59e0b',
        },
        emerald: {
          DEFAULT: '#10b981',
          light: '#34d399',
        },
        text: {
          DEFAULT: '#ffffff',
          muted: '#a1a1aa',
          dim: '#71717a',
        },
        border: {
          DEFAULT: '#27272a',
          light: '#3f3f46',
        },
      },
    },
  },
  plugins: [],
};

