/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // tmavé pozadí pro login / app
        ink: '#0a0a0a',
        panel: '#141414',
      },
    },
  },
  plugins: [],
}
