import React, { useCallback, useEffect, useRef } from 'react';
// @ts-ignore
import { Scroller } from 'scroller';
import type { GridRef, ScrollCoords } from '../components/Grid/types';
import { canUseDOM } from '../utils';
import { GestureResponderEvent, Platform } from 'react-native';

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
    onTouchStart: (e: GestureResponderEvent) => boolean;
    onTouchMove: (e: GestureResponderEvent) => void;
    onTouchEnd: (e: GestureResponderEvent) => void;
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
    const handleTouchStart = useCallback(
        (e: globalThis.TouchEvent) => {
            const dims = gridRef.current?.getDimensions();
            if (dims) updateScrollDimensions(dims);

            scrollerRef.current.doTouchStart(e.touches, e.timeStamp);
        },
        [gridRef, updateScrollDimensions],
    );
    const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
        e.preventDefault();
        scrollerRef.current.doTouchMove(e.touches, e.timeStamp);
    }, []);
    const handleTouchEnd = useCallback((e: globalThis.TouchEvent) => {
        scrollerRef.current.doTouchEnd(e.timeStamp);
    }, []);

    useEffect(() => {
        const _gridRef = gridRef;
        isTouchDevice.current = Platform.OS === 'web' && canUseDOM && 'ontouchstart' in window;

        const options = {
            scrollingX: true,
            scrollingY: true,
            decelerationRate: 0.95,
            penetrationAcceleration: 0.08,
            animationDuration: 250,
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

    const onTouchStart = useCallback((e: GestureResponderEvent) => {
        scrollerRef.current.doTouchStart(
            e.nativeEvent.touches,
            e.nativeEvent.timestamp ?? e.timeStamp,
        );

        return true;
    }, []);

    const onTouchMove = useCallback((e: GestureResponderEvent) => {
        scrollerRef.current.doTouchMove(
            e.nativeEvent.touches,
            e.nativeEvent.timestamp ?? e.timeStamp,
        );
    }, []);

    const onTouchEnd = useCallback((e: GestureResponderEvent) => {
        scrollerRef.current.doTouchEnd(e.nativeEvent.timestamp ?? e.timeStamp);
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

export default useTouch;
