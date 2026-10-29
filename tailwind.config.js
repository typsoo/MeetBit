/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind scans only these files. A missing path means missing styles,
  // with no error to warn you about it.
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
