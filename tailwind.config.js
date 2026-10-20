/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tweak in M6 (tag-style) and M8 (due-tint)
        feature: '#10B981', // emerald
        bug: '#DC2626',     // crimson
      },
    },
  },
  plugins: [],
};
