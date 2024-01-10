import { ProvideMolecules, extendTheme } from '@bambooapp/bamboo-molecules';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const parameters = {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
};

const theme = extendTheme({
    colorMode: 'light',
});

export const decorators = [
    Story => (
        <ProvideMolecules theme={theme}>
            <GestureHandlerRootView style={{ flex: 1, alignItems: 'center' }}>
                <Story />
            </GestureHandlerRootView>
        </ProvideMolecules>
    ),
];
