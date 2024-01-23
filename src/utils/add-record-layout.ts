import { DEFAULT_NESTED_GROUP_GAP, SELECTION_COL_WIDTH } from './constants';
import { GridLayout } from './grid-layout';
import type { GroupRecord } from './grouping-types';

interface ICell {
    row: any;
    isHoverColumn: boolean;
    width: number;
    isHoverRow: boolean;
    rowCreatable: boolean;
}

export class AddRowLayout extends GridLayout {
    override renderAddFieldBlank(row: GroupRecord) {
        super.renderAddFieldBlank(row);
        const { level } = row;
        const width = this.addBtnWidth;
        const rowHeight = this.rowHeight;
        if (level <= 1) {
            this.line({
                x: this.x + this.columnWidth,
                y: this.y,
                points: [0, rowHeight, width, rowHeight],
                stroke: this.colors.lines,
            });
        }
    }

    private renderCell({
        width,
        isHoverRow,
        rowCreatable,
    }: Pick<ICell, 'width' | 'isHoverRow' | 'rowCreatable'>) {
        const x = this.x;
        const y = this.y;
        const rowHeight = this.rowHeight;
        const fill =
            isHoverRow && rowCreatable ? this.colors.rowSelectedBg : this.colors.backgroundColor;
        this.rect({
            x,
            y: y + 0.5,
            width,
            height: rowHeight,
            fill,
        });
        this.line({
            x,
            y: y + rowHeight,
            points: [0, 0, width, 0],
            stroke: this.colors.lines,
        });
    }

    private renderFirstCell({
        row,
        isHoverRow,
        // isHoverColumn,
        rowCreatable,
    }: Pick<ICell, 'row' | 'isHoverRow' | 'isHoverColumn' | 'rowCreatable'>) {
        if (!this.isFirst) return;
        const { depth } = row;
        const y = this.y;
        const rowHeight = this.rowHeight;
        const columnWidth = this.columnWidth;
        if (depth) this.renderIndentFront(depth - 1);
        const frozenOffset = !depth ? 0.5 : (depth - 1) * DEFAULT_NESTED_GROUP_GAP + 0.5;
        const fill =
            isHoverRow && rowCreatable ? this.colors.rowSelectedBg : this.colors.backgroundColor;
        this.rect({
            x: frozenOffset,
            y: y + 0.5,
            width: columnWidth + SELECTION_COL_WIDTH - frozenOffset + 1,
            height: rowHeight,
            fill,
        });
        this.line({
            x: frozenOffset,
            y,
            points: [
                0,
                0,
                0,
                rowHeight,
                columnWidth + SELECTION_COL_WIDTH - frozenOffset + 1,
                rowHeight,
            ],
            stroke: this.colors.lines,
        });
        if (rowCreatable) {
            // const curX = depth ? (depth - 1) * DEFAULT_NESTED_GROUP_GAP + 30 : 30;
            // this.path({
            //     x: curX,
            //     y: y + (rowHeight - GRID_ICON_COMMON_SIZE) / 2 - 0.5,
            //     data: AddOutlinedPath,
            //     size: 16,
            //     fill: colors.thirdLevelText,
            // });
            // if (isHoverColumn && isHoverRow) {
            //     this.setStyle({
            //         fontSize: 13,
            //         fontWeight: 'normal',
            //     });
            //     this.text({
            //         x: curX + 18,
            //         y: y + rowHeight / 2,
            //         verticalAlign: 'middle',
            //         text: t(Strings.add_row_button_tip),
            //         fillStyle: colors.black[500],
            //     });
            // }
        }
    }

    private renderLastCell({
        row,
        rowCreatable,
        isHoverRow,
    }: Pick<ICell, 'row' | 'rowCreatable' | 'isHoverRow'>) {
        if (!this.isLast) return;
        const { level } = row;
        const x = this.x;
        const y = this.y;
        const rowHeight = this.rowHeight;
        const columnWidth = this.columnWidth;
        const width =
            !this.isFirst && level === 3 ? columnWidth - DEFAULT_NESTED_GROUP_GAP : columnWidth;
        if (!this.isFirst) {
            this.renderCell({
                width,
                rowCreatable,
                isHoverRow,
            });
            if (level === 3) {
                this.renderIndentEnd(level);
            }
        }
        if (level >= 1) {
            this.line({
                x: x + width,
                y,
                points: [0, 0, 0, rowHeight],
                stroke: this.colors.lines,
            });
        }
        this.renderAddFieldBlank(row);
    }

    private renderCommonCell({
        rowCreatable,
        isHoverRow,
    }: Pick<ICell, 'rowCreatable' | 'isHoverRow'>) {
        if (this.isFirst || this.isLast) return;
        this.renderCell({
            width: this.columnWidth,
            rowCreatable,
            isHoverRow,
        });
    }

    // Show "add row" prompt when hovering
    // private renderHoverTip({
    //     rowCreatable,
    //     isHoverColumn,
    //     isHoverRow,
    // }: Pick<ICell, 'rowCreatable' | 'isHoverColumn' | 'isHoverRow'>) {
    //     if (this.isFirst || !rowCreatable || !isHoverColumn || !isHoverRow) return;
    //     const x = this.x;
    //     const y = this.y;
    //     const rowHeight = this.rowHeight;
    //     this.path({
    //         x: x + 8.5,
    //         y: y + (rowHeight - GRID_ICON_COMMON_SIZE) / 2 - 0.5,
    //         data: AddOutlinedPath,
    //         size: 16,
    //         fill: colors.thirdLevelText,
    //     });
    //     this.setStyle({
    //         fontSize: 13,
    //         fontWeight: 'normal',
    //     });
    //     this.text({
    //         x: x + 26.5,
    //         y: y + rowHeight / 2,
    //         verticalAlign: 'middle',
    //         text: t(Strings.add_row_button_tip),
    //         fillStyle: colors.black[500],
    //     });
    // }

    render({
        row,
        rowCreatable,
        isHoverRow,
        isHoverColumn,
    }: Pick<ICell, 'row' | 'rowCreatable' | 'isHoverColumn' | 'isHoverRow'>) {
        this.renderFirstCell({
            row,
            rowCreatable,
            isHoverRow,
            isHoverColumn,
        });
        this.renderCommonCell({
            rowCreatable,
            isHoverRow,
        });
        this.renderLastCell({
            row,
            rowCreatable,
            isHoverRow,
        });
        // this.renderHoverTip({
        //     rowCreatable,
        //     isHoverRow,
        //     isHoverColumn,
        // });
    }
}

export const addRowLayout = new AddRowLayout();
