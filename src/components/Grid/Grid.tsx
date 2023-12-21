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
    Key,
    CSSProperties,
    RefObject,
    RefCallback,
    MutableRefObject,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle, ScrollView } from 'react-native';
import { Stage, Layer, Group, Line } from 'react-konva';
import type Konva from 'konva';
import type { ShapeConfig } from 'konva/lib/Shape';

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
    canUseDOM,
    getBoundedCells,
    cellIdentifier,
} from './helpers';
import { CellRenderer as defaultItemRenderer } from './Cell';
import { CellRenderer as defaultOverlayRenderer } from './CellOverlay';
import Selection from './Selection';
import FillHandle from './FillHandle';
import GridLine from './GridLine';
import { createHTMLBox } from './utils';
import invariant from 'tiny-invariant';
import type { StageConfig } from 'konva/lib/Stage';
import { Direction } from './types';
import { useMolecules } from '@bambooapp/bamboo-molecules';
import { StyleSheet } from 'react-native';

export interface GridProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onScroll' | 'children'> {
    /**
     * Width of the grid
     */
    width: number;
    /**
     * Height of the grid
     */
    height: number;
    /**
     * No of columns in the grid
     */
    columnCount: number;
    /**
     * No of rows in the grid
     */
    rowCount: number;
    /**
     * Should return height of a row at an index
     */
    rowHeight?: ItemSizer;
    /**
     * Should return width of a column at an index
     */
    columnWidth?: ItemSizer;
    /**
     * Size of the scrollbar. Default is 13
     */
    scrollbarSize?: number;
    /**
     * Helps in lazy grid width calculation
     */
    estimatedColumnWidth?: number;
    /**
     * Helps in lazy grid height calculation
     */
    estimatedRowHeight?: number;
    /**
     * Called when user scrolls the grid
     */
    onScroll?: ({ scrollLeft, scrollTop }: ScrollCoords) => void;
    /**
     * Called immediately on scroll
     */
    onImmediateScroll?: ({ scrollLeft, scrollTop }: ScrollCoords) => void;
    /**
     * Show scrollbars on the left and right of the grid
     */
    showScrollbar?: boolean;
    /**
     * Currently active cell
     */
    activeCell?: CellInterface | null;
    /**
     * Background of selection
     */
    selectionBackgroundColor?: string;
    /**
     * Border color of selected area
     */
    selectionBorderColor?: string;
    /**
     * Stroke width of the selection
     */
    selectionStrokeWidth?: number;
    /**
     * Active Cell Stroke width
     */
    activeCellStrokeWidth?: number;
    /**
     * Array of selected cell areas
     */
    selections?: SelectionArea[];
    /**
     * Fill selection
     */
    fillSelection?: SelectionArea | null;
    /**
     * Array of merged cells
     */
    mergedCells?: AreaProps[];
    /**
     * Number of frozen rows
     */
    frozenRows?: number;
    /**
     * Number of frozen columns
     */
    frozenColumns?: number;
    /**
     * Snap to row and column when scrolling
     */
    snap?: boolean;
    /**
     * Show shadow as you scroll for frozen rows and columns
     */
    showFrozenShadow?: boolean;
    /**
     * Shadow settings
     */
    shadowSettings?: ShapeConfig;
    /**
     * Scroll throttle wait timeout
     */
    scrollThrottleTimeout?: number;
    /**
     * Cell styles for border
     */
    borderStyles?: StylingProps;
    /**
     * Extend certains to coords
     */
    cellAreas?: CellRangeArea[];
    /**
     * Cell renderer. Must be a Konva Component eg: Group, Rect etc
     */
    itemRenderer?: (props: RendererProps) => React.ReactNode;
    /**
     * Render custom overlays like stroke on top of cell
     */
    overlayRenderer?: (props: RendererProps) => React.ReactNode;
    /**
     * Allow users to customize selected cells design
     */
    selectionRenderer?: (props: SelectionProps) => React.ReactNode;
    /**
     * Bind to fill handle
     */
    fillHandleProps?: Record<string, (e: any) => void>;
    /**
     * Fired when scroll viewport changes
     */
    onViewChange?: (view: ViewPortProps) => void;
    /**
     * Called right before a row is being rendered.
     * Will be called for frozen cells and merged cells
     */
    onBeforeRenderRow?: (rowIndex: number) => void;
    /**
     * Custom grid overlays
     */
    children?: (props: ScrollCoords) => React.ReactNode;
    /**
     * Allows users to Wrap stage children in Top level Context
     */
    wrapper?: (children: React.ReactNode) => React.ReactNode;
    /**
     * Props that can be injected to Konva stage
     */
    stageProps?: Omit<StageConfig, 'container'>;
    /**
     * Show fillhandle
     */
    showFillHandle?: boolean;
    /**
     * Overscan row and columns
     */
    overscanCount?: number;
    /**
     * Border color of fill handle
     */
    fillhandleBorderColor?: string;
    /**
     * Show grid lines.
     * Useful for spreadsheets
     */
    showGridLines?: boolean;
    /**
     * Customize grid line color
     */
    gridLineColor?: string;
    /**
     * Width of the grid line
     */
    gridLineWidth?: number;
    /**
     * Gridline component
     */
    gridLineRenderer?: (props: ShapeConfig) => React.ReactNode;
    /**
     * Shadow stroke color
     */
    shadowStroke?: string;
    /**
     * Draw overlay for each cell.
     * Can be used to apply stroke or draw on top of a cell
     */
    enableCellOverlay?: boolean;
    /**
     * Check if its hidden row
     */
    isHiddenRow?: (rowIndex: number) => boolean;
    /**
     * Check if its a hidden column. Skip rendering hidden
     */
    isHiddenColumn?: (columnIndex: number) => boolean;
    /**
     * Is Hidden cell
     */
    isHiddenCell?: (rowIndex: number, columnIndex: number) => boolean;
    /**
     * Scale
     */
    scale?: number;
    /**
     * Enable draging active cell and selections
     */
    enableSelectionDrag?: boolean;
    /**
     * Is user currently dragging a selection
     */
    isDraggingSelection?: boolean;
    verticalScrollRef?:
        | RefObject<ScrollView>
        | RefCallback<ScrollView>
        | MutableRefObject<ScrollView>;
    containerStyle?: ViewStyle;
}

export interface CellRangeArea extends CellInterface {
    toColumnIndex: number;
}

