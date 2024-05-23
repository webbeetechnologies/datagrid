import { castToString } from './castToString';

/**
 * Check if its being rendered in Browser or SSR
 */
export const canUseDOM = !!(
    typeof window !== 'undefined' &&
    window.document &&
    window.document.createElement
);

/**
 * Simple Canvas element to measure text size
 *
 * Usage
 *
 * ```
 * const textSizer = new AutoSizer()
 * textSizer.measureText('Hello world').width
 * ```
 */
interface AutoSizerProps {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    lineHeight?: number;
    scale?: number;
}

type IOptions = {
    [key: string]: any;
};

export const AutoSizerCanvas = (defaults: AutoSizerProps = {}) => {
    const {
        fontFamily = 'Arial',
        fontSize = 12,
        fontWeight = '',
        fontStyle = '',
        lineHeight = 16,
        scale = 1,
    } = defaults;
    var o: IOptions = {
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        lineHeight,
        scale,
    };
    const canvas = canUseDOM && <HTMLCanvasElement>document.createElement('canvas');
    const context = canvas ? canvas.getContext('2d') : null;

    const setFont = (options: IOptions | string = {}) => {
        if (typeof options === 'string') {
            if (!context) return;
            context.font = options;

            return;
        }

        for (const key in options) {
            o[key] = options[key] ?? o[key];
        }
        if (context) {
            context.font = `${o.fontStyle} ${o.fontWeight} ${o.fontSize * o.scale}px ${
                o.fontFamily
            }`;
        }
    };
    const getWidthOfLongestText = (text: string | undefined) => {
        let width = 0;
        let height = 0;
        if (text === void 0) return { width, height };
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWidth = context?.measureText(line).width ?? 0;
            width = Math.max(width, lineWidth);
            height += o.fontSize * 1.2 * o.scale;
        }
        return { width: Math.ceil(width), height: Math.ceil(height) };
    };
    const measureText = (text: string | number) => getWidthOfLongestText(castToString(text));
    const reset = () => setFont(defaults);
    /* Set font in constructor */
    setFont(o);

    return {
        context,
        measureText,
        setFont,
        reset,
    };
};

/* Export a singleton */
export const autoSizerCanvas = AutoSizerCanvas();
