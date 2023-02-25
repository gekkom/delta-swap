/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/routes/**/*.{svelte,js,ts}'],
    plugins: [require("daisyui")],

    daisyui: {
      styled: true,
      themes: ["business"],
      base: true,
      utils: true,
      logs: true,
      rtl: false,
      prefix: "",
      darkTheme: "business",
    },
  }