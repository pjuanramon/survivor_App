/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00FF9D", // Verde Neón Survivor
        background: "#0A0A0A", // Negro Profundo
        surface: "#1A1A1A", // Gris Oscuro para tarjetas
        muted: "#888888",
      },
    },
  },
  plugins: [],
}
