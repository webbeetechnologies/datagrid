import {
    GestureStateChangeEvent,
    GestureUpdateEvent,
    PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
// @ts-ignore
import { Scroller } from 'scroller';
import type { GridRef, ScrollCoords } from '../components/Grid/types';
import { canUseDOM } from '../utils';

export interface TouchProps {
    /**
     * Grid reference to access grid methods
     */
    gridRef: React.MutableRefObject<GridRef | null>;
    initialScrollTop: number;
    initialScrollLeft: number;
}

export interface TouchResults {
    isTouchDevice: boolean;
    scrollTo: (scrollState: ScrollCoords) => void;
    scrollToTop: () => void;
    onTouchStart: (e: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => boolean;
    onTouchMove: (e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => void;
    onTouchEnd: (e: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => void;
    // onTouchStart: (e: GestureResponderEvent) => boolean;
    // onTouchMove: (e: GestureResponderEvent) => void;
    // onTouchEnd: (e: GestureResponderEvent) => void;
}

/**
 * Enable touch interactions
 * Supports
 * 1. Scrolling
 * 2. Cell selection
 */
const useTouch = ({ gridRef, initialScrollLeft, initialScrollTop }: TouchProps): TouchResults => {
    const scrollerRef = useRef<typeof Scroller | null>(null);
    const isTouchDevice = useRef<boolean>(false);

    /* Scroll to x, y coordinate */
    const scrollTo = useCallback(({ scrollLeft, scrollTop }: ScrollCoords) => {
        if (scrollerRef.current) scrollerRef.current.scrollTo(scrollLeft, scrollTop);
    }, []);
    /* Scrolls to top if mobile */
    const scrollToTop = useCallback(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTo(0, 0);
    }, []);

    const updateScrollDimensions = useCallback(
        ({
            containerWidth,
            containerHeight,
            estimatedTotalWidth,
            estimatedTotalHeight,
        }: {
            containerWidth: number;
            containerHeight: number;
            estimatedTotalWidth: number;
            estimatedTotalHeight: number;
        }) => {
            scrollerRef.current.setDimensions(
                containerWidth,
                containerHeight,
                estimatedTotalWidth,
                estimatedTotalHeight,
            );
        },
        [],
    );

    const handleTouchScroll = useCallback(
        (scrollLeft: number, scrollTop: number) => {
            gridRef.current?.scrollTo({ scrollTop, scrollLeft });
        },
        [gridRef],
    );

    // for web
    const handleTouchStart = useCallback(
        (e: globalThis.TouchEvent) => {
            const dims = gridRef.current?.getDimensions();
            if (dims) updateScrollDimensions(dims);

            scrollerRef.current.doTouchStart(e.touches, e.timeStamp);
        },
        [gridRef, updateScrollDimensions],
    );
    // for web
    const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
        e.preventDefault();
        scrollerRef.current.doTouchMove(e.touches, e.timeStamp);
    }, []);
    // for web
    const handleTouchEnd = useCallback((e: globalThis.TouchEvent) => {
        scrollerRef.current.doTouchEnd(e.timeStamp);
    }, []);

    useEffect(() => {
        const _gridRef = gridRef;
        isTouchDevice.current = Platform.OS === 'web' && canUseDOM && 'ontouchstart' in window;

        const options = {
            scrollingX: true,
            scrollingY: true,
            decelerationRate: 0.9,
            penetrationAcceleration: 0.08,
            animationDuration: 50,
        };

        /* Add scroller */
        scrollerRef.current = new Scroller(handleTouchScroll, options);

        const dims = gridRef.current?.getDimensions();
        /* Update dimensions */
        if (dims) updateScrollDimensions(dims);

        if (!isTouchDevice.current) return;

        /* Add listeners */
        _gridRef.current?.container?.addEventListener('touchstart', handleTouchStart);
        _gridRef.current?.container?.addEventListener('touchend', handleTouchEnd);
        _gridRef.current?.container?.addEventListener('touchmove', handleTouchMove);

        return () => {
            _gridRef.current?.container?.removeEventListener('touchstart', handleTouchStart);
            _gridRef.current?.container?.removeEventListener('touchend', handleTouchEnd);
            _gridRef.current?.container?.removeEventListener('touchmove', handleTouchMove);
        };
    }, [
        gridRef,
        handleTouchEnd,
        handleTouchMove,
        handleTouchScroll,
        handleTouchStart,
        updateScrollDimensions,
    ]);

    // for mobile
    // const onTouchStart = useCallback(
    //     (e: GestureResponderEvent) => {
    //         const dims = gridRef.current?.getDimensions();
    //         if (dims) updateScrollDimensions(dims);
    //         scrollerRef.current.doTouchStart(
    //             e.nativeEvent.touches,
    //             e.nativeEvent.timestamp ?? e.timeStamp,
    //         );

    //         return true;
    //     },
    //     [gridRef, updateScrollDimensions],
    // );

    // const onTouchMove = useCallback((e: GestureResponderEvent) => {
    //     scrollerRef.current.doTouchMove(
    //         e.nativeEvent.touches,
    //         e.nativeEvent.timestamp ?? e.timeStamp,
    //     );
    // }, []);

    // const onTouchEnd = useCallback((e: GestureResponderEvent) => {
    //     scrollerRef.current.doTouchEnd(e.nativeEvent.timestamp ?? e.timeStamp);
    // }, []);

    const onTouchStart = useCallback(
        (e: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
            const dims = gridRef.current?.getDimensions();
            if (dims) updateScrollDimensions(dims);
            scrollerRef.current.doTouchStart([{ pageX: e.x, pageY: e.y }], Date.now());

            return true;
        },
        [gridRef, updateScrollDimensions],
    );

    const onTouchMove = useCallback((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
        scrollerRef.current.doTouchMove([{ pageX: e.x, pageY: e.y }], Date.now());
    }, []);

    const onTouchEnd = useCallback((_e: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
        scrollerRef.current.doTouchEnd(Date.now());
    }, []);

    useEffect(() => {
        if (scrollerRef.current) {
            scrollerRef.current.scrollTo(initialScrollLeft, initialScrollTop);
        }

        // eslint-disable-next-line
    }, []);

    return {
        isTouchDevice: isTouchDevice.current,
        scrollTo,
        scrollToTop,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
};

// function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
//     let lastFunc: ReturnType<typeof setTimeout> | null = null;
//     let lastRan: number | null = null;

//     return function (this: any, ...args: Parameters<T>): void {
//         if (!lastRan) {
//             // First call, execute immediately
//             func.apply(this, args);
//             lastRan = Date.now();
//         } else {
//             // Clear any existing timeout
//             if (lastFunc) {
//                 clearTimeout(lastFunc);
//             }

//             // Set a new timeout
//             lastFunc = setTimeout(() => {
//                 if (Date.now() - lastRan! >= limit) {
//                     func.apply(this, args);
//                     lastRan = Date.now();
//                 }
//             }, limit - (Date.now() - lastRan));
//         }
//     } as T;
// }

export default useTouch;
