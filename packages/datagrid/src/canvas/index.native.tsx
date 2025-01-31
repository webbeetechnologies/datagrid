import React, {
    forwardRef,
    memo,
    RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
} from 'react';
import {
    Path,
    Skia,
    PaintStyle,
    StrokeCap,
    StrokeJoin,
    Rect as SkRect,
    SkCanvas,
    Picture,
    createPicture,
    Group as SkiaGroup,
    Canvas,
    GroupProps as SkiaGroupProps,
    TextAlign,
    FontWeight,
    Paragraph,
    SkParagraph,
    useCanvasRef,
} from '@shopify/react-native-skia';
import {
    GestureResponderEvent,
    StyleProp,
    StyleSheet,
    useWindowDimensions,
    ViewStyle,
} from 'react-native';
import { FontsContext, useFontsContext } from '../contexts/FontContext';
import { createContextBridge } from '@bambooapp/bamboo-molecules/context-bridge';
import { EventObject, gridEventEmitter } from '../utils/reversed-eventemitter';
import { useLatest } from '@bambooapp/bamboo-molecules';

interface StageProps {
    width?: number;
    height?: number;
    style?: ViewStyle;
    children: React.ReactNode;
    scrollPositionRef?: RefObject<{ scrollTop: number; scrollLeft: number }>;
}
export const _Stage = memo(
    forwardRef(({ width, height, style, children, scrollPositionRef }: StageProps, _ref: any) => {
        const { width: screenWidth, height: screenHeight } = useWindowDimensions();
        const ref = useCanvasRef();

        const canvasStyle = useMemo(
            () =>
                StyleSheet.flatten([
                    style,
                    {
                        width: width || screenWidth,
                        height: height || screenHeight,
                    },
                ]),
            [height, screenHeight, screenWidth, style, width],
        );

        const onTouchStart = useCallback(
            (e: GestureResponderEvent) => {
                const { locationX: x, locationY: y } = e.nativeEvent.touches[0];
                gridEventEmitter.emit('touch', {
                    x: x + (scrollPositionRef?.current?.scrollLeft ?? 0),
                    y: y + (scrollPositionRef?.current?.scrollTop ?? 0),
                });
            },
            [scrollPositionRef],
        );

        useImperativeHandle(_ref, () => ref.current);

        return (
            <Canvas ref={ref} style={canvasStyle as StyleProp<any>} onTouchStart={onTouchStart}>
                <>{children}</>
            </Canvas>
        );
    }),
);

export const { BridgedComponent: Stage, registerContextToBridge: registerCanvasContextBridge } =
    createContextBridge('canvas-context-bridge', _Stage);

type LineProps = {
    points: number[]; // Array of x and y coordinates, e.g., [x1, y1, x2, y2, x3, y3, ...]
    stroke?: string; // Stroke color
    strokeWidth?: number; // Stroke width
    lineCap?: 'butt' | 'round' | 'square'; // Line cap style
    lineJoin?: 'miter' | 'round' | 'bevel'; // Line join style
    dash?: number[]; // Dash pattern
};

export const Line = memo(
    ({
        points,
        stroke = '#000',
        strokeWidth = 1,
        lineCap = 'butt',
        lineJoin = 'miter',
        dash,
    }: LineProps) => {
        const path = Skia.Path.Make();

        if (points.length >= 2) {
            path.moveTo(points[0], points[1]);

            for (let i = 2; i < points.length; i += 2) {
                path.lineTo(points[i], points[i + 1]);
            }
        }

        const paint = Skia.Paint();
        paint.setColor(Skia.Color(stroke));
        paint.setStrokeWidth(strokeWidth);
        paint.setStyle(PaintStyle.Stroke);
        paint.setStrokeCap(lineCapMap[lineCap]);
        paint.setStrokeJoin(lineJoinMap[lineJoin]);

        if (dash && dash.length > 0) {
            paint.setPathEffect(Skia.PathEffect.MakeDash(dash, 0));
        }

        return <Path path={path} paint={paint} />;
    },
);

const lineCapMap: { [key: string]: number } = {
    butt: StrokeCap.Butt,
    round: StrokeCap.Round,
    square: StrokeCap.Square,
};

