import type { Context } from 'konva/lib/Context';
import React, { useCallback, useMemo } from 'react';
import { Shape } from 'react-konva';
import type { GridProps, GridRef } from '../components/Grid/types';
import type { CellsDrawer } from '../components/Grid/utils';
import { recordRowLayout } from '../utils/record-row-layout';
import keyBy from 'lodash/keyBy';
import { useLatest } from '@bambooapp/bamboo-molecules';
import { useDataGridState } from '../DataGridStateContext';

export type UseGridProps = Pick<
    GridProps,
    | 'useRecords'
    | 'useFields'
    | 'useProcessRenderProps'
    | 'themeColors'
    | 'isActiveColumn'
    | 'isActiveRow'
    | 'renderDynamicCell'
> & {
    instance: React.RefObject<GridRef>;
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

const emptyObj = {};

const returnSame = (props: any) => props;

const useProcessRenderPropsDefault = () => returnSame;

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
    groupingLevel = 0,
    useRecords,
    useFields,
    themeColors = emptyObj,
    useProcessRenderProps = useProcessRenderPropsDefault,
}: UseGridProps) => {
    const records = useRecords({
        columnStartIndex,
        columnStopIndex,
        rowStartIndex,
        rowStopIndex,
    });
    const fields = useFields(columnStartIndex, columnStopIndex);
    const fieldMapBySlug = useMemo(() => keyBy(fields, 'slug'), [fields]);

    const processRenderProps = useProcessRenderProps();
    const processRenderPropsRef = useLatest(processRenderProps);

    const hoveredCell = useDataGridState(store => store.hoveredCell);

    const drawCells = useCallback(
        (ctx: Context, columnStartIndex: number, columnStopIndex: number) => {
            cellsDrawer.initCtx(ctx, themeColors);
            recordRowLayout.initCtx(ctx, themeColors);

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

                const field = fields[columnIndex] || {};

                // const isFirstColumn = columnIndex === 0;

                for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
                    if (rowIndex > rowCount - 1) break;

                    if (isHiddenRow?.(rowIndex)) {
                        continue;
                    }

                    const { data, ...rowInfo } = records[rowIndex];

                    const bounds = instance.current.getCellBounds({ rowIndex, columnIndex });
                    const actualRowIndex = rowIndex;
                    const actualColumnIndex = columnIndex;
                    const actualBottom = Math.max(rowIndex, bounds.bottom);
                    const actualRight = Math.max(columnIndex, bounds.right);

                    const y = instance.current.getRowOffset(actualRowIndex);
                    const height = instance.current.getRowHeight(actualBottom);
                    const x = instance.current.getColumnOffset(actualColumnIndex);
                    const width = instance.current.getColumnWidth(actualRight);

                    const cellValue = (data as Record<string, any>)?.[field.slug] || null;
                    const recordId = rowInfo.id;

                    const isHoverRow = rowIndex === hoveredCell?.rowIndex;
                    const isActiveRow = !!instance.current.isActiveRow?.({ rowIndex, recordId });

                    cellsDrawer.setState({
                        hoveredCell,
                        isHoverRow,
                    });

                    if (rowInfo.rowType === 'data' && columnIndex + 1 !== columnCount) {
                        recordRowLayout.init({
                            x,
                            y,
                            rowIndex,
                            columnIndex,
                            columnWidth: width,
                            rowHeight: height,
                            columnCount,
                            groupCount: groupingLevel,
                            // viewType,
                        });

                        recordRowLayout.render({
                            row: rowInfo,
                            isHoverRow,
                            isCheckedRow: false,
                            isActiveRow: false,
                            isDraggingRow: false,
                            isThisCellWillMove: false,
                            // commentCount,
                            // commentVisible,
                        });
                    }

                    const renderProps = {
                        x,
                        y,
                        columnIndex,
                        rowIndex,
                        columnWidth: width,
                        rowHeight: height,
                        recordId,
                        row: rowInfo,
                        groupCount: groupingLevel,
                        field,
                        cellValue,
                        isActiveRow,
                        isHoverRow,
                        columnCount,
                    };

                    cellsDrawer.renderCell(
                        processRenderPropsRef.current(renderProps, {
                            fieldsMap: fieldMapBySlug,
                            records,
                        }),
                        ctx,
                    );
                }
            }
        },
        [
            cellsDrawer,
            themeColors,
            instance,
            columnCount,
            isHiddenColumn,
            fields,
            rowStartIndex,
            rowStopIndex,
            rowCount,
            isHiddenRow,
            records,
            hoveredCell,
            groupingLevel,
            processRenderPropsRef,
            fieldMapBySlug,
        ],
    );

    // Freeze column cells
    const frozenCells = useMemo(
        () => (
            <Shape
                listening={false}
                perfectDrawEnabled={false}
                sceneFunc={ctx => drawCells(ctx, 0, frozenColumns - 1)}
            />
        ),
        [drawCells, frozenColumns],
    );

    // Other column cells
    const cells = useMemo(
        () => (
            <Shape
                listening={false}
                perfectDrawEnabled={false}
                sceneFunc={ctx =>
                    drawCells(ctx, Math.max(columnStartIndex, frozenColumns), columnStopIndex)
                }
            />
        ),
        [columnStartIndex, columnStopIndex, drawCells, frozenColumns],
    );

    return {
        cells,
        frozenCells,
    };
};

export default useGrid;