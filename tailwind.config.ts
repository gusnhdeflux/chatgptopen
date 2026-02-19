import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f19',
        card: '#121826',
        border: '#273248'
      },
      boxShadow: {
        soft: '0 8px 30px rgba(11, 15, 25, 0.35)'
      }
    }
  },
  darkMode: 'class',
  plugins: []
};

export default config;
