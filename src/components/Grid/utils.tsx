import React from 'react';
import type { CellInterface, SelectionProps } from './types';
import { View } from '@bambooapp/bamboo-atoms';
import { Platform, type ViewStyle } from 'react-native';
import { CanvasDrawer } from '../../utils/drawer';
import type { IRenderProps } from '../../utils/types';
import type { Context } from 'konva/lib/Context';

// TODO - improve this, get rid of inline styles
export const createHTMLBox = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill,
    stroke,
    strokeLeftColor = stroke,
    strokeTopColor = stroke,
    strokeRightColor = stroke,
    strokeBottomColor = stroke,
    strokeWidth = 0,
    strokeTopWidth = strokeWidth,
    strokeRightWidth = strokeWidth,
    strokeBottomWidth = strokeWidth,
    strokeLeftWidth = strokeWidth,
    key,
    strokeStyle = 'solid',
    fillOpacity = 1,
    draggable,
    isDragging,
    borderCoverWidth = 5,
    ...props
}: SelectionProps) => {
    const lineStyles: Partial<React.CSSProperties> = {
        borderWidth: 0,
        position: 'absolute',
        pointerEvents: 'none',
    };
    /**
     * Border cover is so that there is enough
     * draggable handle area for the user.
     * Default is 5px
     */
    const showBorderCover = draggable;
    const borderCoverStyle: React.CSSProperties = {
        position: 'absolute',
        pointerEvents: draggable ? 'auto' : 'none',
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'initial',
    };
    width = width - Math.floor(strokeWidth / 2);
    height = height - Math.floor(strokeWidth / 2);
    // y = y - Math.ceil(strokeWidth / 2);
    const lines = [
        <View
            // @ts-ignore
            style={
                {
                    ...lineStyles,
                    left: x,
                    top: y,
                    width: width,
                    height: strokeTopWidth,
                    borderColor: strokeTopColor,
                    borderTopWidth: strokeTopWidth,
                    borderStyle: strokeStyle,
                } as ViewStyle
            }
            key="top"
            {...props}
        />,
        <View
            // @ts-ignore
            style={
                {
                    ...lineStyles,
                    left: x + width,
                    top: y,
                    width: strokeRightWidth,
                    height: height,
                    borderColor: strokeRightColor,
                    borderRightWidth: strokeRightWidth,
                    borderStyle: strokeStyle,
                } as ViewStyle
            }
            key="right"
            {...props}
        />,
        <View
            // @ts-ignore
            style={
                {
                    ...lineStyles,
                    left: x,
                    top: y + height,
                    width: width + strokeTopWidth,
                    height: strokeBottomWidth,
                    borderColor: strokeBottomColor,
                    borderBottomWidth: strokeBottomWidth,
                    borderStyle: strokeStyle,
                } as ViewStyle
            }
            key="bottom"
            {...props}
        />,
        <View
            // @ts-ignore
            style={
                {
                    ...lineStyles,
                    left: x,
                    top: y,
                    width: strokeLeftWidth,
                    height: height,
                    borderColor: strokeLeftColor,
                    borderLeftWidth: strokeLeftWidth,
                    borderStyle: strokeStyle,
                } as ViewStyle
            }
            key="left"
            {...props}
        />,
    ];
    const borderCovers = [
        <View
            // @ts-ignore

            style={
                {
                    ...borderCoverStyle,
                    left: x,
                    top: y,
                    width: width,
                    height: 5,
                } as ViewStyle
            }
            key="top"
            {...props}
        />,
        <View
            // @ts-ignore
            style={
                {
                    ...borderCoverStyle,
                    left: x + width - borderCoverWidth + strokeRightWidth,
                    top: y,
                    width: borderCoverWidth,
                    height: height,
                } as ViewStyle
            }
            key="right"
            {...props}
        />,
        <View
            // @ts-ignore
            style={
                {
                    ...borderCoverStyle,
                    left: x,
                    top: y + height - borderCoverWidth + strokeBottomWidth,
                    width: width + strokeTopWidth,
                    height: borderCoverWidth,
                } as ViewStyle
            }
            key="bottom"
            {...props}
        />,
        <View
            // @ts-ignore
            style={
                {
                    ...borderCoverStyle,
                    left: x,
                    top: y,
                    width: borderCoverWidth,
                    height: height,
                } as ViewStyle
            }
            key="left"
            {...props}
        />,
    ];
    /**
     * Display title component
     * Only if title is not null
     */
    // const titleProps = {
    //     isDragging,
    //     x,
    //     y,
    //     stroke: strokeTopColor,
    //     width,
    //     bounds,
    //     strokeWidth,
    // };

    return (
        <React.Fragment key={key}>
            {fill && (
                <View
                    // eslint-disable-next-line react-native/no-inline-styles
                    style={{
                        position: 'absolute',
                        top: y,
                        left: x,
                        height,
                        width,
                        backgroundColor: fill,
                        opacity: fillOpacity,
                        ...(Platform.OS === 'web' ? { userSelect: 'none' } : {}),
                        pointerEvents: 'none',
                    }}
                />
            )}
            {lines}
            {showBorderCover && borderCovers}
        </React.Fragment>
    );
};

export type CellsDrawerState = {
    hoveredCell: CellInterface | null;
    isHoverRow: boolean;
    isActiveRow: boolean;
};

export class CellsDrawer extends CanvasDrawer {
    state: CellsDrawerState = {
        hoveredCell: null,
        isHoverRow: false,
        isActiveRow: false,
    };

    public setState(state: CellsDrawerState) {
        this.state = state;
    }

    private renderCellText(renderProps: IRenderProps, _ctx?: any) {
        const { x, y, cellValue, columnWidth, recordId } = renderProps;
        // const renderX = textAlign === 'right' ? x + columnWidth - 4 : x + 4;
        const renderY = y + 10;

        const { text } = this.textEllipsis({
            text: cellValue ?? recordId,
            maxWidth: columnWidth && columnWidth - 8,
            fontWeight: 'normal',
        });

        this.text({
            x: x + 4,
            y: renderY,
            text,
            fillStyle: '#333',
            fontWeight: 'normal',
            textDecoration: 'none',
        });
    }

    public renderCell(renderProps: IRenderProps, ctx?: Context | undefined) {
        // const { field } = renderProps;
        // const fieldType = field.type;

        return this.renderCellText(renderProps, ctx);
    }
}

export const cellsDrawer = new CellsDrawer();
