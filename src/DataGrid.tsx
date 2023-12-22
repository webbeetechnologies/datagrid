import React, {
    KeyboardEvent,
    MouseEvent,
    memo,
    useCallback,
    useRef,
    useState,
    ReactNode,
    useImperativeHandle,
    forwardRef,
    ForwardedRef,
    RefObject,
    useMemo,
} from 'react';
import { LayoutChangeEvent, StyleSheet } from 'react-native';
import { Rect, Text, Group } from 'react-konva';
import type { ViewProps } from '@bambooapp/bamboo-atoms';
import { useMergedRefs, useMolecules } from '@bambooapp/bamboo-molecules';
import type { Vector2d } from 'konva/lib/types';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { TextConfig } from 'konva/lib/shapes/Text';

import {
    InfiniteLoader,
    InfiniteLoaderProps,
    useInfiniteLoaderArgsContext,
} from './components/InfiniteLoader';
import {
    Grid,
    CanvasIcon,
    GridCell as DefaultCell,
    CellInterface,
    GridProps,
    GridRef,
    RendererProps,
    ScrollCoords,
    ViewPortProps,
} from './components';
import {
    useSelection,
    useEditable,
    SelectionResults,
    UseSelectionOptions,
    EditableResults,
    UseEditableOptions,
} from './hooks';

export type CellRendererProps = RendererProps & { useCellValue: Props['useCellValue'] };

export type Props = Pick<
    UseSelectionOptions,
    | 'onFill'
    | 'onSelectionEnd'
    | 'initialSelections'
    | 'initialActiveCell'
    | 'onActiveCellChange'
    | 'selectionTopBound'
    | 'selectionLeftBound'
    | 'selectionBottomBound'
    | 'selectionRightBound'
    | 'isHiddenRow'
    | 'isHiddenColumn'
    | 'onBeforeSelection'
    | 'onBeforeFill'
> &
    Pick<
        UseEditableOptions,
        | 'canEdit'
        | 'getEditor'
        | 'onDelete'
        | 'onBeforeEdit'
        | 'onChange'
        | 'onCancel'
        | 'useEditorConfig'
    > &
    Pick<
        GridProps,
        | 'showScrollbar'
        | 'rowHeight'
        | 'columnWidth'
        | 'rowCount'
        | 'columnCount'
        | 'stageProps'
        | 'frozenColumns'
        | 'mergedCells'
        | 'onViewChange'
        | 'onContextMenu'
    > &
    ViewProps & {
        width?: number;
        height?: number;
        useCellValue: <T>(
            cell: CellInterface | null,
        ) => [
            T,
            (
                newValue: T,
                activeCell: CellInterface,
                nextActiveCell: CellInterface | null | undefined,
            ) => void,
        ];
        rowCount: number;
        columnCount: number;
        innerContainerProps?: ViewProps;
        cellRenderer?: (props: CellRendererProps) => React.ReactNode;
        headerCellRenderer?: (props: RendererProps) => ReactNode;
        rowCountCellRenderer?: (props: RendererProps) => ReactNode;

        gridRef?: RefObject<GridRef>;
        headerGridRef?: RefObject<GridRef>;
        // countGridRef?: RefObject<GridRef>;
        headerHeight?: number;
        // records: TDataTableRow[];
        rowsLoadingThreshold?: InfiniteLoaderProps['threshold'];

        /**
         *
         * Infinite loader callback.
         * minimum batch size to fetch records.
         *
         */
        rowsMinimumBatchSize?: InfiniteLoaderProps['minimumBatchSize'];

        /**
         *
         * Infinite loader callback.
         * Will trigger everytime a new row is required to be loaded
         *
         */
        loadMoreRows?: (
            args: { startIndex: number; stopIndex: number },
            currentViewport: ViewPortProps,
        ) => void;

        /**
         *
         * derive if the cell has loaded or not
         * To be used for displaying a placeholder row.
         *
         */
        hasRowLoaded?: (index: number) => boolean;
        children?: ReactNode;
        headerGridProps?: Omit<
            GridProps,
            | 'itemRenderer'
            | 'containerStyle'
            | 'columnCount'
            | 'height'
            | 'width'
            | 'rowCount'
            | 'frozenColumns'
            | 'columnWidth'
            | 'rowHeight'
            | 'showScrollbar'
        >;
        bodyGridProps?: Omit<
            GridProps,
            | 'itemRenderer'
            | 'containerStyle'
            | 'columnCount'
            | 'height'
            | 'width'
            | 'rowCount'
            | 'frozenColumns'
            | 'columnWidth'
            | 'rowHeight'
            | 'showScrollbar'
        >;
    };