export type RefAttribute = {
    ref?: React.Ref<GridRef>;
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export interface SelectionProps
    extends AreaMeta,
        ShapeConfig,
        Omit<React.HTMLAttributes<HTMLDivElement>, 'draggable'> {
    fillHandleProps?: Record<string, (e: any) => void>;
    type: 'fill' | 'activeCell' | 'selection' | 'border';
    isDragging?: boolean;
    inProgress?: boolean;
    activeCell?: CellInterface;
    selection?: SelectionArea;
    key: number;
    draggable?: boolean;
    bounds?: AreaProps;
    borderCoverWidth?: number;
}

export type ScrollCoords = {
    scrollTop: number;
    scrollLeft: number;
};

export type OptionalScrollCoords = {
    scrollTop?: number;
    scrollLeft?: number;
};

export interface ScrollState extends ScrollCoords {
    isScrolling: boolean;
    verticalScrollDirection: Direction;
    horizontalScrollDirection: Direction;
}

export type RenderComponent = React.FC<RendererProps>;

export interface CellPosition extends Pick<ShapeConfig, 'x' | 'y'> {
    width?: ShapeConfig['width'];
    height?: ShapeConfig['height'];
}
export interface RendererProps extends CellInterface, CellPosition, Omit<ShapeConfig, 'scale'> {
    key: Key;
    isMergedCell?: boolean;
    isOverlay?: boolean;
}

export type ItemSizer = (index: number) => number;

export interface SelectionArea extends AreaStyle {
    bounds: AreaProps;
    inProgress?: boolean;
    /**
     * When user drags the fill handle
     */
    isFilling?: boolean;
}
export interface AreaProps {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface CellInterface {
    rowIndex: number;
    columnIndex: number;
}

export interface OptionalCellInterface {
    rowIndex?: number;
    columnIndex?: number;
}

export interface ViewPortProps {
    rowStartIndex: number;
    rowStopIndex: number;
    columnStartIndex: number;
    columnStopIndex: number;
    visibleRowStartIndex: number;
    visibleRowStopIndex: number;
    visibleColumnStartIndex: number;
    visibleColumnStopIndex: number;
}

export interface InstanceInterface {
    columnMetadataMap: CellMetaDataMap;
    rowMetadataMap: CellMetaDataMap;
    lastMeasuredColumnIndex: number;
    lastMeasuredRowIndex: number;
    estimatedRowHeight: number;
    estimatedColumnWidth: number;
    recalcColumnIndices: number[];
    recalcRowIndices: number[];
}

export type CellMetaDataMap = Record<number, CellMetaData>;
export type CellMetaData = {
    offset: number;
    size: number;
};

export interface SnapRowProps {
    deltaY: number;
}

export interface SnapColumnProps {
    deltaX: number;
}

export interface PosXY {
    x?: number;
    y?: number;
}

export interface PosXYRequired {
    x: number;
    y: number;
}

export type GridRef = {
    scrollTo: (scrollPosition: OptionalScrollCoords) => void;
    scrollBy: (pos: PosXY) => void;
    stage: Konva.Stage | null;
    container: HTMLDivElement | null;
    resetAfterIndices: (coords: OptionalCellInterface, shouldForceUpdate?: boolean) => void;
    getScrollPosition: () => ScrollCoords;
    isMergedCell: (coords: CellInterface) => boolean;
    getCellBounds: (coords: CellInterface) => AreaProps;
    getCellCoordsFromOffset: (
        x: number,
        y: number,
        includeFrozen?: boolean,
    ) => CellInterface | null;
    getCellOffsetFromCoords: (coords: CellInterface) => CellPosition;
    getActualCellCoords: (coords: CellInterface) => CellInterface;
    scrollToItem: (coords: OptionalCellInterface, align?: Align) => void;
    focus: () => void;
    resizeColumns: (indices: number[]) => void;
    resizeRows: (indices: number[]) => void;
    getViewPort: () => ViewPortProps;
    getRelativePositionFromOffset: (x: number, y: number) => PosXYRequired | null;
    scrollToTop: () => void;
    scrollToBottom: () => void;
    getDimensions: () => {
        containerWidth: number;
        containerHeight: number;
        estimatedTotalWidth: number;
        estimatedTotalHeight: number;
    };
    getRowOffset: (index: number) => number;
    getColumnOffset: (index: number) => number;
};

export type MergedCellMap = Map<string, AreaProps>;

export type StylingProps = AreaStyle[];

export interface AreaStyle extends AreaMeta {
    bounds: AreaProps;
    style?: Style;
    strokeStyle?: 'dashed' | 'solid' | 'dotted';
}
export interface AreaMeta {
    title?: string;
    [key: string]: any;
}

export interface Style {
    stroke?: string;
    strokeLeftColor?: string;
    strokeTopColor?: string;
    strokeRightColor?: string;
    strokeBottomColor?: string;
    strokeWidth?: number;
    strokeTopWidth?: number;
    strokeRightWidth?: number;
    strokeBottomWidth?: number;
    strokeLeftWidth?: number;
    strokeStyle?: string;
}

interface ScrollSnapRef {
    visibleRowStartIndex: number;
    rowCount: number;
    frozenRows: number;
    visibleColumnStartIndex: number;
    columnCount: number;
    frozenColumns: number;
    isHiddenRow?: (rowIndex: number) => boolean;
    isHiddenColumn?: (columnIndex: number) => boolean;
}

const DEFAULT_ESTIMATED_COLUMN_SIZE = 100;
const DEFAULT_ESTIMATED_ROW_SIZE = 50;

const defaultShadowSettings: ShapeConfig = {
    strokeWidth: 1,
};
const defaultRowHeight = () => 20;
const defaultColumnWidth = () => 60;
const defaultSelectionRenderer = (props: SelectionProps) => {
    return <Selection {...props} />;
};
const defaultGridLineRenderer = (props: ShapeConfig) => {
    return <GridLine {...props} />;
};
export const RESET_SCROLL_EVENTS_DEBOUNCE_INTERVAL = 150;
/* Placeholder for empty array -> Prevents re-render */
const EMPTY_ARRAY: any = [];

const defaultWrapper = (children: React.ReactNode): React.ReactNode => children;

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
            activeCell,
            selections = EMPTY_ARRAY as SelectionArea[],
            frozenRows = 0,
            frozenColumns = 0,
            itemRenderer = defaultItemRenderer,
            enableCellOverlay = false,
            overlayRenderer = defaultOverlayRenderer,
            mergedCells = EMPTY_ARRAY as AreaProps[],
            snap = false,
            scrollThrottleTimeout = 80,
            onViewChange,
            selectionRenderer = defaultSelectionRenderer,
            onBeforeRenderRow,
            showFrozenShadow = false,
            shadowSettings = defaultShadowSettings,
            borderStyles = EMPTY_ARRAY as StylingProps,
            children,
            stageProps,
            wrapper = defaultWrapper,
            cellAreas = EMPTY_ARRAY,
            showFillHandle = false,
            fillSelection,
            overscanCount = 1,
            fillHandleProps,
            fillhandleBorderColor = 'white',
            showGridLines = false,
            gridLineColor = '#E3E2E2',
            gridLineWidth = 1,
            gridLineRenderer = defaultGridLineRenderer,
            isHiddenRow,
            isHiddenColumn,
            isHiddenCell,
            scale = 1,
            enableSelectionDrag = false,
            isDraggingSelection = false,
            style,
            verticalScrollRef: verticalScrollRefProp,
            containerStyle: containerStyleProp,
            ...rest
        } = props;

        invariant(!(children && typeof children !== 'function'), 'Children should be a function');

        /* Expose some methods in ref */
        useImperativeHandle(forwardedRef, () => {
            return {
                scrollTo,
                scrollBy,
                scrollToItem,
                stage: stageRef.current,
                container: containerRef.current,
                resetAfterIndices,
                getScrollPosition,
                isMergedCell,
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
            };
        });

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
        const stageRef = useRef<Konva.Stage>(null);
        // TODO - correct the type
        const containerRef = useRef<any>(null);

        const scrollContainerRef = useRef<any>(null);
        const verticalScrollRef = useRef<any>(null);
        const wheelingRef = useRef<number | null>(null);
        const horizontalScrollRef = useRef<any>(null);

        useImperativeHandle(verticalScrollRefProp, () => verticalScrollRef.current);

        const snapToRowThrottler = useRef<({ deltaY }: SnapRowProps) => void>();
        const snapToColumnThrottler = useRef<({ deltaX }: SnapColumnProps) => void>();

        const [_, forceRender] = useReducer(s => s + 1, 0);
        const [scrollState, setScrollState] = useState<ScrollState>({
            scrollTop: 0,
            scrollLeft: 0,
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
            [],
        );

        /**
         * Create a map of merged cells
         * [rowIndex, columnindex] => [parentRowIndex, parentColumnIndex]
         */
        const mergedCellMap = useMemo((): MergedCellMap => {
            const mergedCellMap = new Map();
            for (let i = 0; i < mergedCells.length; i++) {
                const bounds = mergedCells[i];
                for (const cell of getBoundedCells(bounds)) {
                    mergedCellMap.set(cell, bounds);
                }
            }
            return mergedCellMap;
        }, [mergedCells]);

        /* Check if a cell is part of a merged cell */
        const isMergedCell = useCallback(
            ({ rowIndex, columnIndex }: CellInterface) => {
                return mergedCellMap.has(cellIdentifier(rowIndex, columnIndex));
            },
            [mergedCellMap],
        );

        /* Get top, left bounds of a cell */
        const getCellBounds = useCallback(
            ({ rowIndex, columnIndex }: CellInterface, spanMerges: boolean = true): AreaProps => {
                if (spanMerges) {
                    const isMerged = isMergedCell({ rowIndex, columnIndex });
                    if (isMerged)
                        return mergedCellMap.get(
                            cellIdentifier(rowIndex, columnIndex),
                        ) as AreaProps;
                }

                return {
                    top: rowIndex,
                    left: columnIndex,
                    right: columnIndex,
                    bottom: rowIndex,
                } as AreaProps;
            },
            [isMergedCell, mergedCellMap],
        );

        /* Get top, left bounds of a cell */
        const getActualCellCoords = useCallback(
            ({ rowIndex, columnIndex }: CellInterface): CellInterface => {
                const isMerged = isMergedCell({ rowIndex, columnIndex });
                if (isMerged) {
                    const cell = mergedCellMap.get(
                        cellIdentifier(rowIndex, columnIndex),
                    ) as AreaProps;
                    return {
                        rowIndex: cell?.top,
                        columnIndex: cell?.left,
                    };
                }

                return {
                    rowIndex,
                    columnIndex,
                };
            },
            [isMergedCell, mergedCellMap],
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
            ]);

        const estimatedTotalHeight = getEstimatedTotalHeight(rowCount, instanceProps.current);
        const estimatedTotalWidth = getEstimatedTotalWidth(columnCount, instanceProps.current);

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

                    verticalScrollRef.current.scrollTop +=
                        (direction === Direction.Up ? -1 : 1) * rowHeight;
                }
            },
            [getRowHeight],
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

                    horizontalScrollRef.current.scrollLeft +=
                        (direction === Direction.Left ? -1 : 1) * columnWidth;
                }
            },
            [getColumnWidth],
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

                if (!stageRef.current) return null;

                const stage = stageRef.current.getStage();
                const rect = containerRef.current?.getBoundingClientRect();

                if (rect) {
                    left = left - rect.x;
                    top = top - rect.y;
                }
                const { x, y } = stage
                    .getAbsoluteTransform()
                    .copy()
                    .invert()
                    .point({ x: left, y: top });

                return { x, y };
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

                if (rowOffset > estimatedTotalHeight || columnOffset > estimatedTotalWidth) {
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
            [resetAfterIndices],
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
            [resetAfterIndices],
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

        /* Scroll based on left, top position */
        const scrollTo = useCallback(
            ({ scrollTop, scrollLeft }: OptionalScrollCoords) => {
                /* If scrollbar is visible, lets update it which triggers a state change */
                if (showScrollbar) {
                    if (horizontalScrollRef.current && scrollLeft !== void 0)
                        horizontalScrollRef.current.scrollLeft = scrollLeft;
                    if (verticalScrollRef.current && scrollTop !== void 0)
                        verticalScrollRef.current.scrollTop = scrollTop;
                } else {
                    setScrollState(prev => {
                        return {
                            ...prev,
                            scrollLeft: scrollLeft == void 0 ? prev.scrollLeft : scrollLeft,
                            scrollTop: scrollTop == void 0 ? prev.scrollTop : scrollTop,
                        };
                    });
                }
            },
            [showScrollbar],
        );

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
                        horizontalScrollRef.current.scrollLeft += x;

                    if (verticalScrollRef.current && y !== void 0)
                        verticalScrollRef.current.scrollTop += y;
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
            [showScrollbar],
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

        /**
         * Fired when user tries to scroll the canvas
         */
        const handleWheel = useCallback(
            (event: WheelEvent) => {
                /* If user presses shift key, scroll horizontally */
                const isScrollingHorizontally = event.shiftKey;

                /* Prevent browser back in Mac */
                event.preventDefault();
                const { deltaX, deltaY, deltaMode } = event;
                /* Scroll natively */
                if (wheelingRef.current) return;

                const dx = isScrollingHorizontally ? deltaY : deltaX;
                let dy = deltaY;

                /* Scroll only in one direction */
                const isHorizontal = isScrollingHorizontally || Math.abs(dx) > Math.abs(dy);

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
                    ? horizontalScrollRef.current?.scrollLeft
                    : verticalScrollRef.current?.scrollTop;

                wheelingRef.current = window.requestAnimationFrame(() => {
                    wheelingRef.current = null;

                    if (isHorizontal) {
                        if (horizontalScrollRef.current)
                            horizontalScrollRef.current.scrollLeft = currentScroll + dx;
                    } else {
                        if (verticalScrollRef.current)
                            verticalScrollRef.current.scrollTop = currentScroll + dy;
                    }
                });
            },
            [scrollbarSize, snap],
        );

        /**
         * Handle mouse wheeel
         */
        useEffect(() => {
            const scrollContainerEl = scrollContainerRef.current;

            scrollContainerEl?.addEventListener('wheel', handleWheel, {
                passive: false,
            });
            isMounted.current = true;

            return () => {
                scrollContainerEl?.removeEventListener('wheel', handleWheel);
            };
        }, [handleWheel]);

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

        /* Draw gridlines */
        const gridLines = [];
        const gridLinesFrozenRow = [];
        const gridLinesFrozenColumn = [];
        const gridLinesFrozenIntersection = [];

        if (showGridLines) {
            // Horizontal
            for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
                /* Ignore frozen rows */
                if (rowIndex < frozenRows || isHiddenRow?.(rowIndex)) continue;

                const x1 = getColumnOffset(frozenColumns);
                const x2 = getColumnOffset(Math.min(columnStopIndex + 1, columnCount));
                const y1 = getRowOffset(Math.min(rowIndex + 1, rowCount));
                const y2 = y1;

                gridLines.push(
                    gridLineRenderer({
                        points: [x1, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetY: -0.5,
                        key: itemKey({ rowIndex: rowIndex, columnIndex: y1 }),
                    }),
                );

                gridLinesFrozenColumn.push(
                    gridLineRenderer({
                        points: [0, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetY: -0.5,
                        key: itemKey({ rowIndex: rowIndex, columnIndex: y1 }),
                    }),
                );
            }
            // Vertical
            for (
                let columnIndex = columnStartIndex;
                columnIndex <= columnStopIndex;
                columnIndex++
            ) {
                const x1 = getColumnOffset(Math.min(columnIndex + 1, columnCount));
                const x2 = x1;
                const y1 = getRowOffset(frozenRows);
                const y2 = getRowOffset(Math.min(rowStopIndex + 1, rowCount));

                gridLines.push(
                    gridLineRenderer({
                        points: [x1, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetX: -0.5,
                        key: itemKey({ rowIndex: x1, columnIndex: columnIndex }),
                    }),
                );

                gridLinesFrozenRow.push(
                    gridLineRenderer({
                        points: [x1, 0, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetX: -0.5,
                        key: itemKey({ rowIndex: x1, columnIndex: columnIndex }),
                    }),
                );
            }

            for (let rowIndex = 0; rowIndex < Math.min(columnStopIndex, frozenRows); rowIndex++) {
                if (isHiddenRow?.(rowIndex)) continue;

                const x1 = 0;
                const x2 = getColumnOffset(Math.min(columnStopIndex + 1, columnCount));
                const y1 = getRowOffset(Math.min(rowIndex + 1, rowCount));
                const y2 = y1;

                gridLinesFrozenRow.push(
                    gridLineRenderer({
                        points: [x1, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetY: -0.5,
                        key: itemKey({ rowIndex: rowIndex, columnIndex: y1 }),
                    }),
                );

                gridLinesFrozenIntersection.push(
                    gridLineRenderer({
                        points: [x1, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetY: -0.5,
                        key: itemKey({ rowIndex: rowIndex, columnIndex: y1 }),
                    }),
                );
            }

            for (
                let columnIndex = 0;
                columnIndex < Math.min(columnStopIndex, frozenColumns);
                columnIndex++
            ) {
                const x1 = getColumnOffset(Math.min(columnIndex + 1, columnCount));
                const x2 = x1;
                const y1 = 0;
                const y2 = getRowOffset(Math.min(rowStopIndex + 1, rowCount));

                gridLinesFrozenColumn.push(
                    gridLineRenderer({
                        points: [x1, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetX: -0.5,
                        key: itemKey({ rowIndex: x1, columnIndex: columnIndex }),
                    }),
                );

                gridLinesFrozenIntersection.push(
                    gridLineRenderer({
                        points: [x1, y1, x2, y2],
                        stroke: gridLineColor,
                        strokeWidth: gridLineWidth,
                        offsetX: -0.5,
                        key: itemKey({ rowIndex: x1, columnIndex: columnIndex }),
                    }),
                );
            }
        }

        const mergedCellRenderMap = new Set();

        /* Draw all cells */
        const cells: React.ReactNode[] = [];
        /**
         * Lets users draw cells on top of existing canvas
         */
        const cellOverlays: React.ReactNode[] = [];

        if (columnCount > 0 && rowCount) {
            for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
                /* Skip frozen rows */
                if (rowIndex < frozenRows || isHiddenRow?.(rowIndex)) {
                    continue;
                }
                /**
                 * Do any pre-processing of the row before being renderered.
                 * Useful for `react-table` to call `prepareRow(row)`
                 */
                onBeforeRenderRow?.(rowIndex);

                for (
                    let columnIndex = columnStartIndex;
                    columnIndex <= columnStopIndex;
                    columnIndex++
                ) {
                    /**
                     * Skip frozen columns
                     * Skip merged cells that are out of bounds
                     */
                    if (columnIndex < frozenColumns) {
                        continue;
                    }

                    const isMerged = isMergedCell({ rowIndex, columnIndex });
                    const bounds = getCellBounds({ rowIndex, columnIndex });
                    const actualRowIndex = rowIndex;
                    const actualColumnIndex = columnIndex;
                    const actualBottom = Math.max(rowIndex, bounds.bottom);
                    const actualRight = Math.max(columnIndex, bounds.right);

                    if (!isMerged && isHiddenCell?.(actualRowIndex, actualColumnIndex)) {
                        continue;
                    }

                    if (isMerged) {
                        const cellId = cellIdentifier(bounds.top, bounds.left);
                        if (mergedCellRenderMap.has(cellId)) {
                            continue;
                        }
                        mergedCellRenderMap.add(cellId);
                    }

                    const y = getRowOffset(actualRowIndex);
                    const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

                    const x = getColumnOffset(actualColumnIndex);

                    const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

                    cells.push(
                        itemRenderer({
                            x,
                            y,
                            width,
                            height,
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                            isMergedCell: isMerged,
                            key: itemKey({
                                rowIndex: actualRowIndex,
                                columnIndex: actualColumnIndex,
                            }),
                        }),
                    );

                    if (enableCellOverlay) {
                        cellOverlays.push(
                            overlayRenderer({
                                x,
                                y,
                                width,
                                height,
                                rowIndex: actualRowIndex,
                                columnIndex: actualColumnIndex,
                                isMergedCell: isMerged,
                                key: itemKey({
                                    rowIndex: actualRowIndex,
                                    columnIndex: actualColumnIndex,
                                }),
                            }),
                        );
                    }
                }
            }
        }

        /**
         * Extend certain cells.
         * Mimics google sheets functionality where
         * oevrflowed cell content can cover adjacent cells
         */
        const ranges = [];
        for (const { rowIndex, columnIndex, toColumnIndex } of cellAreas) {
            if (
                rowIndex < frozenRows ||
                columnIndex < frozenColumns ||
                isMergedCell({ rowIndex, columnIndex }) ||
                isHiddenCell?.(rowIndex, columnIndex)
            ) {
                continue;
            }

            const x = getColumnOffset(columnIndex);
            const y = getRowOffset(rowIndex);
            const height = getRowHeight(rowIndex);

            const { x: offsetX = 0 } = getCellOffsetFromCoords({
                rowIndex,
                columnIndex: toColumnIndex + 1,
            });

            ranges.push(
                itemRenderer({
                    x,
                    y,
                    width: offsetX - x,
                    height,
                    rowIndex,
                    columnIndex,
                    key: `range:${itemKey({ rowIndex, columnIndex })}`,
                }),
            );
        }

        /* Draw frozen rows */
        const frozenRowCells = [];
        const frozenRowCellOverlays: React.ReactNode[] = [];
        for (let rowIndex = 0; rowIndex < Math.min(rowStopIndex, frozenRows); rowIndex++) {
            if (isHiddenRow?.(rowIndex)) continue;
            /**
             * Do any pre-processing of the row before being renderered.
             * Useful for `react-table` to call `prepareRow(row)`
             */
            onBeforeRenderRow?.(rowIndex);

            for (
                let columnIndex = columnStartIndex;
                columnIndex <= columnStopIndex;
                columnIndex++
            ) {
                if (columnIndex < frozenColumns) {
                    continue;
                }

                const isMerged = isMergedCell({ rowIndex, columnIndex });
                const bounds = getCellBounds({ rowIndex, columnIndex });
                const actualRowIndex = rowIndex;
                const actualColumnIndex = columnIndex;
                const actualBottom = Math.max(rowIndex, bounds.bottom);
                const actualRight = Math.max(columnIndex, bounds.right);

                if (!isMerged && isHiddenCell?.(actualRowIndex, actualColumnIndex)) {
                    continue;
                }

                if (isMerged) {
                    const cellId = cellIdentifier(bounds.top, bounds.left);
                    if (mergedCellRenderMap.has(cellId)) {
                        continue;
                    }
                    mergedCellRenderMap.add(cellId);
                }

                const y = getRowOffset(actualRowIndex);
                const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

                const x = getColumnOffset(actualColumnIndex);

                const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

                frozenRowCells.push(
                    itemRenderer({
                        x,
                        y,
                        width,
                        height,
                        rowIndex: actualRowIndex,
                        columnIndex: actualColumnIndex,
                        isMergedCell: isMerged,
                        key: itemKey({
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                        }),
                    }),
                );

                if (enableCellOverlay) {
                    frozenRowCellOverlays.push(
                        overlayRenderer({
                            x,
                            y,
                            width,
                            height,
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                            isMergedCell: isMerged,
                            key: itemKey({
                                rowIndex: actualRowIndex,
                                columnIndex: actualColumnIndex,
                            }),
                        }),
                    );
                }
            }
        }

        /* Draw frozen columns */
        const frozenColumnCells = [];
        const frozenColumnCellOverlays = [];

        for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
            if (rowIndex < frozenRows || isHiddenRow?.(rowIndex)) {
                continue;
            }
            /**
             * Do any pre-processing of the row before being renderered.
             * Useful for `react-table` to call `prepareRow(row)`
             */
            onBeforeRenderRow?.(rowIndex);

            for (
                let columnIndex = 0;
                columnIndex < Math.min(columnStopIndex, frozenColumns);
                columnIndex++
            ) {
                const bounds = getCellBounds({ rowIndex, columnIndex });
                const actualRowIndex = rowIndex;
                const actualColumnIndex = columnIndex;
                const actualBottom = Math.max(rowIndex, bounds.bottom);
                const actualRight = Math.max(columnIndex, bounds.right);
                if (isHiddenCell?.(actualRowIndex, actualColumnIndex)) {
                    continue;
                }

                const y = getRowOffset(actualRowIndex);
                const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

                const x = getColumnOffset(actualColumnIndex);

                const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

                frozenColumnCells.push(
                    itemRenderer({
                        x,
                        y,
                        width,
                        height,
                        rowIndex: actualRowIndex,
                        columnIndex: actualColumnIndex,
                        key: itemKey({
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                        }),
                    }),
                );

                if (enableCellOverlay) {
                    frozenColumnCellOverlays.push(
                        overlayRenderer({
                            x,
                            y,
                            width,
                            height,
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                            key: itemKey({
                                rowIndex: actualRowIndex,
                                columnIndex: actualColumnIndex,
                            }),
                        }),
                    );
                }
            }
        }

        /**
         * Frozen column shadow
         */
        const frozenColumnShadow = useMemo(() => {
            const frozenColumnLineX = getColumnOffset(frozenColumns);
            const frozenColumnLineY = getRowOffset(Math.min(rowStopIndex + 1, rowCount));

            return (
                <Line
                    points={[frozenColumnLineX, 0, frozenColumnLineX, frozenColumnLineY]}
                    offsetX={-0.5}
                    strokeWidth={1}
                    shadowForStrokeEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={0}
                    listening={false}
                    perfectDrawEnabled={false}
                    {...shadowSettings}
                />
            );
        }, [getColumnOffset, frozenColumns, getRowOffset, rowStopIndex, rowCount, shadowSettings]);

        /**
         * Frozen row shadow
         */
        const frozenRowShadow = useMemo(() => {
            const frozenRowLineY = getRowOffset(frozenRows);
            const frozenRowLineX = getColumnOffset(Math.min(columnStopIndex + 1, columnCount));

            return (
                <Line
                    points={[0, frozenRowLineY, frozenRowLineX, frozenRowLineY]}
                    offsetY={-0.5}
                    strokeWidth={1}
                    shadowForStrokeEnabled={false}
                    strokeScaleEnabled={false}
                    hitStrokeWidth={0}
                    listening={false}
                    perfectDrawEnabled={false}
                    {...shadowSettings}
                />
            );
        }, [
            getRowOffset,
            frozenRows,
            getColumnOffset,
            columnStopIndex,
            columnCount,
            shadowSettings,
        ]);

        /* Draw frozen intersection cells */
        const frozenIntersectionCells = [];
        const frozenIntersectionCellOverlays = [];

        for (let rowIndex = 0; rowIndex < Math.min(rowStopIndex, frozenRows); rowIndex++) {
            if (isHiddenRow?.(rowIndex)) continue;

            for (
                let columnIndex = 0;
                columnIndex < Math.min(columnStopIndex, frozenColumns);
                columnIndex++
            ) {
                const isMerged = isMergedCell({ rowIndex, columnIndex });
                const bounds = getCellBounds({ rowIndex, columnIndex });
                const actualRowIndex = rowIndex;
                const actualColumnIndex = columnIndex;
                const actualBottom = Math.max(rowIndex, bounds.bottom);
                const actualRight = Math.max(columnIndex, bounds.right);

                if (!isMerged && isHiddenCell?.(actualRowIndex, actualColumnIndex)) {
                    continue;
                }

                if (isMerged) {
                    const cellId = cellIdentifier(bounds.top, bounds.left);
                    if (mergedCellRenderMap.has(cellId)) {
                        continue;
                    }
                    mergedCellRenderMap.add(cellId);
                }

                const y = getRowOffset(actualRowIndex);
                const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

                const x = getColumnOffset(actualColumnIndex);

                const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

                frozenIntersectionCells.push(
                    itemRenderer({
                        x,
                        y,
                        width,
                        height,
                        rowIndex: actualRowIndex,
                        columnIndex: actualColumnIndex,
                        isMergedCell: isMerged,
                        key: itemKey({
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                        }),
                    }),
                );

                if (enableCellOverlay) {
                    frozenIntersectionCellOverlays.push(
                        overlayRenderer({
                            x,
                            y,
                            width,
                            height,
                            rowIndex: actualRowIndex,
                            columnIndex: actualColumnIndex,
                            isMergedCell: isMerged,
                            key: itemKey({
                                rowIndex: actualRowIndex,
                                columnIndex: actualColumnIndex,
                            }),
                        }),
                    );
                }
            }
        }

        /**
         * Renders active cell
         */
        let fillHandleDimension = {};
        let activeCellSelection = null;
        let activeCellSelectionFrozenColumn = null;
        let activeCellSelectionFrozenRow = null;
        let activeCellSelectionFrozenIntersection = null;
        if (activeCell) {
            const bounds = getCellBounds(activeCell);
            const { top, left, right, bottom } = bounds;
            const actualBottom = Math.min(rowStopIndex, bottom);
            const actualRight = Math.min(columnStopIndex, right);
            const isInFrozenColumn = left < frozenColumns;
            const isInFrozenRow = top < frozenRows;
            const isInFrozenIntersection = isInFrozenRow && isInFrozenColumn;
            const y = getRowOffset(top);
            const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

            const x = getColumnOffset(left);

            const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

            const cell = selectionRenderer({
                stroke: selectionBorderColor,
                strokeWidth: activeCellStrokeWidth,
                fill: 'transparent',
                x: x,
                y: y,
                width: width,
                height: height,
                type: 'activeCell',
                key: 0,
                activeCell,
                isDragging: isDraggingSelection,
                /* Active cell is draggable only there are no other selections */
                draggable: enableSelectionDrag && !selections.length,
            });

            if (isInFrozenIntersection) {
                activeCellSelectionFrozenIntersection = cell;
            } else if (isInFrozenRow) {
                activeCellSelectionFrozenRow = cell;
            } else if (isInFrozenColumn) {
                activeCellSelectionFrozenColumn = cell;
            } else {
                activeCellSelection = cell;
            }

            fillHandleDimension = {
                x: x + width,
                y: y + height,
            };
        }

        /**
         * Convert selections to area
         * Removed useMemo as changes to lastMeasureRowIndex, lastMeasuredColumnIndex,
         * does not trigger useMemo
         * Dependencies : [selections, rowStopIndex, columnStopIndex, instanceProps]
         */

        const isSelectionInProgress = false;
        const selectionAreas = [];
        const selectionAreasFrozenColumns = [];
        const selectionAreasFrozenRows = [];
        const selectionAreasIntersection = [];

        for (let i = 0; i < selections.length; i++) {
            const selection = selections[i];
            const { bounds, inProgress, style } = selection;
            const { top, left, right, bottom } = bounds;
            const selectionBounds = { x: 0, y: 0, width: 0, height: 0 };
            const actualBottom = Math.min(rowStopIndex, bottom);
            const actualRight = Math.min(columnStopIndex, right);
            const isLeftBoundFrozen = left < frozenColumns;
            const isTopBoundFrozen = top < frozenRows;
            const isIntersectionFrozen = top < frozenRows && left < frozenColumns;
            const isLast = i === selections.length - 1;
            const styles = {
                stroke: inProgress ? selectionBackgroundColor : selectionBorderColor,
                fill: selectionBackgroundColor,
                strokeWidth: isDraggingSelection ? 0 : 1,
                isDragging: isDraggingSelection,
                draggable: inProgress ? false : enableSelectionDrag,
                ...style,
            };
            /**
             * If selection is in progress,
             * use this variable to hide fill handle
             */
            // if (inProgress) {
            //     isSelectionInProgress = true;
            // }
            selectionBounds.y = getRowOffset(top);
            selectionBounds.height =
                getRowOffset(actualBottom) - selectionBounds.y + getRowHeight(actualBottom);

            selectionBounds.x = getColumnOffset(left);

            selectionBounds.width =
                getColumnOffset(actualRight) - selectionBounds.x + getColumnWidth(actualRight);

            if (isLeftBoundFrozen) {
                const frozenColumnSelectionWidth =
                    getColumnOffset(Math.min(right + 1, frozenColumns)) - getColumnOffset(left);
                selectionAreasFrozenColumns.push(
                    selectionRenderer({
                        ...styles,
                        type: 'selection',
                        key: i,
                        x: selectionBounds.x,
                        y: selectionBounds.y,
                        width: frozenColumnSelectionWidth,
                        height: selectionBounds.height,
                        strokeRightWidth:
                            frozenColumnSelectionWidth === selectionBounds.width &&
                            !isDraggingSelection
                                ? selectionStrokeWidth
                                : 0,
                        selection,
                        inProgress,
                    }),
                );
            }

            if (isTopBoundFrozen) {
                const frozenRowSelectionHeight =
                    getRowOffset(Math.min(bottom + 1, frozenRows)) - getRowOffset(top);
                selectionAreasFrozenRows.push(
                    selectionRenderer({
                        ...styles,
                        type: 'selection',
                        key: i,
                        x: selectionBounds.x,
                        y: selectionBounds.y,
                        width: selectionBounds.width,
                        height: frozenRowSelectionHeight,
                        strokeBottomWidth:
                            frozenRowSelectionHeight === selectionBounds.height &&
                            !isDraggingSelection
                                ? selectionStrokeWidth
                                : 0,
                        selection,
                        inProgress,
                    }),
                );
            }

            if (isIntersectionFrozen) {
                const frozenIntersectionSelectionHeight =
                    getRowOffset(Math.min(bottom + 1, frozenRows)) - getRowOffset(top);

                const frozenIntersectionSelectionWidth =
                    getColumnOffset(Math.min(right + 1, frozenColumns)) - getColumnOffset(left);

                selectionAreasIntersection.push(
                    selectionRenderer({
                        ...styles,
                        type: 'selection',
                        key: i,
                        x: selectionBounds.x,
                        y: selectionBounds.y,
                        width: frozenIntersectionSelectionWidth,
                        height: frozenIntersectionSelectionHeight,
                        strokeBottomWidth:
                            frozenIntersectionSelectionHeight === selectionBounds.height &&
                            !isDraggingSelection
                                ? selectionStrokeWidth
                                : 0,
                        strokeRightWidth:
                            frozenIntersectionSelectionWidth === selectionBounds.width &&
                            !isDraggingSelection
                                ? selectionStrokeWidth
                                : 0,
                        selection,
                        inProgress,
                    }),
                );
            }
            selectionAreas.push(
                selectionRenderer({
                    ...styles,
                    type: 'selection',
                    key: i,
                    x: selectionBounds.x,
                    y: selectionBounds.y,
                    width: selectionBounds.width,
                    height: selectionBounds.height,
                    selection,
                    inProgress,
                }),
            );

            if (isLast) {
                fillHandleDimension = {
                    x: selectionBounds.x + selectionBounds.width,
                    y: selectionBounds.y + selectionBounds.height,
                };
            }
        }

        /**
         * Fillselection
         */
        let fillSelections = null;
        if (fillSelection) {
            const { bounds } = fillSelection;
            const { top, left, right, bottom } = bounds;
            const actualBottom = Math.min(rowStopIndex, bottom);
            const actualRight = Math.min(columnStopIndex, right);
            const x = getColumnOffset(left);
            const y = getRowOffset(top);
            const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);
            const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

            fillSelections = selectionRenderer({
                type: 'fill',
                x,
                y,
                width,
                height,
                key: -1,
                stroke: 'gray',
                strokeStyle: 'dashed',
            });
        }

        const borderStyleCells = [];
        const borderStyleCellsFrozenColumns = [];
        const borderStyleCellsFrozenRows = [];
        const borderStyleCellsIntersection = [];

        for (let i = 0; i < borderStyles.length; i++) {
            const { bounds, style, title: _, ..._rest } = borderStyles[i];
            const { top, right, bottom, left } = bounds;
            const isLeftBoundFrozen = left < frozenColumns;
            const isTopBoundFrozen = top < frozenRows;
            const isIntersectionFrozen = top < frozenRows && left < frozenColumns;
            const x = getColumnOffset(left);
            const y = getRowOffset(top);
            const width = getColumnOffset(Math.min(columnCount, right + 1)) - x;
            const height = getRowOffset(Math.min(rowCount, bottom + 1)) - y;

            borderStyleCells.push(
                createHTMLBox({
                    ..._rest,
                    ...style,
                    x,
                    y,
                    key: i,
                    width,
                    height,
                    type: 'border',
                }),
            );

            if (isLeftBoundFrozen) {
                const frozenColumnSelectionWidth =
                    getColumnOffset(Math.min(right + 1, frozenColumns)) - getColumnOffset(left);

                borderStyleCellsFrozenColumns.push(
                    createHTMLBox({
                        ..._rest,
                        ...style,
                        type: 'border',
                        x,
                        y,
                        key: i,
                        width: frozenColumnSelectionWidth,
                        height,
                        strokeRightWidth:
                            frozenColumnSelectionWidth === width
                                ? style?.strokeRightWidth || style?.strokeWidth
                                : 0,
                    }),
                );
            }

            if (isTopBoundFrozen) {
                const frozenRowSelectionHeight =
                    getRowOffset(Math.min(bottom + 1, frozenRows)) - getRowOffset(top);

                borderStyleCellsFrozenRows.push(
                    createHTMLBox({
                        ..._rest,
                        ...style,
                        type: 'border',
                        x,
                        y,
                        key: i,
                        width,
                        height: frozenRowSelectionHeight,
                        strokeBottomWidth:
                            frozenRowSelectionHeight === height
                                ? style?.strokeBottomWidth || style?.strokeWidth
                                : 0,
                    }),
                );
            }

            if (isIntersectionFrozen) {
                const frozenIntersectionSelectionHeight =
                    getRowOffset(Math.min(bottom + 1, frozenRows)) - getRowOffset(top);

                const frozenIntersectionSelectionWidth =
                    getColumnOffset(Math.min(right + 1, frozenColumns)) - getColumnOffset(left);

                borderStyleCellsIntersection.push(
                    createHTMLBox({
                        ..._rest,
                        ...style,
                        type: 'border',
                        x,
                        y,
                        key: i,
                        width: frozenIntersectionSelectionWidth,
                        height: frozenIntersectionSelectionHeight,
                        strokeBottomWidth:
                            frozenIntersectionSelectionHeight === height ? selectionStrokeWidth : 0,
                        strokeRightWidth:
                            frozenIntersectionSelectionWidth === width ? selectionStrokeWidth : 0,
                    }),
                );
            }
        }

        /* Spacing for frozen row/column clip */
        const frozenSpacing = 1;
        /**
         * Prevents drawing hit region when scrolling
         */
        const listenToEvents = !isScrolling;
        /* Frozen row shadow */
        const frozenRowShadowComponent =
            showFrozenShadow && frozenRows !== 0 ? frozenRowShadow : null;
        /* Frozen column shadow */
        const frozenColumnShadowComponent =
            showFrozenShadow && frozenColumns !== 0 ? frozenColumnShadow : null;

        const { View, ScrollView } = useMolecules();

        const stageChildren = (
            <>
                <Layer>
                    <Group
                        clipX={frozenColumnWidth}
                        clipY={frozenRowHeight}
                        clipWidth={containerWidth - frozenColumnWidth}
                        clipHeight={containerHeight - frozenRowHeight}>
                        <Group offsetY={scrollTop} offsetX={scrollLeft}>
                            {gridLines}
                            {cells}
                            {cellOverlays}
                            {ranges}
                        </Group>
                    </Group>

                    <Group
                        clipX={frozenColumnWidth}
                        clipY={0}
                        clipWidth={containerWidth - frozenColumnWidth}
                        clipHeight={frozenRowHeight + frozenSpacing}>
                        <Group offsetY={0} offsetX={scrollLeft}>
                            {gridLinesFrozenRow}
                            {frozenRowCells}
                            {frozenRowShadowComponent}
                            {frozenRowCellOverlays}
                        </Group>
                    </Group>
                    <Group
                        clipX={0}
                        clipY={frozenRowHeight}
                        clipWidth={frozenColumnWidth + frozenSpacing}
                        clipHeight={containerHeight - frozenRowHeight}>
                        <Group offsetY={scrollTop} offsetX={0}>
                            {gridLinesFrozenColumn}
                            {frozenColumnCells}
                            {frozenColumnShadowComponent}
                            {frozenColumnCellOverlays}
                        </Group>
                    </Group>
                    <Group
                        offsetY={0}
                        offsetX={0}
                        clipX={0}
                        clipY={0}
                        clipWidth={frozenColumnWidth + frozenSpacing}
                        clipHeight={frozenRowHeight + frozenSpacing}>
                        {gridLinesFrozenIntersection}
                        {frozenIntersectionCells}
                        {frozenRowShadowComponent}
                        {frozenColumnShadowComponent}
                        {frozenIntersectionCellOverlays}
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
        const fillHandleWidth = 8;
        const fillhandleComponent =
            showFillHandle && !isSelectionInProgress ? (
                <FillHandle
                    {...fillHandleDimension}
                    stroke={selectionBorderColor}
                    size={fillHandleWidth}
                    borderColor={fillhandleBorderColor}
                    {...fillHandleProps}
                />
            ) : null;

        const {
            tableSelectionContainer,
            tableSelectionContainerInner,
            frozenColumnsSelectionContainer,
            frozenColumnsSelectionContainerInner,
            frozenRowsSelectionContainer,
            frozenRowsSelectionContainerInner,
            frozenRowsAndColumnsSelectionArea,
        } = useMemo(
            () => ({
                tableSelectionContainer: {
                    position: 'absolute',
                    left: frozenColumnWidth,
                    top: frozenRowHeight,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden',
                } as ViewStyle,
                tableSelectionContainerInner: {
                    transform: [
                        {
                            translateX: -(scrollLeft + frozenColumnWidth),
                        },
                        {
                            translateY: -(scrollTop + frozenRowHeight),
                        },
                    ],
                    // transform: `translate(-${scrollLeft + frozenColumnWidth}px, -${
                    //     scrollTop + frozenRowHeight
                    // }px)`,
                } as ViewStyle,
                frozenColumnsSelectionContainer: {
                    position: 'absolute',
                    width: frozenColumnWidth + fillHandleWidth,
                    top: frozenRowHeight,
                    left: 0,
                    bottom: 0,
                    overflow: 'hidden',
                } as ViewStyle,
                frozenColumnsSelectionContainerInner: {
                    transform: [{ translateX: 0 }, { translateY: -(scrollTop + frozenRowHeight) }],
                    // transform: `translate(0, -${scrollTop + frozenRowHeight}px)`,
                } as ViewStyle,
                frozenRowsSelectionContainer: {
                    position: 'absolute',
                    height: frozenRowHeight + fillHandleWidth,
                    left: frozenColumnWidth,
                    right: 0,
                    top: 0,
                    overflow: 'hidden',
                } as ViewStyle,
                frozenRowsSelectionContainerInner: {
                    transform: [
                        { translateX: -(scrollLeft + frozenColumnWidth) },
                        { translateY: 0 },
                    ],
                    // transform: `translate(-${scrollLeft + frozenColumnWidth}px, 0)`,
                } as ViewStyle,
                frozenRowsAndColumnsSelectionArea: {
                    position: 'absolute',
                    height: frozenRowHeight + fillHandleWidth,
                    width: frozenColumnWidth + fillHandleWidth,
                    left: 0,
                    top: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                } as ViewStyle,
            }),
            [frozenColumnWidth, frozenRowHeight, scrollLeft, scrollTop],
        );

        // TODO -replace with VIew
        const selectionChildren = (
            <div style={selectionContainer}>
                <View style={tableSelectionContainer}>
                    <View style={tableSelectionContainerInner} testID="table-selection-container">
                        {borderStyleCells}
                        {fillSelections}
                        {selectionAreas}
                        {activeCellSelection}
                        {fillhandleComponent}
                    </View>
                </View>
                {frozenColumns ? (
                    <View style={frozenColumnsSelectionContainer}>
                        <View style={frozenColumnsSelectionContainerInner}>
                            {borderStyleCellsFrozenColumns}
                            {selectionAreasFrozenColumns}
                            {activeCellSelectionFrozenColumn}
                            {fillhandleComponent}
                        </View>
                    </View>
                ) : null}
                {frozenRows ? (
                    <View style={frozenRowsSelectionContainer}>
                        <View style={frozenRowsSelectionContainerInner}>
                            {borderStyleCellsFrozenRows}
                            {selectionAreasFrozenRows}
                            {activeCellSelectionFrozenRow}
                            {fillhandleComponent}
                        </View>
                    </View>
                ) : null}
                {frozenRows && frozenColumns ? (
                    <View style={frozenRowsAndColumnsSelectionArea}>
                        {borderStyleCellsIntersection}
                        {selectionAreasIntersection}
                        {activeCellSelectionFrozenIntersection}
                        {fillhandleComponent}
                    </View>
                ) : null}
            </div>
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
                ] as ViewStyle,
                innerContainerStyle: StyleSheet.flatten([
                    {
                        outline: 'none',
                    },
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

        return (
            <View style={containerStyle} ref={scrollContainerRef}>
                <div {...{ tabIndex: 0 }} ref={containerRef} style={innerContainerStyle} {...rest}>
                    <Stage
                        width={containerWidth}
                        height={containerHeight}
                        ref={stageRef}
                        listening={listenToEvents}
                        {...stageProps}>
                        {wrapper(stageChildren)}
                    </Stage>
                </div>
                {selectionChildren}
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
        );
    }),
);

const selectionContainer = { pointerEvents: 'none', outline: 'none' } as CSSProperties;

export default Grid;
