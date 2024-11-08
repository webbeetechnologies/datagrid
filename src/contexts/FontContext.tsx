import { SkTypefaceFontProvider } from '@shopify/react-native-skia';
import React, { createContext, memo, useContext } from 'react';

export const FontsContext = createContext<SkTypefaceFontProvider | null>(null);

export const useFontsContext = () => useContext(FontsContext);

export const FontsContextProvider = memo(
    ({ fonts, children }: { fonts: SkTypefaceFontProvider; children: React.ReactNode }) => {
        return <FontsContext.Provider value={fonts}>{children}</FontsContext.Provider>;
    },
);
