import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        card: "#13131a",
        line: "#23232d",
        ink: "#f5f5f7",
        sub: "#8a8a96",
        brand: "#fe2c55",
        accent: "#25f4ee",
      },
    },
  },
  plugins: [],
};
export default config;
