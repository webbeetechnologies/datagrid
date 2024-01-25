import { DEFAULT_NESTED_GROUP_GAP, SELECTION_COL_WIDTH } from './constants';
import { cellsDrawer } from '../components/Grid/utils';
import { GridLayout } from './grid-layout';
import type { Row } from './types';
import type { Field, IRenderStyleProps } from './types';

interface ICell {
    row: Row;
    cellValue: any;
    groupField: Field;
}

export class GroupTabLayout extends GridLayout {
    protected override renderAddFieldBlank(row: Row) {
        super.renderAddFieldBlank(row);
        const { level } = row;
        if (level === 0) {
            const width = this.addBtnWidth;
            this.line({
                x: this.x + this.columnWidth,
                y: this.y,
                points: [0, 0, width, 0],
                stroke: this.colors.lines,
            });
        }
    }

    private renderFirstCell({ row, cellValue, groupField }: ICell) {
        if (!this.isFirst) return;
        const { level } = row;
        const y = this.y;
        const rowHeight = this.rowHeight;
        const columnWidth = this.columnWidth;
        if (level) this.renderIndentFront(level);
        const groupOffset = level * DEFAULT_NESTED_GROUP_GAP + 0.5;
        const fill = this.getGroupBackgroundByDepth(level);
        this.rect({
            x: groupOffset,
            y,
            width: columnWidth + SELECTION_COL_WIDTH + 0.5,
            height: rowHeight,
            fill,
            stroke: this.colors.lines,
        });

        // Compatible with grouping condition column with incorrect data
        if (groupField == null) {
            this.setStyle({ fontSize: 14 });
            return this.text({
                x: groupOffset + 35,
                y: y + (rowHeight - 14) / 2,
                text: 'Field is filtered',
                fillStyle: this.colors.textColor,
                fontSize: 14,
            });
        }

        this.setStyle({ fontSize: 12 });
        this.text({
            x: groupOffset + 35,
            y: y + 6,
            text: groupField.title,
            fillStyle: this.colors.textColor,
            fontSize: 12,
        });
        if (cellValue != null) {
            this.setStyle({ fontSize: 13 });
            this.ctx.save();
            this.ctx.rect(groupOffset + 25.5, y + 17.5, columnWidth, rowHeight - 18);
            this.ctx.clip();
            this.ctx.restore();

            const renderProps = {
                x: groupOffset + 25.5,
                y: y + 17.5,
                columnWidth,
                rowHeight: rowHeight - 18,
                recordId: undefined,
                field: groupField,
                cellValue,
                isActive: false,
                style: { textAlign: 'left' } as IRenderStyleProps,
            };
            return cellsDrawer.renderCell(renderProps as any, this.ctx);
        }
        this.setStyle({ fontSize: 14 });
        this.text({
            x: groupOffset + 36,
            y: y + 24,
            text: `(${cellValue == null ? 'Empty' : 'Error'})`,
            fillStyle: this.colors.textColor,
            fontSize: 14,
        });
    }

    private renderLastCell(row: Row) {
        if (!this.isLast) return;
        this.renderAddFieldBlank(row);
        if (this.isFirst) return;

        const { level } = row;
        if (level) this.renderIndentEnd(level);

        const x = this.x;
        const y = this.y;
        const rowHeight = this.rowHeight;
        const columnWidth = this.columnWidth;
        const lastTabOffsetList = [40, 0, -DEFAULT_NESTED_GROUP_GAP];
        const width = columnWidth + lastTabOffsetList[level];
        const fill = this.getGroupBackgroundByDepth(level);
        this.rect({
            x,
            y: y + 0.5,
            width,
            height: rowHeight,
            fill,
        });
        this.line({
            x,
            y,
            points: [0, 0, width, 0, width, rowHeight, 0, rowHeight],
            stroke: this.colors.lines,
        });
    }

    private renderCommonCell(row: Row) {
        if (this.isFirst || this.isLast) return;
        const x = this.x;
        const y = this.y;
        const rowHeight = this.rowHeight;
        const columnWidth = this.columnWidth;
        const { level } = row;
        const fill = this.getGroupBackgroundByDepth(level);
        this.rect({
            x,
            y,
            width: columnWidth,
            height: rowHeight,
            fill,
        });
        this.line({
            x,
            y,
            points: [0, 0, columnWidth, 0],
            stroke: this.colors.lines,
        });
        this.line({
            x,
            y,
            points: [0, rowHeight, columnWidth, rowHeight],
            stroke: this.colors.lines,
        });
    }

    render({ row, cellValue, groupField }: ICell) {
        this.renderFirstCell({
            row,
            cellValue,
            groupField,
        });
        this.renderLastCell(row);
        this.renderCommonCell(row);
    }
}

export const groupTabLayout = new GroupTabLayout();
