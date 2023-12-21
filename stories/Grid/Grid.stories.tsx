import { Rect, Text } from 'react-konva';
import Grid, { CellInterface, GridRef, RendererProps } from '../../src/components/Grid/Grid';
import React, {
    createContext,
    Dispatch,
    Fragment,
    SetStateAction,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { useWindowDimensions } from 'react-native';
import { default as DataGridComponent, HeaderCell } from '../../src/DataGrid';
import { records } from './mocks';
import { Icon } from '@bambooapp/bamboo-molecules/components';

const renderCell = ({ key, rowIndex, columnIndex, x, y, width, height }: RendererProps) => {
    const text = `${rowIndex}x${columnIndex}`;
    const fill = '#fff';

    return (
        <Fragment key={key}>
            <Rect
                x={x}
                y={y}
                height={height}
                width={width}
                fill={fill}
                stroke="grey"
                strokeWidth={0.5}
            />
            <Text
                x={x}
                y={y}
                height={height}
                width={width}
                text={text}
                verticalAlign="middle"
                align="center"
            />
        </Fragment>
    );
};

const columnWidth = (index: number) => {
    if (index % 3 === 0) return 200;
    return 100;
};

const rowHeight = (index: number) => {
    if (index % 2 === 0) return 60;
    return 40;
};

export const LargeGrid: React.FC = () => {
    const { width: _width, height: _height } = useWindowDimensions();
    const width = _width - 30;
    const height = _height - 30;

    return (
        <Grid
            width={width}
            height={height}
            columnCount={1000000}
            rowCount={1000000}
            columnWidth={columnWidth}
            rowHeight={rowHeight}
            itemRenderer={renderCell}
        />
    );
};

export default {
    title: 'LargeGrid',
    component: LargeGrid,
};
//
// const useGetCellValue = <T,>() => {
//     const { data, setData } = useContext(CellValuesContext);
//
//     const getCellValue = useCallback(
//         ({ rowIndex, columnIndex }: CellInterface) => data[rowIndex]?.[columnIndex],
//         [data],
//     );
//
//     const setCellValue = useCallback(
//         ({ rowIndex, columnIndex }: CellInterface, value: T) => {
//             setData(prev => {
//                 const newData = [...prev];
//
//                 newData[rowIndex] = {
//                     ...prev[rowIndex],
//                     [columnIndex]: value,
//                 };
//
//                 return newData;
//             });
//         },
//         [setData],
//     );
//
//     return [getCellValue, setCellValue, data, setData];
// };

const useCellValue = <T,>(cell: CellInterface | null) => {
    const { data, setData } = useContext(CellValuesContext);
    const setValue = useCallback(
        (value: any, { rowIndex, columnIndex }: CellInterface) => {
            setData(prev => {
                const newData = [...prev];

                newData[rowIndex] = {
                    ...prev[rowIndex],
                    [columnIndex]: value,
                };

                return newData;
            });
        },
        [setData],
    );

    if (!cell) return [null as T, () => {}];

    const { rowIndex, columnIndex } = cell;

    return [data[rowIndex]?.[columnIndex] as T, setValue];
};

const CellValuesContext = createContext<{ data: any[]; setData: Dispatch<SetStateAction<any[]>> }>({
    data: [],
    setData: () => {},
});

const columnsCount = Object.keys(records[0]).length;

const DataGridInner = () => {
    const { width: _width, height: _height } = useWindowDimensions();
    const width = _width - 80;
    const height = _height - 80;
    const [columnWidthMap, setColumnWidthMap] = useState<Record<number, number>>({});
    const headerGridRef = useRef<GridRef>(null);
    const gridRef = useRef<GridRef>(null);
    const ref = useRef<any>(null);

    const handleResize = useCallback((columnIndex: number, newWidth: number) => {
        setColumnWidthMap(prev => {
            return {
                ...prev,
                [columnIndex]: newWidth,
            };
        });

        headerGridRef.current?.resizeColumns([columnIndex]);
        gridRef.current?.resizeColumns([columnIndex]);
    }, []);

    const onResizeEnd = useCallback((columnIndex: number, newWidth: number) => {
        setColumnWidthMap(prev => {
            return {
                ...prev,
                [columnIndex]: newWidth,
            };
        });

        headerGridRef.current?.resizeColumns([columnIndex]);
        gridRef.current?.resizeColumns([columnIndex]);
    }, []);

    const renderHeaderCell = useCallback(
        (props: RendererProps) => (
            <HeaderCell {...props} onResize={handleResize} onResizeEnd={onResizeEnd} />
        ),
        [handleResize, onResizeEnd],
    );

    const getColumnWidth = useCallback(
        (index: number) => {
            if (index in columnWidthMap) return columnWidthMap[index];
            return 100;
        },
        [columnWidthMap],
    );

    return (
        <DataGridComponent
            ref={ref}
            headerGridRef={headerGridRef}
            gridRef={gridRef}
            rowCount={records.length}
            columnCount={columnsCount}
            width={width}
            height={height}
            headerCellRenderer={renderHeaderCell}
            columnWidth={getColumnWidth}
            useCellValue={useCellValue as any}
            headerHeight={30}
        />
    );
};

export const DataGrid = () => {
    const [data, setData] = useState(records);

    return (
        <CellValuesContext.Provider value={{ data, setData }}>
            <DataGridInner />
            <Icon name="star-outline" size={12} />
        </CellValuesContext.Provider>
    );
};
