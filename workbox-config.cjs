module.exports = {
  globDirectory: "public",
  globPatterns: ["**/*.{svg,png,dds,js,css,wasm,drc}"],
  swDest: "public/sw.js",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
};
