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
        bg: '#FAF9F7',
        dark: '#0D0D0D',
        border: '#E5E2DB',
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', '"Barlow"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
