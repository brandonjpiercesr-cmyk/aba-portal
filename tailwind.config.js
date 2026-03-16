/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        card: '#111118',
        border: '#1e1e2e',
        dim: '#666',
        accent: '#6366f1',
      }
    }
  },
  plugins: [],
};
