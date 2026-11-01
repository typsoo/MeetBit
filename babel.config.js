module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Keeps React Compiler and other Expo defaults working.
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
