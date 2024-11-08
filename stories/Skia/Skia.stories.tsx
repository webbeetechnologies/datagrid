import { View, Text } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
// import { version } from 'canvaskit-wasm/package.json';

export const SkiaExample = () => {
    return (
        <View>
            <WithSkiaWeb
                // import() uses the default export of MySkiaComponent.tsx
                opts={{
                    locateFile: file =>
                        `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${'0.39.1'}/bin/full/${file}`,
                }}
                getComponent={() => import('./SkiaExample')}
                fallback={<Text>Loading Skia...</Text>}
            />
        </View>
    );
};

export default {
    title: 'Skia',
    component: SkiaExample,
};
