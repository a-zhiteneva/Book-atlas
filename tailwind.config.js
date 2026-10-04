/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'map-0': '#e5e7eb',
        'map-1': '#a7f3d0',
        'map-2': '#34d399',
        'map-3': '#059669',
      },
    },
  },
  plugins: [],
};
