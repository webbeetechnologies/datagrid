import React, { ReactNode, useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import FillHandle from './FillHandle';
import { createHTMLBox } from './utils';
import { renderCellsByRange, RenderCellsByRangeArgs } from './renderCellsByRange';
import {
    AreaProps,
    CellInterface,
    FloatingRowPropsReturn,
    GridProps,
    SelectionArea,
    SelectionProps,
    StylingProps,
} from './types';
import Selection from './Selection';
import { useDataGridStateStoreRef } from '../../DataGridStateContext';

export type UseSelectionBoxProps = Pick<
    GridProps,
    | 'renderDynamicCell'
    | 'renderDynamicReactCell'
    | 'isActiveRow'
    | 'selections'
    | 'selectionBackgroundColor'
    | 'selectionBorderColor'
    | 'fillhandleBorderColor'
    | 'fillHandleProps'
    | 'showFillHandle'
    | 'borderStyles'
    | 'rowCount'
    | 'columnCount'
    | 'frozenColumns'
    | 'frozenRows'
    | 'selectionStrokeWidth'
    | 'fillSelection'
    | 'selectionRenderer'
    | 'activeCell'
    | 'activeCellStrokeWidth'
    | 'renderActiveCell'
    | 'isHiddenColumn'
    | 'isHiddenRow'
    | 'enableSelectionDrag'
    | 'isDraggingSelection'
> & {
    frozenColumnWidth: number;
    frozenRowHeight: number;
    columnStartIndex: number;
    rowStopIndex: number;
    columnStopIndex: number;
    scrollLeft: number;
    scrollTop: number;
    getRowHeight: (index: number) => number;
    getColumnWidth: (index: number) => number;
    getColumnOffset: (index: number) => number;
    getRowOffset: (index: number) => number;
    getCellBounds: (args: CellInterface) => AreaProps;
    floatingRowProps: FloatingRowPropsReturn;
    dynamicReactCells: ReactNode[];
    frozenDynamicReactCells: ReactNode[];
};

const EMPTY_ARRAY: any = [];

export const useSelectionBox = ({
    frozenColumnWidth,
    frozenRowHeight,
    scrollLeft,
    scrollTop,
    showFillHandle,
    fillhandleBorderColor,
    fillHandleProps,
    borderStyles = EMPTY_ARRAY as StylingProps,
    getColumnOffset,
    getRowOffset,
    columnCount,
    rowCount,
    frozenColumns = 1,
    frozenRows = 0,
    selectionStrokeWidth,
    fillSelection,
    rowStopIndex,
    columnStopIndex,
    getRowHeight,
    getColumnWidth,
    selectionRenderer = defaultSelectionRenderer,
    isDraggingSelection,
    selections = EMPTY_ARRAY as SelectionArea[],
    selectionBackgroundColor,
    selectionBorderColor,
    enableSelectionDrag,
    activeCell,
    getCellBounds,
    floatingRowProps,
    renderActiveCell,
    activeCellStrokeWidth,
    columnStartIndex,
    isHiddenColumn,
    isActiveRow,
    isHiddenRow,
    renderDynamicReactCell,
    renderDynamicCell,
    dynamicReactCells,
    frozenDynamicReactCells,
}: UseSelectionBoxProps) => {
    const datagridStoreRef = useDataGridStateStoreRef().store;

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

    /**
     * Renders active cell
     */
    let fillHandleDimension = {};
    let activeCellSelection = null;
    let activeCellSelectionFrozenColumn = null;
    let activeCellSelectionFrozenRow = null;
    let activeCellSelectionFrozenIntersection = null;
    // @ts-ignore
    let activeCellComponent: React.ReactNode = null;

    if (activeCell) {
        const bounds = getCellBounds(activeCell);
        const { top, left, right, bottom } = bounds;
        const actualBottom = Math.min(rowStopIndex, bottom);
        const actualRight = Math.min(columnStopIndex, right);
        const isInFrozenColumn = left < frozenColumns;
        const isInFrozenRow = top < frozenRows;
        const isInFrozenIntersection = isInFrozenRow && isInFrozenColumn;
        const _rowHeight = floatingRowProps?.height ?? getRowHeight(actualBottom);
        const isFloating = floatingRowProps?.isFiltered || floatingRowProps?.isMoved;
        const y = getRowOffset(top) - (isFloating && activeCell.rowIndex > 1 ? _rowHeight / 2 : 0);
        const height =
            getRowOffset(actualBottom) -
            y +
            _rowHeight -
            (isFloating && activeCell.rowIndex > 1 ? _rowHeight / 2 : 0);

        const x = getColumnOffset(left);

        const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

        activeCellComponent = renderActiveCell?.({
            x: x,
            y: y,
            width: width,
            height: height,
            activeCell,
        });

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
    } else {
        activeCellComponent = renderActiveCell?.({
            activeCell: null,
        });
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
                        frozenColumnSelectionWidth === selectionBounds.width && !isDraggingSelection
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
                        frozenRowSelectionHeight === selectionBounds.height && !isDraggingSelection
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
    const fillHandleWidth = 8;
    const fillhandleComponent =
        showFillHandle && !isSelectionInProgress ? (
            <FillHandle
                {...fillHandleDimension}
                // stroke={selectionBorderColor}
                size={fillHandleWidth}
                borderColor={fillhandleBorderColor}
                {...fillHandleProps}
            />
        ) : null;

    let floatingRowAllDynamicCells = {
        cells: [] as ReactNode[],
        frozenCells: [] as ReactNode[],
    };

    let floatingRowAllDynamicReactCells = {
        cells: [] as ReactNode[],
        frozenCells: [] as ReactNode[],
    };

    if (
        floatingRowProps &&
        floatingRowProps.record &&
        (floatingRowProps.isMoved || floatingRowProps.isFiltered)
    ) {
        floatingRowAllDynamicCells = renderCellsByRange({
            columnStartIndex,
            columnStopIndex,
            rowStartIndex: floatingRowProps.rowIndex,
            rowStopIndex: floatingRowProps.rowIndex,
            columnCount,
            rowCount: floatingRowProps.rowIndex + 1,
            getCellBounds,
            getColumnOffset,
            getColumnWidth,
            getRowOffset: (top: number) =>
                getRowOffset(top) -
                (floatingRowProps.rowIndex > 1 ? floatingRowProps.height / 2 : 0),
            getRowHeight: () => floatingRowProps.height,
            renderCell: renderDynamicCell as RenderCellsByRangeArgs['renderCell'],
            hoveredCell: datagridStoreRef.current?.hoveredCell,
            isHiddenColumn,
            isActiveRow,
            isHiddenRow,
            frozenColumns,
            isFloatingRow: true,
            isRowFiltered: floatingRowProps.isFiltered,
            isRowMoved: floatingRowProps.isMoved,
            floatingRowId: floatingRowProps.record?.id,
            getRecordIdByIndex: () => floatingRowProps.record?.id,
        });

        floatingRowAllDynamicReactCells = renderCellsByRange({
            columnStartIndex,
            columnStopIndex,
            rowStartIndex: floatingRowProps.rowIndex,
            rowStopIndex: floatingRowProps.rowIndex,
            columnCount,
            rowCount: floatingRowProps.rowIndex + 1,
            getCellBounds,
            getColumnOffset,
            getColumnWidth,
            getRowOffset: (top: number) =>
                getRowOffset(top) -
                (floatingRowProps.rowIndex > 1 ? floatingRowProps.height / 2 : 0),
            getRowHeight: () => floatingRowProps.height,
            renderCell: renderDynamicReactCell as RenderCellsByRangeArgs['renderCell'],
            hoveredCell: datagridStoreRef.current?.hoveredCell,
            isHiddenColumn,
            isActiveRow,
            isHiddenRow,
            frozenColumns,
            isFloatingRow: true,
            isRowFiltered: floatingRowProps.isFiltered,
            isRowMoved: floatingRowProps.isMoved,
            floatingRowId: floatingRowProps.record?.id,
            getRecordIdByIndex: () => floatingRowProps.record?.id,
        });
    }

    const { cells: floatingRowDynamicCells, frozenCells: floatingRowFrozenDynamicCells } =
        floatingRowAllDynamicCells;
    const { cells: floatingRowReactDynamicCells, frozenCells: floatingRowFrozenReactDynamicCells } =
        floatingRowAllDynamicReactCells;

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
                pointerEvents: 'none',
            } as ViewStyle,
            tableSelectionContainerInner: {
                pointerEvents: 'none',
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
                pointerEvents: 'none',
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
                pointerEvents: 'none',
            } as ViewStyle,
            frozenRowsSelectionContainerInner: {
                transform: [{ translateX: -(scrollLeft + frozenColumnWidth) }, { translateY: 0 }],
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
        [frozenColumnWidth, frozenRowHeight, scrollLeft, scrollTop, fillHandleWidth],
    );

    return {
        selectionChildren: (
            <>
                <View style={tableSelectionContainer}>
                    <View style={tableSelectionContainerInner} testID="table-selection-container">
                        {borderStyleCells}
                        {fillSelections}
                        {selectionAreas}
                        {activeCellSelection}
                        {fillhandleComponent}
                        {dynamicReactCells}
                        {floatingRowReactDynamicCells}
                    </View>
                </View>
                {frozenColumns ? (
                    <View style={frozenColumnsSelectionContainer}>
                        <View style={frozenColumnsSelectionContainerInner}>
                            {borderStyleCellsFrozenColumns}
                            {selectionAreasFrozenColumns}
                            {activeCellSelectionFrozenColumn}
                            {fillhandleComponent}
                            {frozenDynamicReactCells}
                            {floatingRowFrozenReactDynamicCells}
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
            </>
        ),
        floatingRowDynamicCells,
        floatingRowFrozenDynamicCells,
        activeCellComponent,
    };
};

const defaultSelectionRenderer = (props: SelectionProps) => {
    return <Selection {...props} />;
};
