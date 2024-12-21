import { BlendMode, Canvas, Picture, createPicture, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

const SkiaExample = () => {
    const width = 256;
    const height = 256;
    const picture = useMemo(
        () =>
            createPicture(canvas => {
                const size = width;
                const r = 0.33 * size;
                const paint = Skia.Paint();
                paint.setBlendMode(BlendMode.Multiply);

                paint.setColor(Skia.Color('cyan'));
                canvas.drawCircle(r, r, r, paint);

                paint.setColor(Skia.Color('magenta'));
                canvas.drawCircle(size - r, r, r, paint);

                paint.setColor(Skia.Color('yellow'));
                canvas.drawCircle(size / 2, size - r, r, paint);
            }),
        [],
    );
    return (
        <Canvas style={{ width, height }}>
            <Picture picture={picture} />
        </Canvas>
    );
};

export default SkiaExample;