export type DataGridRef = Pick<
    SelectionResults,
    'selections' | 'activeCell' | 'setActiveCell' | 'setSelections'
> &
    Pick<EditableResults, 'isEditInProgress' | 'hideEditor'> & {
        infiniteLoader: InfiniteLoader | null;
    };

const dragHandleWidth = 5;

const dragBoundFunc = (pos: Vector2d) => {
    return {
        ...pos,
        y: 0,
    };
};

const DraggableRect = (props: RectConfig) => {
    const [hovered, setHovered] = useState(false);

    const onMouseEnter = useCallback(() => {
        document.body.style.cursor = 'ew-resize';
        setHovered(true);
    }, []);

    const onMouseLeave = useCallback(() => {
        document.body.style.cursor = 'default';
        setHovered(false);
    }, []);

    return (
        <Rect
            fill={hovered ? 'blue' : 'transparent'}
            draggable
            hitStrokeWidth={20}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            dragBoundFunc={dragBoundFunc}
            {...props}
        />
    );
};

export const HeaderCell = ({
    rowIndex,
    columnIndex,
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    onResize,
    onResizeEnd,
    textProps,
    children,
}: RendererProps & {
    textProps?: TextConfig;
    children?: ReactNode;
    onResize?: (columnIndex: number, newWidth: number) => void;
    onResizeEnd?: (columnIndex: number, newWidth: number) => void;
}) => {
    const text = columnIndex < 1 ? 'S/No' : `Header ${columnIndex}`;
    const fill = '#eee';

    const onMouseMove = useCallback(
        (e: KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const newWidth = node.x() - x + dragHandleWidth;

            onResize?.(columnIndex, newWidth);
        },
        [columnIndex, onResize, x],
    );

    const onDragEnd = useCallback(
        (e: KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const newWidth = node.x() - x + dragHandleWidth;

            onResizeEnd?.(columnIndex, newWidth);
        },
        [columnIndex, onResizeEnd, x],
    );

    return (
        <Group key={`${rowIndex}-${columnIndex}`}>
            <Rect
                x={x}
                y={y}
                height={height}
                width={width}
                fill={fill}
                stroke="grey"
                strokeWidth={0.5}
            />
            {children}
            <Text
                x={x}
                y={y}
                height={height}
                width={width}
                text={text}
                fontStyle={'bold'}
                verticalAlign="middle"
                align="center"
                {...textProps}
            />
            <DraggableRect
                x={x + width - dragHandleWidth}
                y={y}
                width={dragHandleWidth}
                height={height}
                onDragMove={onMouseMove}
                onDragEnd={onDragEnd}
            />
        </Group>
    );
};

const defaultColumnWidth = () => 100;
const defaultRowHeight = () => 40;

// const defaultRowCountColumnWidth = () => 50;

const getEditorDefault = (cell: CellInterface | null) => {
    if (!cell) return undefined;

    // if (rowIndex == 1 && columnIndex === 1) {
    //     return SelectEditor;
    // }
    return undefined;
};

const defaultCellRenderer = (props: CellRendererProps) => {
    return <DefaultCellWrapper {...props} />;
};

const dummyGetValue = () => 'a';

const defaultHasRowLoaded = () => true;

const DefaultCellWrapper = memo(
    ({ useCellValue, rowIndex, columnIndex, ...rest }: CellRendererProps) => {
        const [value] = useCellValue<any>({ rowIndex, columnIndex });

        return (
            <DefaultCell {...rest} value={value} rowIndex={rowIndex} columnIndex={columnIndex} />
        );
    },
);

