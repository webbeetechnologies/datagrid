import React, {
    useRef,
    useCallback,
    useState,
    useMemo,
    forwardRef,
    useImperativeHandle,
    useReducer,
    memo,
    useEffect,
    Fragment,
    RefObject,
} from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    ViewStyle,
    ScrollView,
    View,
    StyleSheet,
    Platform,
    GestureResponderEvent,
    Pressable,
    StyleProp,
    // PanResponderInstance,
    // PanResponder,
} from 'react-native';
import type Konva from 'konva';
import invariant from 'tiny-invariant';
import { useLatest } from '@bambooapp/bamboo-molecules';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import { Stage, Layer, Group } from '../../canvas';
import { useMobileScroller } from '../../hooks';
import useGrid from '../../hooks/useGrid';
import { useDataGridStateStoreRef } from '../../DataGridStateContext';
import { canUseDOM } from '../../utils';
import {
    getRowStartIndexForOffset,
    getRowStopIndexForStartIndex,
    getColumnStartIndexForOffset,
    getColumnStopIndexForStartIndex,
    itemKey,
    getRowOffset as getRowOffsetHelper,
    getColumnOffset as getColumnOffsetHelper,
    getColumnWidth as getColumnWidthHelper,
    getRowHeight as getRowHeightHelper,
    getEstimatedTotalHeight,
    getEstimatedTotalWidth,
    throttle,
    getOffsetForColumnAndAlignment,
    getOffsetForRowAndAlignment,
    requestTimeout,
    cancelTimeout,
    TimeoutID,
    Align,
    clampIndex,
} from './helpers';
// import { CellRenderer as defaultItemRenderer } from './Cell';
import {
    AreaProps,
    CellInterface,
    CellPosition,
    Direction,
    GridProps,
    GridRef,
    InstanceInterface,
    OptionalCellInterface,
    OptionalScrollCoords,
    PosXY,
    PosXYRequired,
    RefAttribute,
    ScrollSnapRef,
    ScrollState,
    SelectionArea,
    SnapColumnProps,
    SnapRowProps,
    ViewPortProps,
} from './types';
import { renderCellsByRange } from './renderCellsByRange';
import { useSelectionBox } from './SelectionBoxInner';
import { useWebMethods } from './useWebMethods';

const DEFAULT_ESTIMATED_COLUMN_SIZE = 100;
const DEFAULT_ESTIMATED_ROW_SIZE = 50;

const defaultRowHeight = () => 20;
const defaultColumnWidth = () => 60;
// const defaultGridLineRenderer = (props: ShapeConfig) => {
//     return <GridLine {...props} />;
// };
export const RESET_SCROLL_EVENTS_DEBOUNCE_INTERVAL = 100;
/* Placeholder for empty array -> Prevents re-render */
const EMPTY_ARRAY: any = [];

// const defaultWrapper = (children: React.ReactNode): React.ReactNode => children;
const useFloatingRowPropsDefault = () => undefined;

/**
 * Grid component using React Konva
 * @param props
 *
 * TODO: Fix bug with snapping, since onWheel is a global handler, rowCount, columnCount becomes state
 */
