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
} from 'react';
import { StyleSheet } from 'react-native';
import { Rect, Text, Group } from 'react-konva';
import type { ViewProps } from '@bambooapp/bamboo-atoms';
import { useMolecules } from '@bambooapp/bamboo-molecules';
import { Icon } from '@bambooapp/bamboo-molecules/components';
import type { Vector2d } from 'konva/lib/types';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { TextConfig } from 'konva/lib/shapes/Text';

import useSelection, { SelectionResults, UseSelectionOptions } from './hooks/useSelection';
import useEditable, { EditableResults, UseEditableOptions } from './hooks/useEditable';
import Grid, {
    CellInterface,
    GridProps,
    GridRef,
    RendererProps,
    ScrollCoords,
} from './components/Grid/Grid';
import { Cell as DefaultCell } from './components/Grid/Cell';
import CanvasIcon from './components/Grid/CanvasIcon';

// const groupHeaderIndices = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800];

// const mergedCells = [
//     {
//         top: 5,
//         left: 5,
//         right: 6,
//         bottom: 5,
//     },
// ];

export type CellRendererProps = RendererProps & { getCellValue: <T>(cell: CellInterface) => T };

export type Props = Pick<
    UseSelectionOptions,
    'onFill' | 'onSelectionEnd' | 'initialSelections' | 'initialActiveCell' | 'onActiveCellChange'
> &
    Pick<
        UseEditableOptions,
        | 'canEdit'
        | 'showEditorConfig'
        | 'getEditor'
        | 'onDelete'
        | 'onBeforeEdit'
        | 'onChange'
        | 'onCancel'
    > &
    Pick<
        GridProps,
        | 'showScrollbar'
        | 'width'
        | 'height'
        | 'rowHeight'
        | 'columnWidth'
        | 'rowCount'
        | 'columnCount'
        | 'stageProps'
        | 'frozenColumns'
        | 'mergedCells'
    > &
    ViewProps & {
        useGetCellValue: <T>() => [
            (cell: CellInterface) => T,
            (cell: CellInterface, value: T) => void,
        ];
        rowCount: number;
        columnCount: number;
        innerContainerProps?: ViewProps;
        cellRenderer?: (props: CellRendererProps) => React.ReactNode;
        headerCellRenderer?: (props: RendererProps) => ReactNode;
        gridRef?: RefObject<GridRef>;
        headerGridRef?: RefObject<GridRef>;
    };

export type DataGridRef = Pick<SelectionResults, 'selections' | 'activeCell' | 'setActiveCell'> &
    Pick<EditableResults, 'isEditInProgress'> & {};

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
    textProps,
    children,
}: RendererProps & { textProps?: TextConfig; children?: ReactNode }) => {
    const text = columnIndex < 1 ? 'S/No' : `Header ${columnIndex}`;
    const fill = '#eee';

    const onMouseMove = useCallback(
        (e: KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const newWidth = node.x() - x + dragHandleWidth;

            onResize(columnIndex, newWidth);
        },
        [columnIndex, onResize, x],
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
            />
        </Group>
    );
};

const defaultColumnWidth = () => 100;
const defaultRowHeight = () => 40;

const defaultRowCountColumnWidth = () => 50;

const getEditorDefault = (cell: CellInterface | null) => {
    if (!cell) return undefined;

    // if (rowIndex == 1 && columnIndex === 1) {
    //     return SelectEditor;
    // }
    return undefined;
};

const defaultCellRenderer = ({
    rowIndex,
    columnIndex,
    x = 0,
    y = 0,
    getCellValue,
    ...restProps
}: CellRendererProps) => {
    const value = getCellValue<string>({ rowIndex, columnIndex });

    // if (record?._rowType === 'group-header') {
    //     return (
    //         <Group x={x} y={y}>
    //             {columnIndex === 0 && (
    //                 <>
    //                     <CanvasIcon
    //                         // onClick={() => onToggleGroup(rowIndex)}
    //                         x={x}
    //                         y={y - 5}
    //                         text="󰅂"
    //                         align="center"
    //                         verticalAlign="center"
    //                         size={24}
    //                     />
    //                     <Text
    //                         x={x + 25}
    //                         y={y}
    //                         align="center"
    //                         verticalAlign="center"
    //                         fill="#333"
    //                         fontSize={12}
    //                         text={`group-header${rowIndex}`}
    //                     />
    //                 </>
    //             )}
    //         </Group>
    //     );
    // }
    //
    // if (record?._rowType === 'group-footer') {
    //     return (
    //         <Group x={x} y={y}>
    //             {columnIndex === 0 && (
    //                 <Text
    //                     x={x}
    //                     y={y}
    //                     align="center"
    //                     verticalAlign="center"
    //                     fill="#333"
    //                     fontSize={12}
    //                     text={`group-footer${rowIndex}`}
    //                 />
    //             )}
    //         </Group>
    //     );
    // }

    return (
        <DefaultCell
            x={x}
            y={y}
            value={value}
            align="left"
            rowIndex={rowIndex}
            columnIndex={columnIndex}
            {...restProps}
        />
    );
};