const DataGrid = (
    {
        rowCount,
        columnCount,
        width: widthProp,
        height: heightProp,
        mergedCells,
        onFill,
        onSelectionEnd,
        initialSelections,
        initialActiveCell,
        showScrollbar = true,
        columnWidth = defaultColumnWidth,
        rowHeight = defaultRowHeight,
        headerHeight = 40,
        frozenColumns = 1,
        cellRenderer = defaultCellRenderer,
        headerCellRenderer,
        stageProps,
        innerContainerProps,
        gridRef: gridRefProp,
        headerGridRef: headerGridRefProp,
        onDelete,
        getEditor = getEditorDefault,
        useEditorConfig,
        canEdit,
        onBeforeEdit,
        onCancel,
        onChange,
        onActiveCellChange,
        useCellValue,
        onViewChange,
        hasRowLoaded = defaultHasRowLoaded,
        loadMoreRows: loadMoreRowsProp,
        rowsLoadingThreshold,
        rowsMinimumBatchSize,
        children,
        headerGridProps,
        onContextMenu,
        selectionTopBound,
        selectionLeftBound,
        selectionBottomBound,
        selectionRightBound,
        isHiddenColumn,
        isHiddenRow,
        onBeforeSelection,
        onBeforeFill,
        bodyGridProps,
        ...rest
    }: Props,
    ref: ForwardedRef<DataGridRef>,
) => {
    const { View } = useMolecules();

    const [layout, setLayout] = useState({ width: 0, height: 0 });

    const width = widthProp || layout.width;
    const height = heightProp || layout.height;

    const headerGridRef = useRef<GridRef>(null);
    const gridRef = useRef<GridRef>(null);
    const currentViewPort = useRef<ViewPortProps>();
    const infiniteLoaderRef = useRef(null);

    useImperativeHandle(gridRefProp, () => gridRef.current as GridRef);
    useImperativeHandle(headerGridRefProp, () => headerGridRef.current as GridRef);

    const {
        selections,
        activeCell,
        setActiveCell,
        onKeyDown: onSelectionKeyDown,
        onMouseDown: onSelectionMouseDown,
        ...selectionProps
    } = useSelection({
        gridRef,
        rowCount,
        columnCount,
        // TODO - update this
        getValue: dummyGetValue,
        onFill,
        onSelectionEnd,
        initialSelections,
        initialActiveCell,
        mergedCells,
        onActiveCellChange,
        selectionRightBound,
        selectionBottomBound,
        selectionLeftBound,
        selectionTopBound,
        isHiddenRow,
        isHiddenColumn,
        onBeforeSelection,
        onBeforeFill,
    });

    const onAfterSubmit = useCallback(
        (_value: any, activeCell: CellInterface, nextActiveCell?: CellInterface | null) => {
            gridRef.current?.resizeColumns([activeCell.columnIndex]);

            /* Select the next cell */
            if (nextActiveCell) {
                setActiveCell(nextActiveCell);
            }
        },
        [setActiveCell],
    );

    const {
        editorComponent,
        isEditInProgress,
        onScroll: onEditableScroll,
        onKeyDown: onEditorKeyDown,
        onMouseDown: onEditorMouseDown,
        hideEditor,
        onDoubleClick,
    } = useEditable({
        gridRef,
        useValue: useCellValue,
        selections,
        activeCell,
        rowCount,
        columnCount,
        frozenColumns,
        onDelete,
        getEditor,
        canEdit,
        onBeforeEdit,
        onCancel,
        onChange,
        onAfterSubmit,
        useEditorConfig,
    });

    const onScroll = useCallback(
        (scrollCoords: ScrollCoords) => {
            headerGridRef.current?.scrollTo({ scrollLeft: scrollCoords.scrollLeft });
            // countGridRef.current?.scrollTo({ scrollTop: scrollCoords.scrollTop });
            onEditableScroll?.(scrollCoords);
        },
        [onEditableScroll],
    );

    const onKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            onSelectionKeyDown(e);
            onEditorKeyDown(e);
        },
        [onEditorKeyDown, onSelectionKeyDown],
    );

    const onMouseDown = useCallback(
        (e: MouseEvent<HTMLDivElement>) => {
            onSelectionMouseDown(e);
            onEditorMouseDown(e);
        },
        [onEditorMouseDown, onSelectionMouseDown],
    );

    const renderCell = useCallback(
        (props: RendererProps) => {
            return cellRenderer({ ...props, useCellValue });
        },
        // eslint-disable-next-line
        [cellRenderer],
    );

    // const countGridRowHeight = useCallback(
    //     (index: number) => (index === 0 ? headerHeight : rowHeight(index)),
    //     [headerHeight, rowHeight],
    // );

    const headerGridRowHeight = useCallback(() => headerHeight, [headerHeight]);

    const loadMoreRows = useCallback(
        async (startIndex: number, stopIndex: number) => {
            loadMoreRowsProp?.({ startIndex, stopIndex }, currentViewPort.current as ViewPortProps);
        },
        [loadMoreRowsProp],
    );

    const _onViewChange = useCallback(
        (viewPortProps: ViewPortProps) => {
            currentViewPort.current = viewPortProps;

            onViewChange?.(viewPortProps);
        },
        [onViewChange],
    );

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
    }, []);

    const tableContainerStyle = useMemo(
        () => [styles.tableBodyContainer, innerContainerProps?.style],
        [innerContainerProps?.style],
    );

    useImperativeHandle(ref, () => ({
        selections,
        activeCell,
        setActiveCell,
        isEditInProgress,
        hideEditor,
        setSelections: selectionProps.setSelections,
        infiniteLoader: infiniteLoaderRef.current,
    }));

    return (
        <View style={styles.innerContainer} {...rest}>
            <Grid
                containerStyle={styles.header}
                columnCount={columnCount}
                height={headerHeight}
                rowCount={1}
                frozenColumns={frozenColumns}
                ref={headerGridRef}
                width={width}
                columnWidth={columnWidth}
                rowHeight={headerGridRowHeight}
                showScrollbar={false}
                itemRenderer={headerCellRenderer}
                {...headerGridProps}
            />
            <View {...innerContainerProps} style={tableContainerStyle} onLayout={onLayout}>
                <InfiniteLoader
                    ref={infiniteLoaderRef}
                    isItemLoaded={hasRowLoaded}
                    itemCount={rowCount}
                    loadMoreItems={loadMoreRows}
                    threshold={rowsLoadingThreshold}
                    minimumBatchSize={rowsMinimumBatchSize}>
                    <BodyGrid
                        ref={gridRef}
                        onViewChange={_onViewChange}
                        mergedCells={mergedCells}
                        showScrollbar={showScrollbar}
                        columnCount={columnCount}
                        rowCount={rowCount}
                        frozenColumns={frozenColumns}
                        height={height}
                        width={width}
                        columnWidth={columnWidth}
                        rowHeight={rowHeight}
                        itemRenderer={renderCell}
                        selections={selections}
                        activeCell={activeCell}
                        showFillHandle={!isEditInProgress}
                        {...bodyGridProps}
                        {...selectionProps}
                        onDoubleClick={onDoubleClick}
                        onKeyDown={onKeyDown}
                        onMouseDown={onMouseDown}
                        onScroll={onScroll}
                        stageProps={stageProps}
                        onContextMenu={onContextMenu}
                    />
                </InfiniteLoader>
                {editorComponent}
                {children}
            </View>
        </View>
        // </View>
    );
};

