import isNil from 'lodash.isnil';
import type { RefObject } from 'react';
import type { CellInterface, GridRef } from '../components/Grid/types';

export const resolveFloatingRowPosition = ({
    isFiltered,
    isMoved,
    rowIndex,
    coords,
    height,
    clientY,
    onResolve,
    gridRef,
}: {
    isFiltered?: boolean;
    isMoved?: boolean;
    coords?: CellInterface | null;
    rowIndex: number;
    height: number;
    clientY: number;
    onResolve: (cell: CellInterface) => void;
    gridRef: RefObject<GridRef | null>;
}) => {
    if ((isFiltered || isMoved) && coords) {
        const floatingRowOffset = gridRef.current?.getCellOffsetFromCoords({
            rowIndex: rowIndex,
            columnIndex: coords?.columnIndex,
        });

        if (floatingRowOffset && !isNil(floatingRowOffset?.x) && !isNil(floatingRowOffset?.y)) {
            // TODO - remove hardcode number 150
            const floatingRowClientY =
                floatingRowOffset.y +
                150 +
                (rowIndex > 1 ? height / 2 : 0) -
                (gridRef.current?.getScrollPosition().scrollTop || 0);

            if (clientY > floatingRowClientY && clientY < floatingRowClientY + height) {
                onResolve({
                    rowIndex,
                    columnIndex: coords.columnIndex,
                });
            }
        }
    }
};
