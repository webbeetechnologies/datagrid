import { autoSizerCanvas } from './autoSizerCanvas';
import LRU from 'lru-cache';
import type { IWrapTextResultProps } from './types';

const fontCache: { [key: string]: LRU<string, number> } = {};
export const textDataCache = new LRU<string, IWrapTextResultProps>(500);

export const getTextWidth = (text: string, font: string) => {
    let width: number | undefined = 0;
    if (!text || typeof text !== 'string') {
        return width;
    }
    let cacheOfFont = fontCache[font];
    if (!cacheOfFont) {
        cacheOfFont = fontCache[font] = new LRU(500);
    }
    width = cacheOfFont.get(text);
    if (width == null) {
        autoSizerCanvas.setFont(font);

        width = autoSizerCanvas!.measureText(text).width;
        cacheOfFont.set(text, width);
    }

    return width;
};
