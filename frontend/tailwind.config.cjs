/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        halloween: "url('/images/background.jpg')",
      },
    },
  },
  plugins: [],
};
