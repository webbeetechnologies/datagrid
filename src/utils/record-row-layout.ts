import type React from 'react';
import { DEFAULT_NESTED_GROUP_GAP, GRID_ROW_HEAD_WIDTH } from './constants';
import { GridLayout } from './grid-layout';
import type { Row } from './types';

interface IFirstCell {
    row: Row;
    style?: React.CSSProperties;
    isActiveRow: boolean;
    isCheckedRow: boolean;
    isHoverRow: boolean;
    isDraggingRow: boolean;
    isThisCellWillMove: boolean;
}

export class RecordRowLayout extends GridLayout {
    private renderFirstCell({
        row,
        style,
        isActiveRow,
        isCheckedRow,
        isHoverRow,
        isDraggingRow,
        isThisCellWillMove,
    }: IFirstCell) {
        if (!this.isFirst) return;

        const { level } = row;
        const { fill } = style || {};
        if (level) this.renderIndentFront(level - 1);
        const y = this.y;
        const rowHeight = this.rowHeight;
        const groupOffset = level ? level * DEFAULT_NESTED_GROUP_GAP + 0.5 : 0.5;
        this.rect({
            x: groupOffset,
            y,
            width: GRID_ROW_HEAD_WIDTH,
            height: rowHeight,
            fill: isDraggingRow ? this.colors.lowestBg : this.colors.backgroundColor,
            stroke: this.colors.lines,
        });
        this.rect({
            x: GRID_ROW_HEAD_WIDTH + groupOffset,
            y: y + 0.5,
            width: GRID_ROW_HEAD_WIDTH - groupOffset,
            height: rowHeight - 1,
            fill: fill || 'transparent',
        });
        if (isHoverRow || isCheckedRow || isActiveRow || isThisCellWillMove) {
            let fill = this.colors.rowSelectedBg;
            if (isDraggingRow) {
                fill = this.colors.lowestBg;
            } else if (isThisCellWillMove) {
                fill = this.colors.warnLight;
            } else if (isCheckedRow) {
                fill = this.colors.cellSelectedColorSolid;
            }
            return this.rect({
                x: groupOffset + 0.5,
                y: y + 0.5,
                width: GRID_ROW_HEAD_WIDTH,
                height: rowHeight - 1,
                fill,
            });
        }
    }

    private renderLastCell({ row, style }: Pick<IFirstCell, 'row' | 'style'>) {
        if (!this.isLast) return;
        this.renderAddFieldBlank(row);
        if (this.isFirst) return;

        const { level } = row;
        const { fill, stroke } = style || {};
        const columnWidth = this.columnWidth;
        const width = level === 3 ? columnWidth - DEFAULT_NESTED_GROUP_GAP : columnWidth;
        this.rect({
            x: this.x,
            y: this.y,
            width,
            height: this.rowHeight,
            fill: fill || this.colors.backgroundColor,
            stroke: stroke || this.colors.lines,
        });

        this.renderIndentEnd(this.groupCount);
    }

    private renderCommonCell({ style }: Pick<IFirstCell, 'style'>) {
        if (this.isFirst || this.isLast) return;

        const { fill, stroke } = style || {};
        this.rect({
            x: this.x,
            y: this.y,
            width: this.columnWidth,
            height: this.rowHeight,
            fill: fill || this.colors.backgroundColor,
            stroke: stroke || this.colors.lines,
        });
    }

    render(props: IFirstCell) {
        const {
            row,
            style,
            isHoverRow,
            isCheckedRow,
            isActiveRow,
            isDraggingRow,
            isThisCellWillMove,
        } = props;

        this.renderFirstCell({
            row,
            style,
            isHoverRow,
            isActiveRow,
            isCheckedRow,
            isDraggingRow,
            isThisCellWillMove,
        });
        this.renderCommonCell({
            style,
        });
        this.renderLastCell({
            row,
            style,
        });
    }
}

export const recordRowLayout = new RecordRowLayout();
