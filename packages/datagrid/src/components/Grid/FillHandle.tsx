import React, { memo, useMemo } from 'react';
import type { ShapeConfig } from 'konva/lib/Shape';
import { View, type ViewStyle } from 'react-native';

/**
 * Fill handle component
 */
const FillHandle: React.FC<ShapeConfig> = ({
    x = 0,
    y = 0,
    // stroke,
    strokeWidth = 1,
    size = 8,
    borderColor,
    ...props
}) => {
    const style = useMemo(
        () =>
            ({
                position: 'absolute',
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                borderWidth: strokeWidth,
                borderColor,
                backgroundColor: '#fff',
                cursor: 'crosshair',
                pointerEvents: 'auto',
                borderRadius: 2,
            } as unknown as ViewStyle),
        [borderColor, size, strokeWidth, x, y],
    );

    if (x === 0 || y === 0) return null;

    return <View style={style} {...props} />;
};

export default memo(FillHandle);
