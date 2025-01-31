import { useFonts } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { View } from 'react-native';

import { FontsContext, FontsContextProvider } from '../../contexts/FontContext';
import { registerCanvasContextBridge } from '../../canvas';
import { DataModule } from './types';

const FontProvider = memo(
    ({
        children,
        sources,
    }: {
        children: React.ReactNode;
        sources: Record<string, DataModule[]>;
    }) => {
        const fonts = useFonts(sources);

        if (!fonts) return <View />;
        return <FontsContextProvider fonts={fonts}>{children}</FontsContextProvider>;
    },
);

registerCanvasContextBridge([FontsContext]);

export default FontProvider;
