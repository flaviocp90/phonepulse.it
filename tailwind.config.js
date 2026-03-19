/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF5C1A',
        'primary-dark': '#E04A0F',
        bg: '#F5F4F1',
        dark: '#0D0D0D',
        border: '#E2DFD8',
        surface: '#FFFFFF',
        'text-muted': '#6B6560',
      },
      fontFamily: {
        heading: ['"Bebas Neue"', 'sans-serif'],
        body: ['"Figtree"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
