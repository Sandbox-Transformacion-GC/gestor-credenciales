/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b6fd',
          400: '#608efa',
          500: '#3b6bf5',
          600: '#254dea',
          700: '#1d3cd6',
          800: '#1e33ad',
          900: '#1e2f89',
        },
      },
    },
  },
  plugins: [],
}
