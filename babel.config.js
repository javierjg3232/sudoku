module.exports = function (api) {
  api.cache(true);
  return {
    // unstable_transformImportMeta: zustand's ESM build uses `import.meta`,
    // which classic web scripts (and Hermes) cannot parse untransformed.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
