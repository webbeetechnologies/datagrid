import type { ShapeConfig } from 'konva/lib/Shape';
import type { StageConfig, Stage } from 'konva/lib/Stage';
import type { Key, RefObject, RefCallback, MutableRefObject } from 'react';
import type { ScrollView, ViewStyle } from 'react-native';
import type { Align } from './helpers';
import type { GroupRecord } from 'src/utils/grouping-types';
import type { Field } from '../../utils/types';

export enum KeyCodes {
    Right = 39,
    Left = 37,
    Up = 38,
    Down = 40,
    Escape = 27,
    Tab = 9,
    Meta = 91,
    Delete = 46,
    BackSpace = 8,
    Enter = 13,
    A = 65,
    SPACE = 32,
    ALT = 18,
    C = 67,
    Home = 36,
    End = 35,
    PageDown = 34,
    PageUp = 33,
    Z = 90,
    CapsLock = 20,
    KEY_B = 66,
    KEY_I = 73,
    KEY_U = 85,
    KEY_X = 88,
    KEY_L = 76,
    KEY_E = 69,
    KEY_R = 82,
    BACK_SLASH = 220,
    KEY_Y = 89,
    ScrollLock = 145,
    NumLock = 144,
    Pause = 19,
    Insert = 45,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123,
}

export enum Direction {
    Up = 'UP',
    Down = 'DOWN',
    Left = 'LEFT',
    Right = 'RIGHT',
}

export enum MimeType {
    html = 'text/html',
    csv = 'text/csv',
    plain = 'text/plain',
    json = 'application/json',
}

export enum MouseButtonCodes {
    'left' = 1,
    'middle' = 2,
    'right' = 3,
}

export type SelectionPolicy = 'single' | 'range' | 'multiple';

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
    // mergedCells?: AreaProps[];
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
    // cellAreas?: CellRangeArea[];
    /**
     * Cell renderer. Must be a Konva Component eg: Group, Rect etc
     */
    itemRenderer?: (props: RendererProps) => React.ReactNode;
    /**
     * Header Cell renderer. Must be a Konva Component eg: Group, Rect etc
     */
    headerCellRenderer?: (props: RendererProps) => React.ReactNode;
    headerHeight?: number;

    rowHeadCellRenderer?: (props: RendererProps) => React.ReactNode;
    rowHeadColumnWidth?: number;
    groupingLevel?: number;
    getRecordInfo: (rowIndex: number) => GroupRecord;
    getCellValue: (cell: CellInterface) => [any, { recordId: string; fieldId: string }];
    getField: (fieldId: string) => Field;
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
    overshootScrollWidth?: number;
    overshootScrollHeight?: number;
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

export type GridRef = Pick<GridProps, 'getCellValue' | 'getField' | 'getRecordInfo'> & {
    scrollTo: (scrollPosition: OptionalScrollCoords) => void;
    scrollBy: (pos: PosXY) => void;
    stage: Stage | null;
    container: HTMLDivElement | null;
    resetAfterIndices: (coords: OptionalCellInterface, shouldForceUpdate?: boolean) => void;
    getScrollPosition: () => ScrollCoords;
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
    getRowHeight: (index: number) => number;
    getColumnWidth: (index: number) => number;
    horizontalScrollRef: RefObject<ScrollView>;
    // renderCell: (
    //     ctx: SceneContext,
    //     props: CellInterface & {
    //         x: number;
    //         y: number;
    //         width: number;
    //         height: number;
    //         field: Field;
    //         recordId: string;
    //         colors: Record<string, any>;
    //         style: string;
    //         value: any;
    //     },
    // ) => void;
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

export interface ScrollSnapRef {
    visibleRowStartIndex: number;
    rowCount: number;
    frozenRows: number;
    visibleColumnStartIndex: number;
    columnCount: number;
    frozenColumns: number;
    isHiddenRow?: (rowIndex: number) => boolean;
    isHiddenColumn?: (columnIndex: number) => boolean;
}
