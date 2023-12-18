import React, { memo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { TextConfig } from 'konva/lib/shapes/Text';

import type { RendererProps } from './Grid';
import { isNull } from './helpers';

export interface CellProps extends RendererProps {
    value?: string;
    textColor?: string;
    padding?: number;
    fontWeight?: string;
    fontStyle?: string;
    onClick?: (e: KonvaEventObject<MouseEvent>) => void;
    textWhiteSpace?: number;
    textProps?: TextConfig;
}

/**
 * Default cell component
 * @param props
 */
const Cell: React.FC<CellProps> = memo(props => {
    const {
        x = 0,
        y = 0,
        width,
        height,
        value,
        fill = 'white',
        strokeWidth = 1,
        stroke = '#d9d9d9',
        align = 'left',
        verticalAlign = 'middle',
        textColor = '#333',
        padding = 5,
        fontFamily = 'Arial',
        fontSize = 12,
        children,
        wrap = 'none',
        fontWeight = 'normal',
        fontStyle = 'normal',
        textDecoration,
        alpha = 1,
        strokeEnabled = true,
        isOverlay,
        textWhiteSpace = 0,
        textProps,
        ...rest
    } = props;
    if (isOverlay) return null;
    const fillEnabled = !!fill;
    const textStyle = `${fontWeight} ${fontStyle}`;

    return (
        <Group {...rest}>
            <Rect
                x={x + 0.5}
                y={y + 0.5}
                height={height}
                width={width}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                shadowForStrokeEnabled={false}
                strokeScaleEnabled={false}
                hitStrokeWidth={0}
                alpha={alpha}
                fillEnabled={fillEnabled}
                strokeEnabled={strokeEnabled}
            />
            {isNull(value) ? null : (
                <Text
                    x={x + textWhiteSpace}
                    y={y}
                    height={height}
                    width={width}
                    text={value}
                    fill={textColor}
                    verticalAlign={verticalAlign}
                    align={align}
                    fontFamily={fontFamily}
                    fontStyle={textStyle}
                    textDecoration={textDecoration}
                    padding={padding}
                    wrap={wrap}
                    fontSize={fontSize}
                    hitStrokeWidth={0}
                    {...textProps}
                />
            )}
            {children}
        </Group>
    );
});

/**
 * Default CellRenderer
 * @param props
 */
const CellRenderer = (props: RendererProps) => {
    return <Cell {...props} />;
};

export default CellRenderer;
export { CellRenderer, Cell };
