/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        purple: { DEFAULT: '#8B5CF6', deep: '#6D28D9', light: '#A78BFA' },
        bg: '#0F172A',
        card: '#1E293B',
        border: '#334155',
        dim: '#94A3B8',
        accent: '#8B5CF6',
      }
    }
  },
  plugins: [],
};