const BodyGrid = memo(
    forwardRef(({ onViewChange, ...rest }: GridProps, ref: any) => {
        const { ref: infiniteLoaderRefSetter, onItemsRendered } = useInfiniteLoaderArgsContext();

        const mergedBodyGridRef = useMergedRefs<GridRef>([infiniteLoaderRefSetter, ref]);

        const _onViewChange = useCallback(
            (viewPortProps: ViewPortProps) => {
                onViewChange?.(viewPortProps);

                onItemsRendered({
                    visibleStartIndex: viewPortProps.rowStartIndex,
                    visibleStopIndex: viewPortProps.rowStopIndex,
                });
            },
            [onItemsRendered, onViewChange],
        );

        return <Grid ref={mergedBodyGridRef} onViewChange={_onViewChange} {...rest} />;
    }),
);

// const defaultRowCountCellRenderer = (props: RendererProps) => <RowCountCell {...props} />;

export const RowCountCell = memo(
    ({
        rowIndex,
        children,
        hovered: hoveredProp = false,
        ...rest
    }: RendererProps & { children?: ReactNode; hovered?: boolean }) => {
        const [hoveredState, setHovered] = useState(false);

        const hovered = hoveredState || hoveredProp;

        const onMouseEnter = useCallback(() => {
            document.body.style.cursor = 'pointer';
            setHovered(true);
        }, []);

        const onMouseLeave = useCallback(() => {
            document.body.style.cursor = 'pointer';
            setHovered(false);
        }, []);

        return (
            <DefaultCell
                {...rest}
                rowIndex={rowIndex}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                value={rowIndex > 0 ? (!hovered ? `${rowIndex}` : '') : ''}
                align="center">
                {(rowIndex === 0 || (rowIndex > 0 && hovered)) && (
                    <CanvasIcon
                        x={rest.x}
                        y={rest.y}
                        width={rest.width}
                        height={rest.height}
                        text="󰄱"
                        size={20}
                        textColor="#00000051"
                        align="center"
                        verticalAlign="middle"
                    />
                )}
                {children}
            </DefaultCell>
        );
    },
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    innerContainer: {
        flex: 1,
    },
    header: {
        zIndex: 10,
    },
    countGrid: {
        zIndex: 10,
    },
    tableBodyContainer: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
    },
});

export default memo(forwardRef<DataGridRef, Props>(DataGrid));