const lineJoinMap: { [key: string]: number } = {
    miter: StrokeJoin.Miter,
    round: StrokeJoin.Round,
    bevel: StrokeJoin.Bevel,
};

type TextProps = {
    x: number;
    y: number;
    width?: number;
    height?: number;
    text: string;
    fontSize?: number;
    fill?: string;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    onClick?: OnClickEvent;
};

// export const Text = memo(
//     ({
//         x,
//         y,
//         text,
//         fontSize = 14,
//         color = '#000',
//         fontFamily = 'Roboto',
//         textAlign = 'left',
//         fontWeight = 'normal',
//     }: TextProps) => {
//         const fonts = useFontsContext();
//         // Load the font
//         const font = fonts
//             ? matchFont(
//                   {
//                       fontFamily,
//                       fontSize,
//                       fontWeight,
//                   },
//                   fonts,
//               )
//             : null;

//         // Adjust x position based on text alignment
//         const adjustedX = useMemo(() => {
//             let _adjustedX = x;
//             if (!font) return _adjustedX;
//             if (textAlign !== 'left') {
//                 const textWidth = font.measureText(text).width;
//                 if (textAlign === 'center') {
//                     _adjustedX -= textWidth / 2;
//                 } else if (textAlign === 'right') {
//                     _adjustedX -= textWidth;
//                 }
//             }

//             return _adjustedX;
//         }, [font, text, textAlign, x]);

//         if (!font) {
//             return null; // Font is still loading
//         }

//         return <SkText x={adjustedX} y={y} text={text} font={font} color={color} />;
//     },
// );

export const Text = memo(
    ({
        x,
        y,
        text,
        width = 0,
        height = 0,
        fontSize = 14,
        fill = '#000',
        fontFamily = 'Roboto',
        align = 'left',
        fontWeight = 'normal',
        verticalAlign,
        onClick,
    }: TextProps) => {
        const fonts = useFontsContext();

        const paragraph = useMemo(() => {
            if (!fonts) return;

            const _paragraph = Skia.ParagraphBuilder.Make(
                {
                    textAlign: textAlignMap[align],
                    textStyle: {
                        color: Skia.Color(fill),
                        fontSize,
                        fontFamilies: [fontFamily],
                        fontStyle: {
                            weight: fontWeightMap[fontWeight],
                        },
                    },
                },
                fonts,
            )
                .addText(text)
                .build();

            _paragraph.layout(width || Number.MAX_SAFE_INTEGER);

            return _paragraph;
        }, [fonts, align, fill, fontSize, fontFamily, fontWeight, text, width]);

        const adjustedX = useMemo(() => {
            if (!fonts || !paragraph) return x;

            let _adjustedX = x;
            const textWidth = paragraph.getLongestLine() || 0;

            if (align === 'center') {
                _adjustedX += (width - textWidth) / 2;
            } else if (align === 'right') {
                _adjustedX += width - textWidth;
            }
            return _adjustedX;
        }, [fonts, paragraph, x, align, width]);

        const adjustedY = useMemo(() => {
            if (!fonts || !paragraph) return y;

            const textHeight = paragraph.getHeight();

            let _adjustedY = y;

            switch (verticalAlign) {
                case 'middle':
                    _adjustedY += (height - textHeight) / 2;
                    break;
                case 'bottom':
                    _adjustedY += height - textHeight;
                    break;
                default:
                    break;
            }

            return _adjustedY;
        }, [fonts, paragraph, y, verticalAlign, height]);

        useTouchEvent(
            (touchX, touchY) =>
                touchX >= x &&
                touchX <= x + width &&
                touchY <= y + (paragraph?.getHeight() ?? 0) &&
                touchY >= y,
            onClick,
        );

        if (!fonts || !paragraph) {
            return null; // Font is still loading
        }

        return (
            <Paragraph
                x={adjustedX}
                y={adjustedY}
                width={width}
                paragraph={paragraph as SkParagraph}
            />
        );
    },
);

const textAlignMap: { [key: string]: number } = {
    left: TextAlign.Left,
    right: TextAlign.Right,
    center: TextAlign.Center,
    end: TextAlign.End,
    start: TextAlign.Start,
    justify: TextAlign.Justify,
};

