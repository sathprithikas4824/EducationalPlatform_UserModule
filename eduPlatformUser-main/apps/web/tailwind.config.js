// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [
//     "./app/**/*.{js,ts,jsx,tsx}",
//     "./components/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// };


import plugin from "tailwindcss/plugin.js";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // hc: variant — write `className="bg-white hc:bg-black"` to style for high contrast mode
    plugin(function ({ addVariant }) {
      addVariant("hc", '[data-high-contrast="true"] &');
    }),
  ],
};

export default config;
