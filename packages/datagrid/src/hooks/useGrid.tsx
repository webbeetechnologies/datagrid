import type { Context } from 'konva/lib/Context';
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import { makeRectPath, Shape } from '../canvas';
import type { GridProps, GridRef, UseRecord } from '../components/Grid/types';
import type { CellsDrawer } from '../components/Grid/utils';
import { recordRowLayout } from '../utils/record-row-layout';
import { useLatest } from '@bambooapp/bamboo-molecules';
import { useDataGridState } from '../DataGridStateContext';
import { gridEventEmitter } from '../utils/grid-eventemitter';
import type { Field, IRecord } from '../utils/types';
import { useFontsContext } from '../contexts/FontContext';
import { Platform } from 'react-native';

export type UseGridProps = Pick<
    GridProps,
    | 'useFields'
    | 'useProcessRenderProps'
    | 'themeColors'
    | 'isActiveColumn'
    | 'isActiveRow'
    | 'renderDynamicCell'
    | 'scale'
    | 'useFloatingRowProps'
    | 'getRowStateById'
    | 'useGridInit'
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
    records: ReturnType<UseRecord>;
};

const emptyObj = {};

const returnSame = (props: any) => props;

const useProcessRenderPropsDefault = () => returnSame;
const useFloatingRowPropsDefault = () => undefined;
const useGridInitDefault = () => undefined;

const defaultShadowProps = {
    shadowBlur: 5,
    shadowColor: '#000',
    shadowOffset: {
        x: 10,
        y: 10,
    },
};

