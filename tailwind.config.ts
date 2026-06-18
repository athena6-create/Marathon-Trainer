import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2421",
        moss: "#2f5f53",
        clay: "#b76545",
        cream: "#f6f1e8",
        oat: "#e7ddce",
        sage: "#dce8df",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(54, 45, 35, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
