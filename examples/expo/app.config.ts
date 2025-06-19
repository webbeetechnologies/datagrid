import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'TaylorDB',
    slug: 'taylordb',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.thetaung.expo-example',
        config: {
            usesNonExemptEncryption: false,
        },
    },
    android: {
        edgeToEdgeEnabled: true,
        adaptiveIcon: {
            foregroundImage: './assets/images/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        package: 'com.thetaung.expoexample',
    },
    web: {
        bundler: 'metro',
        output: 'static',
        favicon: './assets/images/favicon.png',
    },
    plugins: [
        'expo-router',
        [
            'expo-build-properties',
            {
                ios: {
                    deploymentTarget: '15.1',
                },
            },
        ],
        'expo-asset',
        'expo-font',
        'expo-web-browser',
    ],
    experiments: {
        typedRoutes: true,
    },
    extra: {
        router: {
            origin: false,
        },
    },
});
