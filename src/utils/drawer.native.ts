// KonvaDrawerSkia.ts

import GraphemeSplitter from 'grapheme-splitter';
import { imageCache } from './image-cache';
import type {
    ICtxStyleProps,
    IImageProps,
    ILabelProps,
    ILineProps,
    IRectProps,
    ITextEllipsisProps,
    ITextProps,
    IWrapTextProps,
    GridColors,
    GridConstants,
} from './types';
import type { SkCanvas, SkRect, SkRRect } from '@shopify/react-native-skia';
import { SkFont, Skia, PaintStyle, ClipOp, matchFont } from '@shopify/react-native-skia';
import { IconPacks } from '../components/Grid/CanvasIcon';
import { resolveContrastColor } from '@bambooapp/bamboo-molecules';

const extractFirstAndSecondWordArrays = (text: string) => {
    const [firstWord, secondWord = []] = text
        .split(' ')
        .splice(0, 2)
        .map(word => Array.from(word ?? ''));

    return {
        firstWord,
        secondWord,
    };
};

const getAvatarLabel = (name: string) => {
    const { firstWord, secondWord } = extractFirstAndSecondWordArrays(name || '');

    return `${firstWord.at(0) || ''}${secondWord.at(0) || firstWord.at(1) || ''}`;
};

export const graphemeSplitter = new GraphemeSplitter();

const DEFAULT_FONT_FAMILY = `Roboto`;

const binarySearchMaxTextIndex = ({
    max,
    getValue,
    match,
}: {
    max: number;
    getValue: (guess: number) => number;
    match: number;
}) => {
    let min = 0;

    while (min <= max) {
        const guess = Math.floor((min + max) / 2);
        const compareVal = getValue(guess);

        if (compareVal === match) return guess;
        if (compareVal < match) min = guess + 1;
        else max = guess - 1;
    }

    return max;
};

/**
 * Some business methods based on the Skia Canvas API wrapper
 */
export class CanvasDrawer {
    // @ts-ignore
    canvas: SkCanvas;
    needDraw = false;
    colors: GridColors = {
        textColor: '#1b1b1f',
        avatarLabelColor: '#fff',
        avatarBg: '#5c6ae7',
        backgroundColor: '#fff',
        lines: '#c7c5d0',
        white: '#fff',
        lowestBg: '',
        rowSelectedBg: '#f5f5f5',
        warnLight: '',
        cellSelectedColorSolid: '',
        textColorLight: '#fff',
        textColorDark: '#000',
    };
    constants: GridConstants = {
        scale: 1,
        groupCount: 0,
        fonts: null,
    };

    // Paint objects for styling
    fillPaint = Skia.Paint();
    strokePaint = Skia.Paint();

    // font: SkFont = this.constants.fonts
    //     ? matchFont(
    //           {
    //               fontFamily: DEFAULT_FONT_FAMILY,
    //               fontSize: 13,
    //           },
    //           this.constants.fonts,
    //       )
    //     : undefined;
    public font: SkFont = this.constants.fonts;

    public initCtx(
        canvas: SkCanvas,
        colors?: Partial<GridColors> & Record<string, any>,
        constants?: GridConstants,
    ) {
        this.needDraw = Boolean(canvas);
        this.canvas = canvas;

        if (colors) this.setColors(colors);
        if (constants) this.setConstants(constants);
    }

    public setColors(colors: Partial<GridColors> & Record<string, any>) {
        this.colors = {
            ...this.colors,
            ...colors,
        };
    }

    public setConstants(constants: Partial<GridConstants>) {
        this.constants = {
            ...this.constants,
            ...constants,
        };
    }

    public setStyle(props: ICtxStyleProps) {
        const { fontSize = 13, fontWeight = 'normal', fillStyle, strokeStyle, fontFamily } = props;

        // Configure Paint for fill
        if (fillStyle) {
            this.fillPaint.setColor(Skia.Color(fillStyle));
            this.fillPaint.setStyle(PaintStyle.Fill);
        }

        // Configure Paint for stroke
        if (strokeStyle) {
            this.strokePaint.setColor(Skia.Color(strokeStyle));
            this.strokePaint.setStyle(PaintStyle.Stroke);
            this.strokePaint.setStrokeWidth(1);
        }

        // Configure Font
        // const skFontStyle = FontStyle.Normal;
        if (fontWeight === 'bold') {
            // Skia's FontStyle can be adjusted for bold
            // You might need to use different font files for different weights
        }

        this.font = matchFont(
            {
                fontFamily: fontFamily || DEFAULT_FONT_FAMILY,
                fontSize,
                fontStyle: 'normal',
                fontWeight: 'normal',
            },
            this.constants.fonts,
        );
        // this.font = this.constants.fonts;
    }

