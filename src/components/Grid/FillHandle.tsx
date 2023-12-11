import type { ShapeConfig } from 'konva/lib/Shape';

/**
 * Fill handle component
 */
const FillHandle = ({
    x = 0,
    y = 0,
    stroke,
    strokeWidth = 1,
    size = 8,
    borderColor,
    ...props
}: ShapeConfig) => {
    if (x === 0 || y === 0) return null;
    return (
        <div
            style={{
                position: 'absolute',
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                border: `${strokeWidth}px ${borderColor} solid`,
                borderRightWidth: 0,
                borderBottomWidth: 0,
                background: stroke as string,
                cursor: 'crosshair',
                pointerEvents: 'all',
            }}
            {...props}
        />
    );
};

export default FillHandle;
