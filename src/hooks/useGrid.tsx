import type { Context } from 'konva/lib/Context';
import { RefObject, useCallback } from 'react';
import { Shape } from 'react-konva';
import type { GridRef } from '../components';
import type { CellsDrawer } from '../components/Grid/utils';
import { recordRowLayout } from '../utils/record-row-layout';

export type UseGridProps = {
    instance: RefObject<GridRef>;
    rowStartIndex: number;
    rowStopIndex: number;
    columnStartIndex: number;
    columnStopIndex: number;
    columnCount: number;
    rowCount: number;
    isHiddenRow?: (index: number) => boolean;
    isHiddenColumn?: (index: number) => boolean;
    frozenColumns?: number;
    cellsDrawer: CellsDrawer;
    groupingLevel?: number;
};

const useGrid = ({
    instance,
    columnCount,
    columnStartIndex,
    columnStopIndex,
    rowCount,
    rowStartIndex,
    rowStopIndex,
    isHiddenColumn,
    isHiddenRow,
    frozenColumns = 0,
    cellsDrawer,
}: // groupingLevel,
UseGridProps) => {
    const drawCells = useCallback(
        (ctx: Context, columnStartIndex: number, columnStopIndex: number) => {
            cellsDrawer.initCtx(ctx);
            recordRowLayout.initCtx(ctx);

            // recordRowLayout.setStyle({
            //     fontSize: 14,
            //     fontWeight: 'normal',
            // });

            cellsDrawer.setStyle({
                fontSize: 13,
                fontWeight: 'normal',
            });

            if (!instance.current) return;

            for (
                let columnIndex = columnStartIndex;
                columnIndex <= columnStopIndex;
                columnIndex++
            ) {
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

                    const bounds = instance.current.getCellBounds({ rowIndex, columnIndex });
                    const actualRowIndex = rowIndex;
                    const actualColumnIndex = columnIndex;
                    const actualBottom = Math.max(rowIndex, bounds.bottom);
                    const actualRight = Math.max(columnIndex, bounds.right);

                    const y = instance.current.getRowOffset(actualRowIndex);
                    const height = instance.current.getRowHeight(actualBottom);
                    const x = instance.current.getColumnOffset(actualColumnIndex);
                    const width = instance.current.getColumnWidth(actualRight);

                    // const { rowType } = instance.current.getRecordInfo(rowIndex);

                    // const [cellValue, { recordId, fieldId }] = instance.current.getCellValue({
                    //     rowIndex,
                    //     columnIndex,
                    // });
                    // const field = instance.current.getField();

                    // const style = { fontWeight: 'normal', fontSize: 14 };

                    recordRowLayout.init({
                        x,
                        y,
                        rowIndex,
                        columnIndex,
                        columnWidth: width,
                        rowHeight: height,
                        columnCount,
                        groupCount: 0,
                        // viewType,
                    });
                    recordRowLayout.render({
                        row: { level: 0, realIndex: rowIndex } as any,
                        style: { fill: '#fff' },
                        isHoverRow: false,
                        isCheckedRow: false,
                        isActiveRow: false,
                        isDraggingRow: false,
                        isThisCellWillMove: false,
                        // commentCount,
                        // commentVisible,
                    });

                    const renderProps = {
                        x,
                        y,
                        columnWidth: width,
                        rowHeight: height,
                        recordId: '',
                        field: {},
                        cellValue: `column-${columnIndex} row-${rowIndex} `,
                        isActive: false,
                        editable: true,
                        // style,
                        colors: {},
                    };

                    cellsDrawer.renderCellValue(renderProps as any, ctx);
                }
            }
        },
        [
            columnCount,
            instance,
            isHiddenColumn,
            isHiddenRow,
            rowCount,
            rowStartIndex,
            rowStopIndex,
            cellsDrawer,
        ],
    );

    // Freeze column cells
    const frozenCells = (
        <Shape
            listening={false}
            perfectDrawEnabled={false}
            sceneFunc={ctx => drawCells(ctx, 0, frozenColumns - 1)}
        />
    );

    // Other column cells
    const cells = (
        <Shape
            listening={false}
            perfectDrawEnabled={false}
            sceneFunc={ctx =>
                drawCells(ctx, Math.max(columnStartIndex, frozenColumns), columnStopIndex)
            }
        />
    );

    return {
        cells: cells,
        frozenCells,
    };
};

export default useGrid;