const DataGrid = (
    {
        useGetCellValue,
        rowCount,
        columnCount,
        width,
        height,
        mergedCells,
        onFill,
        onSelectionEnd,
        initialSelections,
        initialActiveCell,
        showScrollbar = true,
        columnWidth = defaultColumnWidth,
        rowHeight = defaultRowHeight,
        frozenColumns = 1,
        cellRenderer = defaultCellRenderer,
        headerCellRenderer,
        stageProps,
        innerContainerProps,
        gridRef: gridRefProp,
        headerGridRef: headerGridRefProp,
        showEditorConfig,
        onDelete,
        getEditor = getEditorDefault,
        canEdit,
        onBeforeEdit,
        onCancel,
        onChange,
        onActiveCellChange,
        ...rest
    }: Props,
    ref: ForwardedRef<DataGridRef>,
) => {
    const { View } = useMolecules();

    const headerGridRef = useRef<GridRef>(null);
    const countGridRef = useRef<GridRef>(null);
    const gridRef = useRef<GridRef>(null);

    useImperativeHandle(gridRefProp, () => gridRef.current as GridRef);
    useImperativeHandle(headerGridRefProp, () => headerGridRef.current as GridRef);

    // const [collapsedGroups, setCollapsedGroups] = useState<number[]>([]);
    // const collapsedGroupsRef = useLatest(collapsedGroups);

    const [getCellValue, setCellValue] = useGetCellValue<any>();

    // const getCellValue = useCallback(
    //     ({ rowIndex, columnIndex }) => data[[rowIndex, columnIndex]],
    //     [data],
    // );

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
        getValue: getCellValue,
        onFill,
        onSelectionEnd,
        initialSelections,
        initialActiveCell,
        mergedCells,
        onActiveCellChange,
    });

    // const onToggleGroup = useCallback(
    //     (index: number) => {
    //         let _collapsedGroups;
    //
    //         if (collapsedGroupsRef.current.includes(index)) {
    //             _collapsedGroups = collapsedGroupsRef.current.filter(item => item !== index);
    //         } else {
    //             _collapsedGroups = [...collapsedGroupsRef.current, index];
    //         }
    //
    //         // const newRecordsArr: number[] = new Array(2000).fill(' ').map((_, i) => i);
    //         //
    //         // _collapsedGroups.forEach(headerIndex => {
    //         //     newRecordsArr.splice(headerIndex + 1, headerIndex + 199);
    //         // });
    //
    //         // setData(prev => {
    //         //     const newData = [...prev];
    //         //
    //         //     return newData.filter((_, i) => newRecordsArr.includes(Number(i)));
    //         // });
    //
    //         setCollapsedGroups(_collapsedGroups);
    //     },
    //     [collapsedGroupsRef, setData],
    // );

    // const calculateSpace = useCallback(
    //     (rowIndex: number) => {
    //         let nearestGroupIndex = 0;
    //         for (let i = 0; i < groupHeaderIndices.length; i++) {
    //             if (groupHeaderIndices[i] < rowIndex) {
    //                 if (collapsedGroups.includes(groupHeaderIndices[i])) {
    //                     continue;
    //                 }
    //
    //                 nearestGroupIndex = i;
    //                 continue;
    //             }
    //             break;
    //         }
    //
    //         return { groupIndex: nearestGroupIndex, space: 0 };
    //     },
    //     [collapsedGroups],
    // );

    // const onDelete = useCallback((_activeCell: CellInterface, _selections: SelectionArea[]) => {
    //     if (selections.length) {
    //         const newValues = selections.reduce((acc, { bounds: sel }) => {
    //             for (let i = sel.top; i <= sel.bottom; i++) {
    //                 for (let j = sel.left; j <= sel.right; j++) {
    //                     acc[[i, j]] = '';
    //                 }
    //             }
    //             return acc;
    //         }, {});
    //         setData(prev => ({ ...prev, ...newValues }));
    //         const selectionBounds = selections[0].bounds;
    //
    //         gridRef.current?.resetAfterIndices(
    //             {
    //                 columnIndex: selectionBounds.left,
    //                 rowIndex: selectionBounds.top,
    //             },
    //             true,
    //         );
    //     } else if (activeCell) {
    //         setData(prev => {
    //             return {
    //                 ...prev,
    //                 [[activeCell.rowIndex, activeCell.columnIndex]]: '',
    //             };
    //         });
    //         gridRef.current?.resetAfterIndices(activeCell);
    //     }
    // }, []);

    const onSubmit = useCallback(
        (value: any, cell: CellInterface, nextActiveCell: CellInterface | null | undefined) => {
            setCellValue(cell, value);
            gridRef.current?.resizeColumns([cell.columnIndex]);

            /* Select the next cell */
            if (nextActiveCell) {
                setActiveCell(nextActiveCell);
            }
        },
        [setActiveCell, setCellValue],
    );

    const {
        editorComponent,
        isEditInProgress,
        onScroll: onEditableScroll,
        onKeyDown: onEditorKeyDown,
        onMouseDown: onEditorMouseDown,
        ...editableProps
    } = useEditable({
        gridRef,
        getValue: getCellValue,
        selections,
        activeCell,
        rowCount,
        columnCount,
        frozenColumns,
        onDelete,
        showEditorConfig,
        getEditor,
        canEdit,
        onBeforeEdit,
        onCancel,
        onChange,
        onSubmit,
    });

    const onScroll = useCallback(
        (scrollCoords: ScrollCoords) => {
            headerGridRef.current?.scrollTo({ scrollLeft: scrollCoords.scrollLeft });
            countGridRef.current?.scrollTo({ scrollTop: scrollCoords.scrollTop });
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
            return cellRenderer({ ...props, getCellValue });
        },
        [cellRenderer, getCellValue],
    );

    useImperativeHandle(ref, () => ({
        selections,
        activeCell,
        setActiveCell,
        isEditInProgress,
    }));

    return (
        <View style={styles.container}>
            <Grid
                ref={countGridRef}
                columnCount={1}
                width={50}
                height={height + 40}
                frozenRows={1}
                rowCount={rowCount + 1}
                columnWidth={defaultRowCountColumnWidth}
                rowHeight={rowHeight}
                showScrollbar={false}
                itemRenderer={renderRowCountCell}
            />
            <View {...rest}>
                <Grid
                    columnCount={columnCount}
                    height={40}
                    rowCount={1}
                    frozenColumns={frozenColumns}
                    ref={headerGridRef}
                    width={width}
                    columnWidth={columnWidth}
                    rowHeight={rowHeight}
                    showScrollbar={false}
                    itemRenderer={headerCellRenderer}
                />
                <View style={styles.tableBodyContainer} {...innerContainerProps}>
                    <Grid
                        ref={gridRef}
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
                        {...selectionProps}
                        {...editableProps}
                        onKeyDown={onKeyDown}
                        onMouseDown={onMouseDown}
                        onScroll={onScroll}
                        stageProps={stageProps}
                    />
                    {editorComponent}
                </View>
                <Icon name="star-outline" size={12} />
            </View>
        </View>
    );
};

const renderRowCountCell = (props: RendererProps) => <RowCountCell {...props} />;

export const RowCountCell = ({ rowIndex, ...rest }: RendererProps) => {
    const [hovered, setHovered] = useState(false);

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
            align="center"
            padding={15}>
            {(rowIndex === 0 || (rowIndex > 0 && hovered)) && (
                <CanvasIcon
                    x={rest.x}
                    y={rest.y}
                    width={rest.width}
                    height={rest.height}
                    padding={10}
                    text="󰄱"
                    size={20}
                    textColor="#00000051"
                    align="center"
                    verticalAlign="center"
                />
            )}
        </DefaultCell>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
    tableBodyContainer: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
    },
});

export default memo(forwardRef<DataGridRef, Props>(DataGrid));
