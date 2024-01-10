module.exports = api => ({
    extends: '../babel.config.js',
    plugins: [
        '@babel/plugin-transform-modules-commonjs',
    ],
})