const Grid: React.FC<GridProps & RefAttribute> = memo(
    forwardRef<GridRef, GridProps>((props, forwardedRef) => {
        const {
            width: containerWidth,
            height: containerHeight,
            estimatedColumnWidth,
            estimatedRowHeight,
            rowHeight = defaultRowHeight,
            columnWidth = defaultColumnWidth,
            rowCount = 0,
            columnCount = 0,
            scrollbarSize = 13,
            onScroll,
            onImmediateScroll,
            showScrollbar = true,
            selectionBackgroundColor = '#0E65EB19',
            selectionBorderColor = '#1a73e8',
            selectionStrokeWidth = 1,
            activeCellStrokeWidth = 2,
            activeCell = null,
            selections = EMPTY_ARRAY as SelectionArea[],
            frozenRows = 0,
            frozenColumns = 1,
            // itemRenderer = defaultItemRenderer,
            snap = false,
            scrollThrottleTimeout = 80,
            onViewChange,
            selectionRenderer,
            // onBeforeRenderRow,
            borderStyles,
            children,
            stageProps,
            wrapper,
            showFillHandle = false,
            fillSelection,
            overscanCount = 1,
            fillHandleProps,
            fillhandleBorderColor = '#5c6ae7',
            // gridLineColor = '#E3E2E2',
            // gridLineWidth = 1,
            // gridLineRenderer = defaultGridLineRenderer,
            isHiddenRow,
            isHiddenColumn,
            scale = 1,
            enableSelectionDrag = false,
            isDraggingSelection = false,
            style,
            verticalScrollRef: verticalScrollRefProp,
            containerStyle: containerStyleProp,
            overshootScrollHeight = 0,
            overshootScrollWidth = 0,
            headerCellRenderer,
            headerHeight = 40,
            rowHeadCellRenderer,
            rowHeadColumnWidth = 60,
            groupingLevel,
            useRecords,
            useFields,
            cellsDrawer,
            themeColors,
            renderActiveCell,
            useProcessRenderProps,
            isActiveColumn,
            isActiveRow,
            renderDynamicCell,
            initialScrollPosition,
            renderDynamicReactCell,
            useFloatingRowProps = useFloatingRowPropsDefault,
            getRowStateById,
            useGridInit,
            ...rest
        } = props;

        invariant(!(children && typeof children !== 'function'), 'Children should be a function');

        const stageRef = useRef<Konva.Stage>(null);
        // TODO - correct the type
        const containerRef = useRef<any>(null);

        const disabledScrollRef = useRef(false);

        const scrollContainerRef = useRef<any>(null);
        const verticalScrollRef = useRef<ScrollView>(null);
        const wheelingRef = useRef<number | null>(null);
        const horizontalScrollRef = useRef<ScrollView>(null);
        const gridRef = useRef<GridRef | null>(null);

        const datagridStoreRef = useDataGridStateStoreRef().store;

        const hasHeader = !!headerCellRenderer;

        const instanceProps = useRef<InstanceInterface>({
            columnMetadataMap: {},
            rowMetadataMap: {},
            lastMeasuredColumnIndex: -1,
            lastMeasuredRowIndex: -1,
            estimatedColumnWidth: estimatedColumnWidth || DEFAULT_ESTIMATED_COLUMN_SIZE,
            estimatedRowHeight: estimatedRowHeight || DEFAULT_ESTIMATED_ROW_SIZE,
            recalcColumnIndices: [],
            recalcRowIndices: [],
        });

        const snapToRowThrottler = useRef<({ deltaY }: SnapRowProps) => void>();
        const snapToColumnThrottler = useRef<({ deltaX }: SnapColumnProps) => void>();

        const [_, _forceRender] = useReducer(() => ({}), {});

        const forceRender = useCallback(() => {
            if (Platform.OS !== 'web') {
                (stageRef.current as any)?.redraw?.();
            }
            _forceRender();
        }, []);

        const estimatedTotalHeight =
            getEstimatedTotalHeight(rowCount, instanceProps.current) + overshootScrollHeight;
        const estimatedTotalWidth =
            getEstimatedTotalWidth(columnCount, instanceProps.current) + overshootScrollWidth;

        const initialScrollTop = initialScrollPosition?.top
            ? initialScrollPosition.top > estimatedTotalHeight
                ? estimatedTotalHeight
                : initialScrollPosition.top
            : 0;
        const initialScrollLeft = initialScrollPosition?.left
            ? initialScrollPosition.left > estimatedTotalWidth
                ? estimatedTotalWidth
                : initialScrollPosition.left
            : 0;

        const [scrollState, setScrollState] = useState<ScrollState>({
            scrollTop: initialScrollTop,
            scrollLeft: initialScrollLeft,
            isScrolling: false,
            verticalScrollDirection: Direction.Down,
            horizontalScrollDirection: Direction.Right,
        });
        const scrollSnapRefs = useRef<ScrollSnapRef | null>(null);
        const {
            scrollTop,
            scrollLeft,
            isScrolling,
            verticalScrollDirection,
            horizontalScrollDirection,
        } = scrollState;

        const scrollTopRef = useLatest(scrollTop);
        const scrollLeftRef = useLatest(scrollLeft);
        const scrollPositionRef = useLatest({ scrollTop, scrollLeft });

        const isMounted = useRef(false);

        /* Focus container */
        const focusContainer = useCallback(() => {
            if (canUseDOM && document.activeElement !== containerRef.current) {
                return containerRef.current?.focus();
            }
        }, []);

        /**
         * Get top offset of rowIndex
         */
        const getRowOffset = useCallback(
            (index: number) => {
                return getRowOffsetHelper({
                    index,
                    rowHeight,
                    columnWidth,
                    instanceProps: instanceProps.current,
                    scale,
                });
            },
            [rowHeight, columnWidth, scale],
        );

        /**
         * Get lefft offset of columnIndex
         */
        const getColumnOffset = useCallback(
            (index: number) => {
                return getColumnOffsetHelper({
                    index,
                    rowHeight,
                    columnWidth,
                    instanceProps: instanceProps.current,
                    scale,
                });
            },
            [rowHeight, columnWidth, scale],
        );

        /**
         * Get height of rowIndex
         */
        const getRowHeight = useCallback((index: number) => {
            return getRowHeightHelper(index, instanceProps.current);
        }, []);

        /**
         * Get height of columNiondex
         */
        const getColumnWidth = useCallback((index: number) => {
            return getColumnWidthHelper(index, instanceProps.current);
        }, []);

        /**
         * onScroll callback
         */
        useEffect(() => {
            if (!isMounted.current) return;
            onScroll?.({ scrollTop, scrollLeft });
        }, [scrollTop, scrollLeft, onScroll]);

        /**
         * Imperatively get the current scroll position
         */
        const getScrollPosition = useCallback(() => {
            return {
                scrollTop,
                scrollLeft,
            };
        }, [scrollTop, scrollLeft]);

        /* Redraw grid imperatively */
        const resetAfterIndices = useCallback(
            (
                { columnIndex, rowIndex }: OptionalCellInterface,
                shouldForceUpdate: boolean = true,
            ) => {
                if (typeof columnIndex === 'number') {
                    instanceProps.current.recalcColumnIndices = [];
                    instanceProps.current.lastMeasuredColumnIndex = Math.min(
                        instanceProps.current.lastMeasuredColumnIndex,
                        columnIndex - 1,
                    );
                }
                if (typeof rowIndex === 'number') {
                    instanceProps.current.recalcRowIndices = [];
                    instanceProps.current.lastMeasuredRowIndex = Math.min(
                        instanceProps.current.lastMeasuredRowIndex,
                        rowIndex - 1,
                    );
                }
                if (shouldForceUpdate) forceRender();
            },
            [forceRender],
        );

        /* Get top, left bounds of a cell */
        const getCellBounds = useCallback(({ rowIndex, columnIndex }: CellInterface): AreaProps => {
            return {
                top: rowIndex,
                left: columnIndex,
                right: columnIndex,
                bottom: rowIndex,
            } as AreaProps;
        }, []);

        /* Get top, left bounds of a cell */
        const getActualCellCoords = useCallback(
            ({ rowIndex, columnIndex }: CellInterface): CellInterface => {
                return {
                    rowIndex,
                    columnIndex,
                };
            },
            [],
        );

        const frozenColumnWidth = getColumnOffset(frozenColumns);
        const frozenRowHeight = getRowOffset(frozenRows);
        const [rowStartIndex, rowStopIndex, visibleRowStartIndex, visibleRowStopIndex] =
            useMemo(() => {
                const startIndex = getRowStartIndexForOffset({
                    rowHeight,
                    columnWidth,
                    rowCount,
                    columnCount,
                    instanceProps: instanceProps.current,
                    offset: scrollTop + frozenRowHeight,
                    scale,
                });
                const stopIndex = getRowStopIndexForStartIndex({
                    startIndex,
                    rowCount,
                    rowHeight,
                    columnWidth,
                    scrollTop,
                    containerHeight,
                    instanceProps: instanceProps.current,
                    scale,
                });

                // Overscan by one item in each direction so that tab/focus works.
                // If there isn't at least one extra item, tab loops back around.
                const overscanBackward =
                    !isScrolling || verticalScrollDirection === Direction.Up
                        ? Math.max(1, overscanCount)
                        : 1;
                const overscanForward =
                    !isScrolling || verticalScrollDirection === Direction.Down
                        ? Math.max(1, overscanCount)
                        : 1;

                return [
                    Math.max(0, startIndex - overscanBackward),
                    Math.max(0, Math.min(rowCount - 1, stopIndex + overscanForward)),
                    startIndex,
                    stopIndex,
                ];
                // we require to listen to forceRender state because when that happens we want to recompute
                // eslint-disable-next-line
            }, [
                rowHeight,
                columnWidth,
                rowCount,
                columnCount,
                scrollTop,
                frozenRowHeight,
                scale,
                containerHeight,
                isScrolling,
                verticalScrollDirection,
                overscanCount,
                _,
            ]);

        const [columnStartIndex, columnStopIndex, visibleColumnStartIndex, visibleColumnStopIndex] =
            useMemo(() => {
                const startIndex = getColumnStartIndexForOffset({
                    rowHeight,
                    columnWidth,
                    rowCount,
                    columnCount,
                    instanceProps: instanceProps.current,
                    offset: scrollLeft + frozenColumnWidth,
                    scale,
                });

                const stopIndex = getColumnStopIndexForStartIndex({
                    startIndex,
                    columnCount,
                    rowHeight,
                    columnWidth,
                    scrollLeft,
                    containerWidth,
                    instanceProps: instanceProps.current,
                    scale,
                });

                // Overscan by one item in each direction so that tab/focus works.
                // If there isn't at least one extra item, tab loops back around.
                const overscanBackward =
                    !isScrolling || horizontalScrollDirection === Direction.Left
                        ? Math.max(1, overscanCount)
                        : 1;
                const overscanForward =
                    !isScrolling || horizontalScrollDirection === Direction.Right
                        ? Math.max(1, overscanCount)
                        : 1;

                return [
                    Math.max(0, startIndex - overscanBackward),
                    Math.max(0, Math.min(columnCount - 1, stopIndex + overscanForward)),
                    startIndex,
                    stopIndex,
                ];
                // we require to listen to forceRender state because when that happens we want to recompute
                // eslint-disable-next-line
            }, [
                rowHeight,
                columnWidth,
                rowCount,
                columnCount,
                scrollLeft,
                frozenColumnWidth,
                scale,
                containerWidth,
                isScrolling,
                horizontalScrollDirection,
                overscanCount,
                _,
            ]);

        /* Method to get dimensions of the grid */
        const getDimensions = useCallback(() => {
            return {
                containerWidth,
                containerHeight,
                estimatedTotalWidth,
                estimatedTotalHeight,
            };
        }, [containerWidth, containerHeight, estimatedTotalWidth, estimatedTotalHeight]);

        /**
         * Update snap properties if its active
         * We need this because we are binding `onwheel` event to document
         * So props go stale
         */
        useEffect(() => {
            if (snap) {
                scrollSnapRefs.current = {
                    visibleRowStartIndex,
                    rowCount,
                    frozenRows,
                    visibleColumnStartIndex,
                    columnCount,
                    frozenColumns,
                    isHiddenRow,
                    isHiddenColumn,
                };
            }
        }, [
            snap,
            visibleRowStartIndex,
            rowCount,
            frozenRows,
            visibleColumnStartIndex,
            columnCount,
            frozenColumns,
            isHiddenRow,
            isHiddenColumn,
        ]);

        /**
         * Snaps vertical scrollbar to the next/prev visible row
         */
        const snapToRowFn = useCallback(
            ({ deltaY }: SnapRowProps) => {
                if (!verticalScrollRef.current || !scrollSnapRefs.current) return;

                if (deltaY !== 0) {
                    const direction = deltaY < 0 ? Direction.Up : Direction.Down;
                    const { visibleRowStartIndex, rowCount, isHiddenRow } = scrollSnapRefs.current;

                    let nextRowIndex =
                        direction === Direction.Up
                            ? // User is scrolling up
                              Math.max(0, visibleRowStartIndex - 1)
                            : Math.min(visibleRowStartIndex, rowCount - 1);

                    /* Ignore hidden row */
                    nextRowIndex = clampIndex(nextRowIndex, isHiddenRow, direction);

                    const rowHeight = getRowHeight(nextRowIndex);

                    verticalScrollRef.current.scrollTo({
                        y: scrollTopRef.current + (direction === Direction.Up ? -1 : 1) * rowHeight,
                        animated: false,
                    });
                }
            },
            [getRowHeight, scrollTopRef],
        );

        /**
         * Snaps horizontal scrollbar to the next/prev visible column
         */
        const snapToColumnFn = useCallback(
            ({ deltaX }: SnapColumnProps) => {
                if (!horizontalScrollRef.current || !scrollSnapRefs.current) return;

                if (deltaX !== 0) {
                    const { visibleColumnStartIndex, columnCount, isHiddenColumn } =
                        scrollSnapRefs.current;
                    const direction = deltaX < 0 ? Direction.Left : Direction.Right;

                    let nextColumnIndex =
                        direction === Direction.Left
                            ? Math.max(0, visibleColumnStartIndex - 1)
                            : Math.min(visibleColumnStartIndex, columnCount - 1);
                    /* Ignore hidden column */

                    nextColumnIndex = clampIndex(nextColumnIndex, isHiddenColumn, direction);

                    const columnWidth = getColumnWidth(nextColumnIndex);

                    horizontalScrollRef.current.scrollTo({
                        x:
                            scrollLeftRef.current +
                            (direction === Direction.Left ? -1 : 1) * columnWidth,
                        animated: false,
                    });
                }
            },
            [getColumnWidth, scrollLeftRef],
        );

        /**
         * Register snap throttlers
         */
        useEffect(() => {
            if (snap) {
                snapToRowThrottler.current = throttle(snapToRowFn, scrollThrottleTimeout);
                snapToColumnThrottler.current = throttle(snapToColumnFn, scrollThrottleTimeout);
            }
            return () => {
                snapToRowThrottler.current = undefined;
                snapToColumnThrottler.current = undefined;
            };
        }, [scrollThrottleTimeout, snap, snapToColumnFn, snapToRowFn]);

        /* Find frozen column boundary */
        const isWithinFrozenColumnBoundary = useCallback(
            (x: number) => {
                return frozenColumns > 0 && x < frozenColumnWidth;
            },
            [frozenColumns, frozenColumnWidth],
        );

        /* Find frozen row boundary */
        const isWithinFrozenRowBoundary = useCallback(
            (y: number) => {
                return frozenRows > 0 && y < frozenRowHeight;
            },
            [frozenRows, frozenRowHeight],
        );

        /**
         * Get relative mouse position
         */
        const getRelativePositionFromOffset = useCallback(
            (left: number, top: number): PosXYRequired | null => {
                invariant(
                    typeof left === 'number' && typeof top === 'number',
                    'Top and left should be a number',
                );

                let pos = { x: left, y: top };

                if (Platform.OS === 'web') {
                    if (!stageRef.current) return null;

                    const stage = stageRef.current.getStage();
                    const rect = containerRef.current?.getBoundingClientRect();

                    if (rect) {
                        left = left - rect.x;
                        top = top - rect.y;
                    }
                    pos = stage.getAbsoluteTransform().copy().invert().point({ x: left, y: top });
                }

                return pos;
            },
            [],
        );

        /**
         * Get cell cordinates from current mouse x/y positions
         */
        const getCellCoordsFromOffset = useCallback(
            (left: number, top: number, includeFrozen: boolean = true): CellInterface | null => {
                const pos = getRelativePositionFromOffset(left, top);
                if (!pos) return null;

                const { x, y } = pos;
                const rowOffset = includeFrozen && isWithinFrozenRowBoundary(y) ? y : y + scrollTop;
                const columnOffset =
                    includeFrozen && isWithinFrozenColumnBoundary(x) ? x : x + scrollLeft;

                if (
                    rowOffset > estimatedTotalHeight - overshootScrollHeight ||
                    columnOffset > estimatedTotalWidth - overshootScrollWidth
                ) {
                    return null;
                }

                const rowIndex = getRowStartIndexForOffset({
                    rowHeight,
                    columnWidth,
                    rowCount,
                    columnCount,
                    instanceProps: instanceProps.current,
                    offset: rowOffset,
                    scale,
                });
                const columnIndex = getColumnStartIndexForOffset({
                    rowHeight,
                    columnWidth,
                    rowCount,
                    columnCount,
                    instanceProps: instanceProps.current,
                    offset: columnOffset,
                    scale,
                });
                /* To be compatible with merged cells */
                const bounds = getCellBounds({ rowIndex, columnIndex });

                return { rowIndex: bounds.top, columnIndex: bounds.left };
            },
            [
                overshootScrollWidth,
                overshootScrollHeight,
                getRelativePositionFromOffset,
                isWithinFrozenRowBoundary,
                scrollTop,
                isWithinFrozenColumnBoundary,
                scrollLeft,
                estimatedTotalHeight,
                estimatedTotalWidth,
                rowHeight,
                columnWidth,
                rowCount,
                columnCount,
                scale,
                getCellBounds,
            ],
        );

        /**
         * Get cell offset position from rowIndex, columnIndex
         */
        const getCellOffsetFromCoords = useCallback(
            (cell: CellInterface): CellPosition => {
                const { top: rowIndex, left: columnIndex, right, bottom } = getCellBounds(cell);
                const x = getColumnOffset(columnIndex);
                const y = getRowOffset(rowIndex);
                const width = getColumnOffset(right + 1) - x;
                const height = getRowOffset(bottom + 1) - y;

                return {
                    x,
                    y,
                    width,
                    height,
                };
            },
            [getCellBounds, getColumnOffset, getRowOffset],
        );

        /**
         * Resize one or more columns
         */

        const resizeColumns = useCallback(
            (indices: number[]) => {
                const leftMost = Math.min(...indices);
                instanceProps.current.recalcColumnIndices = indices;
                resetAfterIndices({ columnIndex: leftMost }, false);
                forceRender();
            },
            [forceRender, resetAfterIndices],
        );

        /**
         * Resize one or more rows
         */
        const resizeRows = useCallback(
            (indices: number[]) => {
                const topMost = Math.min(...indices);
                instanceProps.current.recalcRowIndices = indices;
                resetAfterIndices({ rowIndex: topMost }, false);
                forceRender();
            },
            [forceRender, resetAfterIndices],
        );

        /* Always if the viewport changes */
        useEffect(() => {
            if (instanceProps.current.recalcColumnIndices.length) {
                instanceProps.current.recalcColumnIndices.length = 0;
            }
            if (instanceProps.current.recalcRowIndices.length) {
                instanceProps.current.recalcRowIndices.length = 0;
            }
        }, [rowStopIndex, columnStopIndex, scale]);

        /* Get current view port of the grid */
        const getViewPort = useCallback((): ViewPortProps => {
            return {
                rowStartIndex,
                rowStopIndex,
                columnStartIndex,
                columnStopIndex,
                visibleRowStartIndex,
                visibleRowStopIndex,
                visibleColumnStartIndex,
                visibleColumnStopIndex,
            };
        }, [
            rowStartIndex,
            rowStopIndex,
            columnStartIndex,
            columnStopIndex,
            visibleRowStartIndex,
            visibleRowStopIndex,
            visibleColumnStartIndex,
            visibleColumnStopIndex,
        ]);

        /* Reset isScrolling */
        const resetIsScrolling = useCallback(() => {
            resetIsScrollingTimeoutID.current = null;

            setScrollState(prev => {
                return {
                    ...prev,
                    isScrolling: false,
                };
            });
        }, []);

        /**
         * When the grid is scrolling,
         * 1. Stage does not listen to any mouse events
         * 2. Div container does not listen to pointer events
         */
        const resetIsScrollingTimeoutID = useRef<TimeoutID | null>(null);
        const resetIsScrollingDebounced = useCallback(() => {
            if (resetIsScrollingTimeoutID.current !== null) {
                cancelTimeout(resetIsScrollingTimeoutID.current);
            }
            resetIsScrollingTimeoutID.current = requestTimeout(
                resetIsScrolling,
                RESET_SCROLL_EVENTS_DEBOUNCE_INTERVAL,
            );
        }, [resetIsScrolling]);

        /* Handle vertical scroll */
        const handleScroll = useCallback(
            (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                if (disabledScrollRef.current) return;

                const { y: scrollTop } = e.nativeEvent.contentOffset;

                setScrollState(prev => ({
                    ...prev,
                    isScrolling: true,
                    verticalScrollDirection:
                        prev.scrollTop > scrollTop ? Direction.Up : Direction.Down,
                    scrollTop,
                }));

                /* Scroll callbacks */
                onImmediateScroll?.({ scrollTop, scrollLeft });

                /* Reset isScrolling if required */
                resetIsScrollingDebounced();
            },
            [onImmediateScroll, resetIsScrollingDebounced, scrollLeft],
        );

        /* Handle horizontal scroll */
        const handleScrollLeft = useCallback(
            (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                if (disabledScrollRef.current) return;

                const { x: scrollLeft } = e.nativeEvent.contentOffset;
                setScrollState(prev => ({
                    ...prev,
                    isScrolling: true,
                    horizontalScrollDirection:
                        prev.scrollLeft > scrollLeft ? Direction.Left : Direction.Right,
                    scrollLeft,
                }));

                /* Scroll callbacks */
                onImmediateScroll?.({ scrollLeft, scrollTop });

                /* Reset isScrolling if required */
                resetIsScrollingDebounced();
            },
            [onImmediateScroll, resetIsScrollingDebounced, scrollTop],
        );

        const { onTouchStart, onTouchMove, onTouchEnd } = useMobileScroller({
            gridRef,
            initialScrollLeft,
            initialScrollTop,
        });

        /* Scroll based on left, top position */
        const scrollTo = useCallback(({ scrollTop, scrollLeft }: OptionalScrollCoords) => {
            /* If scrollbar is visible, lets update it which triggers a state change */
            // if (showScrollbar) {
            //     if (horizontalScrollRef.current && scrollLeft !== void 0) {
            //         horizontalScrollRef.current.scrollTo({ x: scrollLeft, animated: false });
            //     }
            //     if (verticalScrollRef.current && scrollTop !== void 0) {
            //         verticalScrollRef.current.scrollTo({ y: scrollTop, animated: false });
            //     }
            // } else {
            //     setScrollState(prev => {
            //         return {
            //             ...prev,
            //             scrollLeft: scrollLeft == void 0 ? prev.scrollLeft : scrollLeft,
            //             scrollTop: scrollTop == void 0 ? prev.scrollTop : scrollTop,
            //         };
            //     });
            // }
            setScrollState(prev => {
                return {
                    ...prev,
                    scrollLeft: scrollLeft == void 0 ? prev.scrollLeft : scrollLeft,
                    scrollTop: scrollTop == void 0 ? prev.scrollTop : scrollTop,
                };
            });
        }, []);

        /* Scroll grid to top */
        const scrollToTop = useCallback(() => {
            scrollTo({ scrollTop: 0, scrollLeft: 0 });
        }, [scrollTo]);

        /* Scroll grid to bottom */
        const scrollToBottom = useCallback(() => {
            scrollTo({ scrollTop: estimatedTotalHeight - containerHeight });
        }, [scrollTo, estimatedTotalHeight, containerHeight]);

        /**
         * Scrollby utility
         */
        const scrollBy = useCallback(
            ({ x, y }: PosXY) => {
                if (showScrollbar) {
                    if (horizontalScrollRef.current && x !== void 0)
                        horizontalScrollRef.current.scrollTo({ x: scrollLeftRef.current + x });

                    if (verticalScrollRef.current && y !== void 0)
                        verticalScrollRef.current.scrollTo({ y: scrollTopRef.current + y });
                } else {
                    setScrollState(prev => {
                        return {
                            ...prev,
                            scrollLeft: x == void 0 ? prev.scrollLeft : prev.scrollLeft + x,
                            scrollTop: y == void 0 ? prev.scrollTop : prev.scrollTop + y,
                        };
                    });
                }
            },
            [scrollLeftRef, scrollTopRef, showScrollbar],
        );

        /**
         * Scrolls to cell
         * Respects frozen rows and columns
         */
        const scrollToItem = useCallback(
            ({ rowIndex, columnIndex }: OptionalCellInterface, align: Align = Align.smart) => {
                const isFrozenRow = rowIndex !== void 0 && rowIndex < frozenRows;
                const isFrozenColumn = columnIndex !== void 0 && columnIndex < frozenColumns;
                const frozenColumnOffset = getColumnOffset(frozenColumns);
                /* Making sure getColumnWidth works */
                // const x = columnIndex !== void 0 ? getColumnOffset(columnIndex) : void 0;
                /* Making sure getRowHeight works */
                // const y = rowIndex !== void 0 ? getRowOffset(rowIndex) : void 0;
                const width = columnIndex !== void 0 ? getColumnWidth(columnIndex) : 0;
                const height = rowIndex !== void 0 ? getRowHeight(rowIndex) : 0;
                const columnAlign = width > containerWidth ? Align.start : align;
                const rowAlign = height > containerHeight ? Align.start : align;

                const newScrollLeft =
                    columnIndex !== void 0 && !isFrozenColumn
                        ? getOffsetForColumnAndAlignment({
                              index: columnIndex,
                              containerHeight,
                              containerWidth,
                              columnCount,
                              columnWidth,
                              rowCount,
                              rowHeight,
                              scrollOffset: scrollLeft,
                              instanceProps: instanceProps.current,
                              scrollbarSize,
                              frozenOffset: frozenColumnOffset,
                              align: columnAlign,
                              scale,
                              estimatedTotalWidth,
                              estimatedTotalHeight,
                          })
                        : void 0;

                const frozenRowOffset = getRowOffset(frozenRows);
                const newScrollTop =
                    rowIndex !== void 0 && !isFrozenRow
                        ? getOffsetForRowAndAlignment({
                              index: rowIndex,
                              containerHeight,
                              containerWidth,
                              columnCount,
                              columnWidth,
                              rowCount,
                              rowHeight,
                              scrollOffset: scrollTop,
                              instanceProps: instanceProps.current,
                              scrollbarSize,
                              frozenOffset: frozenRowOffset,
                              align: rowAlign,
                              scale,
                              estimatedTotalWidth,
                              estimatedTotalHeight,
                          })
                        : void 0;

                const coords = {
                    scrollLeft: newScrollLeft,
                    scrollTop: newScrollTop,
                };
                const isOutsideViewport =
                    (rowIndex !== void 0 &&
                        rowIndex > rowStopIndex + (rowStopIndex - rowStartIndex)) ||
                    (columnIndex !== void 0 &&
                        columnIndex > columnStopIndex + (columnStopIndex - columnStartIndex));

                /* Scroll in the next frame, Useful when user wants to jump from 1st column to last */
                if (isOutsideViewport) {
                    window.requestAnimationFrame(() => {
                        scrollTo(coords);
                    });
                } else scrollTo(coords);
            },
            [
                frozenRows,
                frozenColumns,
                getColumnOffset,
                getRowOffset,
                getColumnWidth,
                getRowHeight,
                containerWidth,
                containerHeight,
                columnCount,
                columnWidth,
                rowCount,
                rowHeight,
                scrollLeft,
                scrollbarSize,
                scale,
                estimatedTotalWidth,
                estimatedTotalHeight,
                scrollTop,
                rowStopIndex,
                rowStartIndex,
                columnStopIndex,
                columnStartIndex,
                scrollTo,
            ],
        );

        useEffect(() => {
            if (initialScrollPosition?.processing === true) return;
            if (horizontalScrollRef.current)
                horizontalScrollRef.current.scrollTo({ x: initialScrollLeft, animated: false });

            if (verticalScrollRef.current)
                verticalScrollRef.current.scrollTo({ y: initialScrollTop, animated: false });

            // eslint-disable-next-line
        }, [initialScrollPosition?.processing]);

        /* Callback when visible rows or columns have changed */
        useEffect(() => {
            onViewChange?.({
                rowStartIndex,
                rowStopIndex,
                columnStartIndex,
                columnStopIndex,
                visibleRowStartIndex,
                visibleRowStopIndex,
                visibleColumnStartIndex,
                visibleColumnStopIndex,
            });
        }, [
            rowStartIndex,
            rowStopIndex,
            columnStartIndex,
            columnStopIndex,
            visibleRowStartIndex,
            visibleRowStopIndex,
            visibleColumnStartIndex,
            visibleColumnStopIndex,
            onViewChange,
        ]);

        const floatingRowProps = useFloatingRowProps();
        const records = useRecords({
            rowStartIndex,
            rowStopIndex,
            columnStartIndex,
            columnStopIndex,
        });
        const getRecordIdByIndex = useCallback((index: number) => records[index]?.id, [records]);

        const { cells: headerCells, frozenCells: headerFrozenCells } = renderCellsByRange({
            columnStartIndex,
            columnStopIndex,
            rowStartIndex: 0,
            rowStopIndex: 1,
            columnCount,
            rowCount: 1,
            getCellBounds,
            getColumnOffset,
            getColumnWidth,
            getRowHeight: () => headerHeight,
            getRowOffset: getRowOffset,
            renderCell: headerCellRenderer,
            isHiddenColumn,
            isHiddenRow: headerIsHiddenRow,
            frozenColumns,
            hoveredCell: null,
            withCellStates: false,
            isFloatingRow: true,
            isRowFiltered: floatingRowProps?.isFiltered,
            isRowMoved: floatingRowProps?.isMoved,
            floatingRowId: floatingRowProps?.record?.id,
            getRecordIdByIndex: () => undefined,
        });

        const { cells: dynamicCells, frozenCells: frozenDynamicCells } = renderCellsByRange({
            columnStartIndex,
            columnStopIndex,
            rowStartIndex,
            rowStopIndex,
            columnCount,
            rowCount,
            getCellBounds,
            getColumnOffset,
            getColumnWidth,
            getRowHeight,
            getRowOffset,
            renderCell: renderDynamicCell,
            hoveredCell: datagridStoreRef.current?.hoveredCell,
            isHiddenColumn,
            isActiveRow,
            isHiddenRow,
            frozenColumns,
            isFloatingRow: false,
            isRowFiltered: floatingRowProps?.isFiltered,
            isRowMoved: floatingRowProps?.isMoved,
            floatingRowId: floatingRowProps?.record?.id,
            getRecordIdByIndex,
        });
        const { cells: dynamicReactCells, frozenCells: frozenDynamicReactCells } =
            renderCellsByRange({
                columnStartIndex,
                columnStopIndex,
                rowStartIndex,
                rowStopIndex,
                columnCount,
                rowCount,
                getCellBounds,
                getColumnOffset,
                getColumnWidth,
                getRowHeight,
                getRowOffset,
                renderCell: renderDynamicReactCell,
                hoveredCell: datagridStoreRef.current?.hoveredCell,
                isHiddenColumn,
                isActiveRow,
                isHiddenRow,
                frozenColumns,
                isFloatingRow: false,
                isRowFiltered: floatingRowProps?.isFiltered,
                isRowMoved: floatingRowProps?.isMoved,
                floatingRowId: floatingRowProps?.record?.id,
                getRecordIdByIndex,
            });

        const {
            activeCellComponent,
            floatingRowDynamicCells,
            floatingRowFrozenDynamicCells,
            selectionChildren,
        } = useSelectionBox({
            frozenColumnWidth,
            frozenRowHeight,
            frozenColumns,
            frozenRows,
            floatingRowProps,
            fillhandleBorderColor,
            fillHandleProps,
            fillSelection,
            scrollLeft,
            scrollTop,
            selectionBackgroundColor,
            selectionBorderColor,
            selectionRenderer,
            selections,
            selectionStrokeWidth,
            isActiveRow,
            isDraggingSelection,
            isHiddenColumn,
            isHiddenRow,
            renderActiveCell,
            rowCount,
            rowStopIndex,
            renderDynamicCell,
            renderDynamicReactCell,
            activeCell,
            activeCellStrokeWidth,
            borderStyles,
            columnCount,
            columnStartIndex,
            columnStopIndex,
            enableSelectionDrag,
            getCellBounds,
            getColumnOffset,
            getColumnWidth,
            getRowHeight,
            getRowOffset,
            showFillHandle,
            dynamicReactCells,
            frozenDynamicReactCells,
        });

        /* Spacing for frozen row/column clip */
        const frozenSpacing = 1;
        /**
         * Prevents drawing hit region when scrolling
         */
        const listenToEvents = !isScrolling;

        const { cells, frozenCells } = useGrid({
            instance: gridRef!,
            records,
            columnCount,
            columnStartIndex,
            columnStopIndex,
            rowStartIndex,
            rowCount,
            rowStopIndex,
            isHiddenColumn,
            isHiddenRow,
            frozenColumns,
            cellsDrawer,
            groupingLevel,
            useFields,
            themeColors,
            useProcessRenderProps,
            scale,
            useFloatingRowProps,
            getRowStateById,
            useGridInit,
        });

        const rowEndCells: React.ReactNode[] = [];

        if (rowHeadCellRenderer) {
            for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
                if (rowIndex > rowCount - 1) break;

                const bounds = getCellBounds({ rowIndex, columnIndex: columnCount - 1 });
                const actualBottom = Math.max(rowIndex, bounds.bottom);

                const x = 0;
                const y = getRowOffset(rowIndex);
                const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

                rowEndCells.push(
                    rowHeadCellRenderer?.({
                        x: x,
                        y,
                        width: rowHeadColumnWidth,
                        height,
                        rowIndex,
                        columnIndex: columnCount - 1,
                        key: itemKey({
                            rowIndex: rowIndex,
                            columnIndex: columnCount - 1,
                        }),
                    }),
                );
            }
        }

        const stageChildren = (
            <>
                <Layer>
                    <Group
                        clipX={frozenColumnWidth}
                        clipY={frozenRowHeight}
                        clipWidth={containerWidth - frozenColumnWidth}
                        clipHeight={containerHeight - frozenRowHeight}>
                        <Group offsetY={scrollTop} offsetX={scrollLeft}>
                            {cells}
                            {dynamicCells}
                            {floatingRowDynamicCells}
                        </Group>
                    </Group>
                    <Group offsetY={scrollTop} offsetX={scrollLeft}>
                        {activeCellComponent}
                    </Group>
                    <Group
                        clipX={0}
                        clipY={0}
                        clipWidth={frozenColumnWidth + frozenSpacing}
                        clipHeight={containerHeight}>
                        <Group offsetY={scrollTop}>
                            {frozenCells}
                            {frozenDynamicCells}
                            {floatingRowFrozenDynamicCells}
                        </Group>
                    </Group>
                </Layer>
                {children && typeof children === 'function'
                    ? children({
                          scrollLeft,
                          scrollTop,
                      })
                    : null}
            </>
        );

        const {
            containerStyle,
            innerContainerStyle,
            verticalScrollbarStyle,
            verticalScrollbarHandleStyle,
            horizontalScrollbarStyle,
            horizontalScrollbarHandleStyle,
        } = useMemo(
            () => ({
                containerStyle: [
                    {
                        position: 'relative',
                        width: containerWidth,
                        userSelect: 'none',
                    },
                    containerStyleProp,
                ] as StyleProp<ViewStyle>,
                innerContainerStyle: StyleSheet.flatten([
                    {
                        outline: 'none',
                        position: 'relative',
                    },
                    // isScrolling ? { pointerEvents: 'none' } : {},
                    style,
                ]),
                verticalScrollbarStyle: {
                    height: containerHeight,
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: scrollbarSize,
                    willChange: 'transform',
                } as ViewStyle,
                verticalScrollbarHandleStyle: {
                    position: 'absolute',
                    height: estimatedTotalHeight,
                    width: 1,
                } as ViewStyle,
                horizontalScrollbarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: containerWidth,
                    height: scrollbarSize,
                    willChange: 'transform',
                } as ViewStyle,
                horizontalScrollbarHandleStyle: {
                    position: 'absolute',
                    width: estimatedTotalWidth,
                    height: 1,
                } as ViewStyle,
            }),
            [
                containerHeight,
                containerStyleProp,
                containerWidth,
                estimatedTotalHeight,
                estimatedTotalWidth,
                scrollbarSize,
                style,
            ],
        );

        const {
            appendSelection: _a,

            clearLastSelection: _c,

            clearSelections: _cl,
            draggedSelection: _d,
            initialDraggedSelection: _i,
            isDragging: _isD,
            modifySelection: _m,
            newSelection: _n,

            onSelectionMouseDown: _os,

            selectAll: _s,

            setActiveCellState: _sa,

            setSelections: _ss,
            onContextMenu,
            onDoubleClick,
            onTouchStart: _onTouchStart,
            scrollTo: _scrollTo,
            scrollToTop: _scrollToTop,
            onClick,
            onMouseDown,
            ...restContainerProps
        } = rest as any;

        const lastClickRef = useRef(0);

        const onTouch = useCallback(
            (e: GestureResponderEvent) => {
                _onTouchStart?.(e);
                e.preventDefault(); // to disable browser default zoom on double tap

                const newEvent = Object.assign({}, e);
                Object.assign((newEvent as any).nativeEvent, {
                    clientX: e.nativeEvent.touches[0].locationX,
                    clientY: e.nativeEvent.touches[0].locationY,
                });

                if (Platform.OS !== 'web') {
                    onClick?.(newEvent);
                }

                const date = new Date();
                const time = date.getTime();
                const time_between_taps = 200; // 200ms
                if (time - lastClickRef.current < time_between_taps) {
                    // do stuff
                    onDoubleClick(newEvent);
                }
                lastClickRef.current = time;
            },
            [_onTouchStart, onDoubleClick, onClick],
        );

        /* Expose some methods in ref */
        useImperativeHandle(gridRef, () => {
            return {
                scrollTo,
                scrollBy,
                scrollToItem,
                stage: stageRef.current,
                container: containerRef.current,
                resetAfterIndices,
                getScrollPosition,
                getCellBounds,
                getCellCoordsFromOffset,
                getCellOffsetFromCoords,
                getActualCellCoords,
                focus: focusContainer,
                resizeColumns,
                resizeRows,
                getViewPort,
                getRelativePositionFromOffset,
                scrollToTop,
                scrollToBottom,
                getDimensions,
                getRowOffset,
                getColumnOffset,
                verticalScrollRef,
                horizontalScrollRef,
                getRowHeight,
                getColumnWidth,
                stageRef,
                isActiveColumn,
                isActiveRow,
                activeCell,
                scrollDisabled: disabledScrollRef,
                getRecordIdByIndex,
            };
        });

        useImperativeHandle(forwardedRef, () => gridRef.current as GridRef);
        useImperativeHandle(verticalScrollRefProp, () => verticalScrollRef.current as ScrollView);

        // const panResponder = useRef<PanResponderInstance>(null);

        // useEffect(() => {
        //     if (Platform.OS === 'web') return;
        //     (panResponder.current as Writable<PanResponderInstance>) = PanResponder.create({
        //         onStartShouldSetPanResponder: () => true,
        //         onMoveShouldSetPanResponder: () => true,
        //         onPanResponderGrant: onTouchStart,
        //         onPanResponderMove: onTouchMove,
        //         onPanResponderRelease: onTouchEnd,
        //         onPanResponderTerminationRequest: () => false,
        //         onShouldBlockNativeResponder: () => false,
        //     });
        // }, [onTouchEnd, onTouchMove, onTouchStart]);

        const InnerContainer = Platform.OS === 'web' ? 'div' : Pressable;

        // const onPressStage = useCallback(
        //     (e: GestureResponderEvent) => {
        //         const { locationX: x, locationY: y } = e.nativeEvent;
        //         const scrollX = scrollPositionRef?.current?.scrollLeft ?? 0;
        //         const scrollY = scrollPositionRef?.current?.scrollTop ?? 0;
        //         gridEventEmitter.emit('touch', {
        //             x: x + scrollX,
        //             y: y + scrollY,
        //         });
        //     },
        //     [scrollPositionRef],
        // );

        const onClickMobile = useCallback(
            (e: GestureResponderEvent) => {
                onMouseDown({
                    nativeEvent: Object.assign(e.nativeEvent, {
                        clientX: e.nativeEvent.locationX,
                        clientY: e.nativeEvent.locationY,
                    }),
                });
                onClick({
                    nativeEvent: Object.assign(e.nativeEvent, {
                        clientX: e.nativeEvent.locationX,
                        clientY: e.nativeEvent.locationY,
                    }),
                });
            },
            [onMouseDown, onClick],
        );

        const panGesture = Gesture.Pan()
            .onBegin(e => {
                onTouchStart(e);
            })
            .onUpdate(e => {
                onTouchMove(e);
            })
            .onEnd(e => {
                onTouchEnd(e);
            })
            .maxPointers(1)
            .minDistance(1)
            .shouldCancelWhenOutside(false)
            .hitSlop(Platform.OS === 'android' ? { left: 0, top: 0 } : undefined) // Adjust hitSlop if necessary
            .enableTrackpadTwoFingerGesture(false)
            .runOnJS(true);

        const Wrapper = Platform.OS === 'web' ? Fragment : GestureDetector;

        useWebMethods({
            horizontalScrollRef: horizontalScrollRef as unknown as RefObject<HTMLDivElement>,
            verticalScrollRef: verticalScrollRef as unknown as RefObject<HTMLDivElement>,
            wheelingRef,
            snap,
            scrollbarSize,
            scrollContainerRef,
            snapToColumnThrottler,
            snapToRowThrottler,
            isMounted,
        });

        return (
            <Wrapper {...((Platform.OS === 'web' ? {} : { gesture: panGesture }) as any)}>
                <View
                    style={containerStyle}
                    // {...(Platform.OS !== 'web' ? panResponder.current?.panHandlers : {})}
                >
                    {hasHeader && (
                        <Stage
                            width={containerWidth}
                            height={headerHeight}
                            listening={listenToEvents}>
                            <Layer>
                                <Group
                                    clipX={frozenColumnWidth}
                                    clipY={frozenRowHeight}
                                    clipWidth={containerWidth - frozenColumnWidth}
                                    clipHeight={headerHeight}>
                                    <Group offsetY={0} offsetX={scrollLeft}>
                                        {headerCells}
                                    </Group>
                                </Group>

                                <Group
                                    clipX={0}
                                    clipY={0}
                                    clipWidth={frozenColumnWidth + frozenSpacing}
                                    clipHeight={headerHeight}>
                                    <Group offsetY={0}>{headerFrozenCells}</Group>
                                </Group>
                            </Layer>
                        </Stage>
                    )}
                    <View style={containerStyle} ref={scrollContainerRef}>
                        <InnerContainer
                            {...{ tabIndex: 0 }}
                            ref={containerRef}
                            style={innerContainerStyle}
                            onTouchStart={onTouch}
                            onDoubleClick={onDoubleClick}
                            {...restContainerProps}
                            {...Platform.select({
                                web: { onClick, onMouseDown },
                                default: {
                                    onPress: onClickMobile,
                                },
                            })}>
                            <Stage
                                width={containerWidth}
                                height={containerHeight}
                                ref={stageRef}
                                listening={listenToEvents}
                                onContextMenu={onContextMenu}
                                scrollPositionRef={scrollPositionRef}
                                {...stageProps}>
                                {wrapper && typeof wrapper === 'function'
                                    ? wrapper(stageChildren)
                                    : stageChildren}
                            </Stage>
                            {selectionChildren}
                        </InnerContainer>
                        {showScrollbar ? (
                            <>
                                <ScrollView
                                    scrollEventThrottle={16}
                                    // for typescript to stop complaining
                                    {...{ tabIndex: -1 }}
                                    style={verticalScrollbarStyle}
                                    onScroll={handleScroll}
                                    contentContainerStyle={verticalScrollbarHandleStyle}
                                    ref={verticalScrollRef}
                                />
                                <ScrollView
                                    horizontal
                                    scrollEventThrottle={16}
                                    // for typescript to stop complaining
                                    {...{ tabIndex: -1 }}
                                    style={horizontalScrollbarStyle}
                                    contentContainerStyle={horizontalScrollbarHandleStyle}
                                    onScroll={handleScrollLeft}
                                    ref={horizontalScrollRef}
                                />
                            </>
                        ) : null}
                    </View>
                </View>
            </Wrapper>
        );
    }),
);

const headerIsHiddenRow = () => false;

// const selectionContainer = {
//     outline: 'none',
//     position: undefined,
// } as ViewStyle;

// type Writable<T> = { -readonly [K in keyof T]: T[K] };

export default Grid;