const useGrid = ({
    instance,
    records,
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
    useFields,
    themeColors = emptyObj,
    useProcessRenderProps = useProcessRenderPropsDefault,
    useFloatingRowProps = useFloatingRowPropsDefault,
    scale = 1,
    getRowStateById,
    useGridInit = useGridInitDefault,
}: UseGridProps) => {
    const { visibleFields: fields, fieldsMap } = useFields(columnStartIndex, columnStopIndex);

    const [_, forceRender] = useReducer(() => ({}), {});

    const processRenderProps = useProcessRenderProps();
    const processRenderPropsRef = useLatest(processRenderProps);
    const floatingRowProps = useFloatingRowProps();

    const hoveredCell = useDataGridState(store => store.hoveredCell);
    const fonts = useFontsContext();

    useGridInit({ records, columnStartIndex, columnStopIndex, rowStartIndex, rowStopIndex });

    const drawCells = useCallback(
        (ctx: Context, columnStartIndex: number, columnStopIndex: number) => {
            cellsDrawer.initCtx(ctx, themeColors, {
                scale,
                groupCount: groupingLevel,
                fonts,
            });
            recordRowLayout.initCtx(ctx, themeColors);

            if (!instance.current) return;

            const renderCell = ({
                rowIndex,
                columnIndex,
                record,
                field,
                height: _height,
                isLastColumn,
                isFloatingRow = false,
                isMoved = false,
                isFiltered = false,
            }: {
                rowIndex: number;
                columnIndex: number;
                record?: IRecord;
                height?: number;
                field: Field;
                isLastColumn: boolean;
                isFloatingRow?: boolean;
                isFiltered?: boolean;
                isMoved?: boolean;
            }) => {
                const _record = record ?? records[rowIndex];
                const { data, ...rowInfo } = _record || {};

                if (!instance.current || !_record) return;

                const bounds = instance.current.getCellBounds({ rowIndex, columnIndex });
                // const actualRowIndex = isFloatingRow
                //     ? rowIndex > records.length - 1
                //         ? records.length - 1
                //         : rowIndex
                //     : rowIndex;
                const actualRowIndex = rowIndex;
                const actualColumnIndex = columnIndex;
                const actualBottom = Math.max(rowIndex, bounds.bottom);
                const actualRight = Math.max(columnIndex, bounds.right);

                const _y = instance.current.getRowOffset(actualRowIndex);
                const height = _height ?? instance.current.getRowHeight(actualBottom);
                const y = isFiltered || isMoved ? _y - (rowIndex > 1 ? height / 2 : 0) : _y;

                const x = instance.current.getColumnOffset(actualColumnIndex);
                const width = instance.current.getColumnWidth(actualRight);

                const cellValue = (data as Record<string, any>)?.[field.slug] ?? null;
                const recordId = rowInfo.id;

                const isHoverRow =
                    rowIndex === hoveredCell?.rowIndex &&
                    (isFloatingRow || isFloatingRow === !!hoveredCell?.isFloatingRow);
                const isHoverColumn =
                    columnIndex === hoveredCell?.columnIndex &&
                    (isFloatingRow || isFloatingRow === !!hoveredCell?.isFloatingRow);
                const isActiveRow = !!instance.current.isActiveRow?.({ rowIndex, recordId });

                cellsDrawer.setState({
                    hoveredCell,
                    isHoverRow,
                    isActiveRow,
                });
                const shouldDisplayEmptyCell =
                    !isFloatingRow && columnIndex > 0 && floatingRowProps?.record?.id === recordId;

                if (
                    (rowInfo.rowType === 'data' || isFloatingRow) &&
                    columnIndex + 1 !== columnCount
                ) {
                    const shadowProps =
                        isFloatingRow && (isMoved || isFiltered)
                            ? {
                                  ...defaultShadowProps,
                                  ...floatingRowProps?.shadowProps,
                              }
                            : {};

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

                    const rowState = getRowStateById?.(recordId, rowIndex, field.slug, cellValue);

                    recordRowLayout.render({
                        row: rowInfo,
                        isHoverRow,
                        isCheckedRow: isActiveRow,
                        isActiveRow: false,
                        isDraggingRow: false,
                        isFiltered,
                        isMoved,
                        shadowProps,
                        renderEmptyCell: shouldDisplayEmptyCell,
                        rowState,
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
                    isHoverColumn,
                    columnCount,
                    isFloatingRow,
                    isRowMoved: isMoved,
                    isRowFiltered: isFiltered,
                };

                if (isLastColumn && cellValue != null) {
                    ctx.save();
                    if (Platform.OS === 'web') {
                        ctx.rect(x, y, width, height);
                        ctx.clip();
                    } else {
                        const rectPath = makeRectPath();
                        // @ts-ignore
                        rectPath.addRect({ x, y, width, height });
                        // @ts-ignore
                        ctx.clipPath(rectPath, 1, true);
                    }

                    cellsDrawer.renderCell(
                        processRenderPropsRef.current(renderProps, {
                            fieldsMap: fieldsMap,
                            records,
                        }),
                        ctx,
                    );
                    ctx.restore();
                } else {
                    if (shouldDisplayEmptyCell) return;

                    cellsDrawer.renderCell(
                        processRenderPropsRef.current(renderProps, {
                            fieldsMap: fieldsMap,
                            records,
                        }),
                        ctx,
                    );
                }
            };

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
                const isLastColumn = columnIndex === fields.length - 1;

                // const isFirstColumn = columnIndex === 0;

                for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
                    if (rowIndex > rowCount - 1) break;

                    if (isHiddenRow?.(rowIndex)) {
                        continue;
                    }
                    renderCell({ rowIndex, columnIndex, field, isLastColumn });
                }
            }

            if (floatingRowProps) {
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
                    const isLastColumn = columnIndex === fields.length - 1;

                    const { rowIndex, record, height, isFiltered, isMoved } = floatingRowProps;

                    renderCell({
                        rowIndex,
                        columnIndex,
                        field,
                        isLastColumn,
                        record,
                        height,
                        isFloatingRow: true,
                        isFiltered,
                        isMoved,
                    });
                }
            }
        },
        // eslint-disable-next-line
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
            fieldsMap,
            scale,
            _,
            floatingRowProps,
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

    const onForceRender = useCallback(() => forceRender(), []);

    useEffect(() => {
        gridEventEmitter.addListener('onForceRerender', onForceRender);

        return () => {
            gridEventEmitter.removeListener('onForceRerender', onForceRender);
        };
    }, [onForceRender]);

    return {
        cells,
        frozenCells,
    };
};

export default useGrid;
