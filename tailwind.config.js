/** @type {import('tailwindcss').Config} */
module.exports = {
  // "media" (the default) makes NativeWind crash on web on first render:
  // its runtime tries to set the color scheme manually while the flag says
  // the strategy is media-only. "class" keeps native behaviour driven by
  // Appearance and gives web an explicit switch.
  darkMode: "class",
  // Tailwind scans only these files. A missing path means missing styles,
  // with no error to warn you about it.
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // --- Band 1: surfaces and text -----------------------------------
        // The page is a real colour, so cards must stay light: every data
        // cell lives on `surface`, never on `canvas`. On the page itself the
        // ramp loses its meaning (free-2 and busy sit at ~1.0 contrast).
        canvas: "#F7F9F7",
        surface: "#FFFFFF",
        "surface-subtle": "#F0F5F2",
        line: "#D4E2D8",
        "line-soft": "#E6EFEA",
        // 3.6:1 on the card. Controls need 3:1 (WCAG
        // 1.4.11); `line` above is decorative only.
        "line-strong": "#768C81",
        ink: {
          DEFAULT: "#162620",
          // 6.1:1 on the page and on the card.
          muted: "#4E6359",
          // 3.4:1 on the page: icons and the lightest text.
          faint: "#768C81",
          hover: "#205E46",
          pressed: "#10201A",
        },
        paper: "#FFFFFF",
        disabled: "rgba(22,38,32,0.38)",

        // --- Band 2/3: mint UI --------------------------------------------
        // light/soft: tints for badges, active tabs, selected rows.
        // deep/dark: solid actions, links, focus rings.
        // Never use these as a heatmap step.
        mint: {
          light: "#E8F7F0",
          soft: "#C8F0DC",
          DEFAULT: "#7FE0B8",
          deep: "#205E46",
          dark: "#133A2B",
        },

        // --- Peach. 5% of the surface, attention only ---------------------
        // Declines, conflicts, destructive actions, the 0%-free cell.
        // Never navigation, never a primary action.
        blush: {
          light: "#FFF1EB",
          soft: "#FED9CC",
          DEFAULT: "#FFC5AA",
          deep: "#8A3928",
          dark: "#6B271A",
        },

        // --- Band 4: data. Only inside the availability grid --------------
        // Share of confirmed people who are free. Steps are 7.6 / 9.9 / 25.7
        // L* apart, which is the smallest gap that survives a phone screen.
        // Tuned against the white card: those are the values the ramp is
        // specified against.
        free: { 1: "#BBF1D2", 2: "#8FE0B8", 3: "#5FC79A", 4: "#2A7F5F" },
        // 0% free. Same hue as blush on purpose: it is the attention colour.
        busy: { DEFAULT: "#FFC5AA", ink: "#8A3928" },
        // Slots blocked by the USOS import, not by the person.
        imported: { DEFAULT: "#E8EAE6", ink: "#55645C" },
        // Cell outlines per ramp step (palette.html): the border darkens with
        // the fill so cells stay readable when they sit side by side.
        "cell-line-busy": "#DFAF97",
        "cell-line-1": "#A5D5BA",
        "cell-line-2": "#7FC7A3",
        "cell-line-3": "#56B189",
        "cell-line-4": "#569A80",

        // Status dots in participant lists.
        success: "#205E46",
        danger: "#8A3928",
        scrim: "rgba(22,38,32,0.45)",
      },
      fontSize: {
        // Screen title, once per screen.
        display: ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
        title: ["20px", { lineHeight: "26px", letterSpacing: "-0.01em" }],
        subtitle: ["17px", { lineHeight: "24px" }],
        body: ["15px", { lineHeight: "22px" }],
        label: ["13px", { lineHeight: "18px" }],
        caption: ["11px", { lineHeight: "16px" }],
        // The N/M label inside a cell: 140x56 leaves room for one line only.
        num: ["12px", { lineHeight: "16px" }],
        "num-sm": ["9px", { lineHeight: "12px" }],
      },
      borderRadius: {
        // Cells stay square on purpose: rounding eats the grid lines.
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
