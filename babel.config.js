module.exports = function (api) {
  api.cache(true);
  return {
    // unstable_transformImportMeta: zustand's ESM build references import.meta.env,
    // which is a fatal SyntaxError in Metro's classic-script web bundle.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
