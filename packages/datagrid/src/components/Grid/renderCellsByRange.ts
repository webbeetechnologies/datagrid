import { itemKey } from './helpers';
import { GridProps, GridRef, HoveredCell, RenderCellProps } from './types';

export type RenderCellsByRangeArgs = {
    columnStartIndex: number;
    columnStopIndex: number;
    rowStartIndex: number;
    rowStopIndex: number;
    rowCount: number;
    columnCount: number;
    frozenColumns: number;
    isHiddenColumn?: GridProps['isHiddenColumn'];
    isHiddenRow?: GridProps['isHiddenColumn'];
    isActiveRow?: GridProps['isActiveRow'];
    hoveredCell: HoveredCell | null;
    getCellBounds: GridRef['getCellBounds'];
    getRowOffset: GridRef['getRowOffset'];
    getColumnOffset: GridRef['getColumnOffset'];
    getColumnWidth: GridRef['getColumnWidth'];
    getRowHeight: GridRef['getRowHeight'];
    renderCell?: (props: RenderCellProps) => React.ReactNode;
    withCellStates?: boolean;
    isFloatingRow?: boolean;
    isRowMoved?: boolean;
    isRowFiltered?: boolean;
    floatingRowId?: number | string;
    getRecordIdByIndex: (index: number) => number | undefined;
};

export const renderCellsByRange = ({
    columnStartIndex,
    columnStopIndex,
    rowStartIndex,
    rowStopIndex,
    rowCount,
    columnCount,
    isHiddenColumn,
    isActiveRow,
    isHiddenRow,
    hoveredCell,
    frozenColumns,
    getCellBounds,
    getColumnOffset,
    getColumnWidth,
    getRowHeight,
    getRowOffset,
    renderCell,
    withCellStates = true,
    isFloatingRow = false,
    isRowFiltered = false,
    isRowMoved = false,
    floatingRowId,
    getRecordIdByIndex,
}: RenderCellsByRangeArgs) => {
    const cells: React.ReactNode[] = [];
    const frozenCells: React.ReactNode[] = [];

    for (let columnIndex = columnStartIndex; columnIndex <= columnStopIndex; columnIndex++) {
        if (columnIndex > columnCount - 1) break;

        if (isHiddenColumn?.(columnIndex)) {
            continue;
        }

        // const isFirstColumn = columnIndex === 0;

        for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
            if (rowIndex > rowCount - 1) break;

            if (isHiddenRow?.(rowIndex)) {
                continue;
            }

            const bounds = getCellBounds({ rowIndex, columnIndex });
            const { top, left, right, bottom } = bounds;
            const actualBottom = Math.min(rowStopIndex, bottom);
            const actualRight = Math.min(columnStopIndex, right);

            const y = getRowOffset(top);
            const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

            const x = getColumnOffset(left);

            const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);
            const recordId = getRecordIdByIndex(rowIndex);

            const _cell = renderCell?.({
                x,
                y,
                width,
                height,
                columnIndex,
                rowIndex,
                recordId,
                key: itemKey({ rowIndex, columnIndex }),
                ...(withCellStates
                    ? {
                          isHoverRow:
                              hoveredCell?.rowIndex === rowIndex &&
                              isFloatingRow === !!hoveredCell?.isFloatingRow,
                          isHoverColumn:
                              hoveredCell?.columnIndex === columnIndex &&
                              isFloatingRow === !!hoveredCell?.isFloatingRow,
                          isActiveRow: !!isActiveRow?.({ rowIndex, recordId }),
                      }
                    : {}),
                isFloatingRow,
                isRowFiltered,
                isRowMoved,
                floatingRowId,
            });

            if (_cell) {
                cells.push(_cell);
            }
        }
    }

    for (
        let columnIndex = 0;
        columnIndex < Math.min(columnStopIndex, frozenColumns);
        columnIndex++
    ) {
        if (isHiddenColumn?.(columnIndex)) {
            continue;
        }

        for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
            if (rowIndex > rowCount - 1) break;

            if (isHiddenRow?.(rowIndex)) {
                continue;
            }

            const bounds = getCellBounds({ rowIndex, columnIndex });
            const { top, left, right, bottom } = bounds;
            const actualBottom = Math.min(rowStopIndex, bottom);
            const actualRight = Math.min(columnStopIndex, right);

            const y = getRowOffset(top);
            const height = getRowOffset(actualBottom) - y + getRowHeight(actualBottom);

            const x = getColumnOffset(left);

            const width = getColumnOffset(actualRight) - x + getColumnWidth(actualRight);

            const _cell = renderCell?.({
                x,
                y,
                width,
                height,
                columnIndex,
                rowIndex,
                key: itemKey({ rowIndex, columnIndex }),
                ...(withCellStates
                    ? {
                          isHoverRow: hoveredCell?.rowIndex === rowIndex,
                          isHoverColumn: hoveredCell?.columnIndex === columnIndex,
                          isActiveRow: !!isActiveRow?.({ rowIndex }),
                      }
                    : {}),
                isFloatingRow,
                isRowFiltered,
                isRowMoved,
                floatingRowId,
            });

            if (_cell) {
                frozenCells.push(_cell);
            }
        }
    }

    return { cells, frozenCells };
};