    public numberWithScale(value: number) {
        return value * this.constants.scale;
    }

    public getTextWidth(text: string, _font: string = '') {
        return this.font.measureText(text).width;
    }

    public textEllipsis(props: ITextEllipsisProps) {
        const { text, maxWidth, fontSize = 13, fontWeight = 'normal' } = props;

        if (text == null)
            return {
                text: '',
                textWidth: 0,
                isEllipsis: false,
            };
        // const fontStyle = `${fontWeight} ${this.numberWithScale(
        //     fontSize,
        // )}px ${DEFAULT_FONT_FAMILY}`;

        this.font = matchFont(
            {
                fontFamily: DEFAULT_FONT_FAMILY,
                fontSize,
                fontWeight: fontWeight as any,
                fontStyle: 'normal',
            },
            this.constants.fonts,
        );

        // this.font = this.constants.fonts;

        if (!maxWidth) {
            const textWidth = this.font.measureText(text).width;
            return {
                text,
                textWidth,
                isEllipsis: false,
            };
        }

        const ellipsis = '…';

        const textWidth = this.font.measureText(text).width;
        const ellipsisWidth = this.font.measureText(ellipsis).width;

        if (textWidth <= maxWidth || textWidth <= ellipsisWidth) {
            return {
                text,
                textWidth: textWidth,
                isEllipsis: false,
            };
        }

        const index = binarySearchMaxTextIndex({
            max: text.length,
            getValue: guess => this.font.measureText(text.substring(0, guess)).width,
            match: maxWidth - ellipsisWidth,
        });

        return {
            text: text.substring(0, index) + ellipsis,
            textWidth: maxWidth,
            isEllipsis: true,
        };
    }

    public line(props: ILineProps) {
        const { x, y, points, stroke, closed = false } = props;

        // Create a new path
        const path = Skia.Path.Make();

        // Move to starting point
        path.moveTo(x + points[0], y + points[1]);

        // Add line segments
        for (let n = 2; n < points.length; n += 2) {
            path.lineTo(x + points[n], y + points[n + 1]);
        }

        // Close path if needed
        if (closed) {
            path.close();
        }

        // Set stroke style
        if (stroke) {
            this.strokePaint.setColor(Skia.Color(stroke));
            this.strokePaint.setStyle(PaintStyle.Stroke);
        }

        // Draw path
        this.canvas.drawPath(path, this.strokePaint);
    }

    public rect(props: IRectProps) {
        const {
            x,
            y,
            width: _width,
            height: _height,
            radius,
            fill,
            stroke,
            // shadowBlur,
            // shadowColor,
            // shadowOffset,
        } = props;

        const width = Math.max(0, _width);
        const height = Math.max(0, _height);

        // Create a rect
        let rectShape: SkRect | SkRRect;

        if (!radius) {
            rectShape = { x, y, width, height };
        } else {
            let radii;
            if (typeof radius === 'number') {
                radii = {
                    tl: radius,
                    tr: radius,
                    br: radius,
                    bl: radius,
                };
            } else {
                // Array of radii
                radii = {
                    tl: radius[0] || 0,
                    tr: radius[1] || 0,
                    br: radius[2] || 0,
                    bl: radius[3] || 0,
                };
            }

            rectShape = Skia.RRectXY(Skia.XYWHRect(x, y, width, height), radii.tl, radii.tr);
        }

        // Set paints
        const paint = Skia.Paint();

        // Set fill style
        if (fill) {
            paint.setColor(Skia.Color(fill));
            paint.setStyle(PaintStyle.Fill);
            if (radius) {
                this.canvas.drawRRect(rectShape as SkRRect, paint);
            } else {
                this.canvas.drawRect(rectShape as SkRect, paint);
            }
        }

        // Set stroke style
        if (stroke) {
            paint.setColor(Skia.Color(stroke));
            paint.setStyle(PaintStyle.Stroke);
            paint.setStrokeWidth(1);

            if (radius) {
                this.canvas.drawRRect(rectShape as SkRRect, paint);
            } else {
                this.canvas.drawRect(rectShape as SkRect, paint);
            }
        }

        // Shadows are not directly supported in Skia; you may need to handle this differently or implement a shadow effect manually
    }