// Mapping fontWeight prop to Skia FontWeight
const fontWeightMap: { [key: string]: number } = {
    normal: FontWeight.Normal,
    bold: FontWeight.Bold,
    '100': FontWeight.Thin,
    '200': FontWeight.ExtraLight,
    '300': FontWeight.Light,
    '400': FontWeight.Normal,
    '500': FontWeight.Medium,
    '600': FontWeight.SemiBold,
    '700': FontWeight.Bold,
    '800': FontWeight.ExtraBold,
    '900': FontWeight.Black,
};

type RectProps = {
    x?: number;
    y?: number;
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    onClick?: OnClickEvent;
};

export const Rect = memo(
    ({
        x = 0,
        y = 0,
        width = 0,
        height = 0,
        fill,
        stroke,
        strokeWidth = 1,
        onClick,
        ...rest
    }: RectProps) => {
        useTouchEvent(
            (touchX, touchY) =>
                touchX >= x && touchX <= x + width && touchY <= y + height && touchY >= y,
            onClick,
        );

        return (
            <>
                {fill && (
                    <SkRect x={x} y={y} width={width} height={height} color={fill} {...rest} />
                )}
                {stroke && (
                    <SkRect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style="stroke"
                        color={stroke}
                        strokeWidth={strokeWidth}
                        {...rest}
                    />
                )}
            </>
        );
    },
);

type ShapeProps = {
    sceneFunc: (canvas: SkCanvas) => void;
};

export const Shape = memo(({ sceneFunc }: ShapeProps) => {
    const picture = useMemo(
        () =>
            createPicture(canvas => {
                sceneFunc(canvas);
            }),
        [sceneFunc],
    );
    return <Picture picture={picture} />;
});

type GroupProps = SkiaGroupProps & {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    clipX?: number;
    clipY?: number;
    clipWidth?: number;
    clipHeight?: number;
    children: React.ReactNode;
    onClick?: OnClickEvent;
};

export const Group: React.FC<GroupProps> = memo(
    ({
        x = 0,
        y = 0,
        width = 0,
        height = 0,
        clipX = 0,
        clipY = 0,
        clipWidth,
        clipHeight,
        offsetX = 0,
        offsetY = 0,
        children,
        onClick,
        ...restProps
    }) => {
        // Determine if clipping should be applied
        const shouldClip = clipWidth !== undefined && clipHeight !== undefined;

        const { origin, clip, combinedTransform } = useMemo(
            () => ({
                clip: {
                    x: clipX,
                    y: clipY,
                    width: clipWidth as number,
                    height: clipHeight as number,
                },
                origin: { x, y },
                combinedTransform: [
                    { translateX: -offsetX },
                    { translateY: -offsetY },
                    ...(restProps.transform || []),
                ],
            }),
            [clipHeight, clipWidth, clipX, clipY, offsetX, offsetY, restProps.transform, x, y],
        );

        useTouchEvent(
            (touchX, touchY) =>
                touchX >= x && touchX <= x + width && touchY <= y + height && touchY >= y,
            onClick,
        );

        return (
            <SkiaGroup
                {...restProps}
                transform={combinedTransform}
                origin={origin}
                {...(shouldClip ? { clip } : {})}>
                {children}
            </SkiaGroup>
        );
    },
);

export const Layer = Group;

export const makeRectPath = () => Skia.Path.Make();

type TouchEventData = {
    x: number;
    y: number;
};

type OnClickEvent = (e: { evt: { clientX: number; clientY: number } }) => void;

export function useTouchEvent(
    isPointInside: (x: number, y: number) => boolean,
    onClick?: OnClickEvent,
) {
    const isPointInsideRef = useLatest(isPointInside);
    useEffect(() => {
        if (!onClick) return;

        const handleTouch = (data: TouchEventData, event: EventObject) => {
            const { x, y } = data;
            if (isPointInsideRef.current(x, y - 10)) {
                onClick({
                    evt: {
                        clientX: x,
                        clientY: y,
                    },
                });
                event.stopPropagation();
            }
        };

        gridEventEmitter.on('touch', handleTouch);

        return () => {
            gridEventEmitter.off('touch', handleTouch);
        };
    }, [isPointInsideRef, onClick]);
}

registerCanvasContextBridge(FontsContext);
