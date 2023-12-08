const bundlePlugins = ['@babel/plugin-proposal-export-namespace-from'];

module.exports = api => {
    api.cache(true);
    const presets = [['babel-preset-expo', { jsxRuntime: 'automatic' }]];

    const plugins = bundlePlugins;

    return {
        presets,
        plugins,
    };
};
