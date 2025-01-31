import { MutableRefObject, RefObject, useCallback, useEffect } from 'react';
import { SnapColumnProps, SnapRowProps } from './types';
import { Platform } from 'react-native';

type Props = {
    horizontalScrollRef: RefObject<HTMLDivElement>;
    verticalScrollRef: RefObject<HTMLDivElement>;
    wheelingRef: MutableRefObject<number | null>;
    snap: boolean;
    scrollbarSize: number;
    snapToColumnThrottler: MutableRefObject<((arg: SnapColumnProps) => void) | undefined>;
    snapToRowThrottler: MutableRefObject<((arg: SnapRowProps) => void) | undefined>;
    scrollContainerRef: RefObject<HTMLDivElement>;
    isMounted: MutableRefObject<boolean>;
};

export const useWebMethods = ({
    horizontalScrollRef,
    verticalScrollRef,
    wheelingRef,
    snap,
    scrollbarSize,
    snapToColumnThrottler,
    snapToRowThrottler,
    scrollContainerRef,
    isMounted,
}: Props) => {
    /**
     * Fired when user tries to scroll the canvas
     */
    const handleWheel = useCallback(
        (event: WheelEvent) => {
            const _horizontalScrollRef =
                horizontalScrollRef as unknown as MutableRefObject<HTMLDivElement>;
            const _verticalScrollRef =
                verticalScrollRef as unknown as MutableRefObject<HTMLDivElement>;

            // event.preventDefault();
            // event.stopImmediatePropagation();
            if (event.ctrlKey) return;
            /* If user presses shift key, scroll horizontally */
            const isScrollingHorizontally = event.shiftKey;

            const { deltaX, deltaY, deltaMode } = event;
            const vScrollDirection = deltaY >= 0 ? 'bottom' : 'top';
            // const hScrollDirection = deltaX >= 0 ? 'right' : 'left';

            const dx = isScrollingHorizontally ? deltaY : deltaX;
            let dy = deltaY;

            /* Scroll only in one direction */
            const isHorizontal = isScrollingHorizontally || Math.abs(dx) > Math.abs(dy);

            if (isHorizontal) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }

            // when the scroll cross the limit, we don't want to prevent other scrolls from taking over
            if (vScrollDirection === 'top') {
                if (_verticalScrollRef.current.scrollTop + deltaY >= 0) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            } else {
                if (
                    _verticalScrollRef.current.scrollTop + deltaY <=
                    _verticalScrollRef.current.scrollHeight -
                        _verticalScrollRef.current.clientHeight
                ) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }

            // when the scroll cross the limit, we don't want to prevent other scrolls from taking over
            // if (hScrollDirection === 'left') {
            //     if (horizontalScrollRef.current.scrollLeft + deltaX >= 0) {
            //         event.preventDefault();
            //     }
            // } else {
            //     if (
            //         horizontalScrollRef.current.scrollLeft + deltaX <=
            //         horizontalScrollRef.current.scrollWidth -
            //             (horizontalScrollRef.current as HTMLDivElement).clientWidth
            //     ) {
            //         event.preventDefault();
            //     }
            // }

            /* Prevent browser back in Mac */
            // event.preventDefault();
            /* Scroll natively */
            if (wheelingRef.current) return;

            /* If snaps are active */
            if (snap) {
                if (isHorizontal) {
                    snapToColumnThrottler.current?.({
                        deltaX,
                    });
                } else {
                    snapToRowThrottler.current?.({
                        deltaY,
                    });
                }
                return;
            }

            if (deltaMode === 1) {
                dy = dy * scrollbarSize;
            }

            if (!horizontalScrollRef.current || !verticalScrollRef.current) return;

            const currentScroll = isHorizontal
                ? _horizontalScrollRef.current?.scrollLeft
                : _verticalScrollRef.current?.scrollTop;

            wheelingRef.current = window.requestAnimationFrame(() => {
                wheelingRef.current = null;

                if (isHorizontal) {
                    if (horizontalScrollRef.current)
                        _horizontalScrollRef.current.scrollLeft = currentScroll + dx;
                } else {
                    if (verticalScrollRef.current)
                        _verticalScrollRef.current.scrollTop = currentScroll + dy;
                }
            });
        },
        // eslint-disable-next-line
        [horizontalScrollRef, scrollbarSize, snap],
    );

    /**
     * Handle mouse wheeel
     */
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const scrollContainerEl = scrollContainerRef.current;

        scrollContainerEl?.addEventListener('wheel', handleWheel, {
            passive: false,
        });
        isMounted.current = true;

        return () => {
            scrollContainerEl?.removeEventListener('wheel', handleWheel);
        };
        // eslint-disable-next-line
    }, [handleWheel]);
};
