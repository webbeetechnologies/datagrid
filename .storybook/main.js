module.exports = {
    stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],
    addons: [
        '@storybook/addon-links',
        '@storybook/addon-essentials',
        '@storybook/addon-interactions',
        {
            name: '@storybook/addon-react-native-web',
            options: {},
        },
    ],
    features: {
        interactionsDebugger: true,
    },
    framework: '@storybook/react',
    core: { builder: 'webpack5' },
    webpackFinal: async (config) => {
        // Provide fallback for Node.js modules
        config.resolve.fallback = {
            ...(config.resolve.fallback || {}),
            fs: false, // Ignore the 'fs' module
        };

        return config;
    },
};