    public wrapText(props: IWrapTextProps) {
        const {
            x,
            y,
            text,
            maxWidth,
            lineHeight,
            maxRow = 1,
            fontSize: _fontSize = 13,
            fillStyle = this.colors.textColor,
            // textAlign = 'left',
            // verticalAlign = 'top',
            fontWeight = 'normal',
            // textDecoration = 'none',
            // originValue = [],
            // isLinkSplit = false,
            // fieldType,
            // needDraw = false,
            // favicon,
        } = props;

        // Implementation would need to be adjusted for Skia
        // Skia does not support text wrapping out of the box
        // You may need to implement text wrapping logic manually, measure text, and adjust positions accordingly

        // For simplicity, here's a basic implementation:

        const fontSize = this.numberWithScale(_fontSize);

        this.setStyle({ fontSize, fontWeight, fillStyle });

        // Split text into lines based on maxWidth
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const testWidth = this.font.measureText(testLine).width;
            if (maxWidth && testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
                if (lines.length >= maxRow) break;
            } else {
                line = testLine;
            }
        }
        if (lines.length < maxRow) lines.push(line);

        // Draw text lines
        for (let i = 0; i < lines.length; i++) {
            const adjustedY = y + i * lineHeight;
            this.canvas.drawText(lines[i], x, adjustedY, this.fillPaint, this.font);
        }
    }

    public text(props: ITextProps) {
        const {
            x,
            y,
            text,
            fontSize: _fontSize = 14,
            fontFamily = DEFAULT_FONT_FAMILY,
            fillStyle = this.colors.textColor,
            textAlign = 'left',
            verticalAlign = 'top',
            fontWeight = 'normal',
            textDecoration = 'none',
        } = props;
        const fontSize = this.numberWithScale(_fontSize);

        this.setStyle({ fontSize, fontFamily, fillStyle, fontWeight });

        // Get font metrics for vertical alignment
        const metrics = this.font.getMetrics();
        let adjustedY = y;
        if (verticalAlign === 'middle') {
            adjustedY += (-metrics.ascent + metrics.descent) / 2;
        } else if (verticalAlign === 'bottom') {
            adjustedY += -metrics.ascent + metrics.descent;
        } else {
            adjustedY += -metrics.ascent;
        }

        // Measure text width for horizontal alignment
        const textWidth = this.font.measureText(text).width;
        let adjustedX = x;
        if (textAlign === 'center') {
            adjustedX -= textWidth / 2;
        } else if (textAlign === 'right') {
            adjustedX -= textWidth;
        }

        // Draw text
        this.canvas.drawText(text, adjustedX, adjustedY, this.fillPaint, this.font);

        // Handle text decoration (underline)
        if (textDecoration === 'underline') {
            this.line({
                x: adjustedX,
                y: adjustedY + metrics.descent,
                points: [0, 0, textWidth, 0],
                stroke: fillStyle,
            });
        }
    }

    public async image(props: IImageProps, crossOrigin?: boolean) {
        const { x, y, url, width: _width, height: _height, opacity = 1, clipFunc } = props;
        const width = Math.max(0, _width);
        const height = Math.max(0, _height);

        // @ts-ignore
        if ({}) return;

        if (!url) {
            return;
        }

        // Load the image
        let image = imageCache.getImage(url);
        if (!image) {
            // You need to load the image data as Skia Image
            return imageCache.loadImage(url, url, { crossOrigin });
        }
        // @ts-ignore
        const skiaImage = Skia.Image.MakeImageFromEncoded(image);
        if (skiaImage) {
            // @ts-ignore
            imageCache.setImage(url, skiaImage);
            // @ts-ignore
            image = skiaImage;
        } else {
            // Handle image loading failure
            return;
        }

        // Create a paint object
        const paint = Skia.Paint();
        paint.setAlphaf(opacity);

        this.canvas.save();

        if (clipFunc) {
            // Create a clip path
            const clipPath = Skia.Path.Make();
            clipFunc(clipPath);

            // Apply clip
            this.canvas.clipPath(clipPath, ClipOp.Intersect, true);
        }

        // Draw image
        const destRect = { x, y, width, height };
        // @ts-ignore
        this.canvas.drawImageRect(image, undefined, destRect, paint);

        this.canvas.restore();
    }

    public label(props: ILabelProps): { width: number; height: number } {
        const {
            x,
            y,
            width,
            height,
            text,
            radius,
            background,
            color = this.colors.textColor,
            fontSize: _fontSize = 13,
            textAlign = 'left',
            verticalAlign = 'top',
            fontWeight = 'normal',
            padding = 0,
            stroke,
        } = props;
        const fontSize = this.numberWithScale(_fontSize);

        this.rect({
            x,
            y,
            width,
            height,
            radius,
            fill: background,
            stroke,
        });

        let textOffsetX = padding;

        if (textAlign === 'center') {
            textOffsetX = width / 2;
        } else if (textAlign === 'right') {
            textOffsetX = width - padding;
        }
        this.text({
            x: x + textOffsetX,
            y: y + (height - fontSize) / 2,
            text,
            fillStyle: color,
            fontSize: _fontSize,
            textAlign,
            verticalAlign,
            fontWeight,
        });

        return {
            width,
            height,
        };
    }

    public async avatar(props: {
        x: number;
        y: number;
        url: string;
        bgColor: string;
        id: string;
        title: string;
        size: number;
        opacity: number;
        isGzip?: boolean;
    }) {
        const { x = 0, y = 0, id, url: _url, title, bgColor, size = 20, opacity = 1 } = props;

        if (title == null || id == null) return;

        const avatarSrc = _url || '';
        const avatarName = getAvatarLabel(title);
        const avatarBg = bgColor || this.colors.avatarBg;
        const labelColor = resolveContrastColor(
            avatarBg,
            this.colors.textColorDark,
            this.colors.textColorLight,
        );

        const radius = size / 2;
        if (!avatarSrc) {
            // Draw circle
            const paint = Skia.Paint();
            paint.setColor(Skia.Color(avatarBg));
            this.canvas.drawCircle(x + radius, y + radius, radius, paint);

            // Draw text
            this.text({
                x: x + radius,
                y: y + radius,
                textAlign: 'center',
                verticalAlign: 'middle',
                text: avatarName,
                fillStyle: labelColor,
                fontSize: 10,
            });
            return;
        }

        // Draw image
        await this.image({
            x,
            y,
            url: avatarSrc,
            width: size,
            height: size,
            opacity,
            clipFunc: (clipPath: any) => {
                clipPath.addCircle(x + radius, y + radius, radius);
            },
        });
    }

    public fontIcon({
        size = 24,
        type = IconPacks.MaterialCommunity,
        x,
        y,
        text,
        color = this.colors.textColor,
        textAlign = 'left',
        verticalAlign = 'top',
        fontWeight = 'normal',
    }: Omit<ITextProps, 'fillStyle' | 'fontFamily'> & {
        color?: string;
        size?: number;
        type?: string;
    }) {
        this.text({
            x,
            y,
            text,
            fillStyle: color,
            fontFamily: type,
            fontWeight,
            fontSize: size,
            textAlign,
            verticalAlign,
        });
    }

    public path(props: {
        x: number;
        y: number;
        data: string;
        size?: number;
        scaleX?: number;
        scaleY?: number;
        fill: string;
    }) {
        const { x, y, data, scaleX = 1, scaleY = 1, fill } = props;

        // Create a path from SVG string
        const path = Skia.Path.MakeFromSVGString(data);

        if (path) {
            // Apply transformations
            const transform = Skia.Matrix();
            transform.translate(x, y);
            transform.scale(scaleX, scaleY);
            path.transform(transform);

            // Set paint
            const paint = Skia.Paint();
            paint.setColor(Skia.Color(fill));
            paint.setStyle(PaintStyle.Fill);

            // Draw path
            this.canvas.drawPath(path, paint);
        }
    }
}
