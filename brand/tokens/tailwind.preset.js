// Tailwind v3 preset. In tailwind.config.js:  presets: [require("./brand/tokens/tailwind.preset.js")]
// Tailwind v4: use tokens.css directly, or map the CSS variables in an @theme block (see README).
module.exports = {
  theme: {
    extend: {
      colors: {
        spock: {
          blue: "#3D5AFE",
          "blue-deep": "#2A3FD1",
          "blue-200": "#CFD6FF",
          mist: "#F4F6FF",
          ink: "#141420",
          slate: "#5A5A6E",
          line: "#E6E8F0",
          paper: "#FFFFFF",
          amber: "#FFB020",
        },
      },
      fontFamily: {
        display: ["Comfortaa", "ui-rounded", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        display: ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["2.75rem", { lineHeight: "1.1", fontWeight: "600" }],
        h3: ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["1.125rem", { lineHeight: "1.6" }],
      },
      borderRadius: { sm: "10px", md: "14px", lg: "20px", xl: "24px" },
    },
  },
};
