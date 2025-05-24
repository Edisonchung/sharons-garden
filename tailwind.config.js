/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",           // Optional if you use the /app directory (Next.js 13+)
  ],
  darkMode: 'class',                         // Enables class-based dark mode (recommended)
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        fancy: ['"Pacifico"', 'cursive'],   // Example of a decorative font
      },
      colors: {
        primary: {
          DEFAULT: '#9333ea',               // Purple
          light: '#c084fc',
          dark: '#6b21a8',
        },
        accent: {
          DEFAULT: '#ec4899',               // Pink
          light: '#f9a8d4',
          dark: '#be185d',
        },
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        fancy: '0 4px 20px rgba(147, 51, 234, 0.2)',
      },
      keyframes: {
        'badge-pop': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'badge-pop': 'badge-pop 0.4s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),           // Optional: better form styling
    require('@tailwindcss/typography'),      // Optional: prose styles for reflections or stories
    require('@tailwindcss/aspect-ratio'),    // Optional: handle image/video aspect ratios
  ],
}
