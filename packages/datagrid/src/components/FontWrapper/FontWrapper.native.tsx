import { FontsContext, FontsContextProvider } from '../../contexts';
import { useFonts } from '@shopify/react-native-skia';
import { type ReactNode, memo } from 'react';
import { View } from 'react-native';
import { registerCanvasContextBridge } from '../../canvas';
import { DataModule } from './types';

const FontProvider = memo(
    ({ children, sources }: { children: ReactNode; sources: Record<string, DataModule[]> }) => {
        const fonts = useFonts(sources);

        if (!fonts) return <View />;
        return <FontsContextProvider fonts={fonts}>{children}</FontsContextProvider>;
    },
);

registerCanvasContextBridge([FontsContext]);

export default FontProvider;
