import type React from 'react';
import { GridLayout } from './grid-layout';
import type { IShadowProps, Row } from './types';

interface IFirstCell {
    row: Row;
    style?: React.CSSProperties;
    isActiveRow: boolean;
    isCheckedRow: boolean;
    isHoverRow: boolean;
    isDraggingRow: boolean;
    isThisCellWillMove: boolean;
    shadowProps?: IShadowProps;
}

export class RecordRowLayout extends GridLayout {
    private renderFirstCell({}: IFirstCell) {
        if (!this.isFirst) return;

        // const { fill } = style || {};
        // if (level) this.renderIndentFront(level - 1);

        // const y = this.y;
        // const rowHeight = this.rowHeight;
        // const groupOffset =
        //     this.groupCount || 0 ? (this.groupCount || 0) * DEFAULT_NESTED_GROUP_GAP + 0.5 : 0.5;

        // console.log({ groupOffset });

        // this.rect({
        //     x: groupOffset,
        //     y,
        //     width: GRID_ROW_HEAD_WIDTH - 4,
        //     height: rowHeight,
        //     fill: isDraggingRow ? this.colors.lowestBg : this.colors.primary,
        //     stroke: this.colors.lines,
        // });

        // if (isHoverRow || isCheckedRow || isActiveRow || isThisCellWillMove) {
        //     return this.rect({
        //         x: groupOffset,
        //         y: y + 0.5,
        //         width: GRID_ROW_HEAD_WIDTH - 4,
        //         height: rowHeight - 1,
        //         fill,
        //     });
        // }
    }

    private renderLastCell({
        row,
        style,
        shadowProps,
    }: Pick<IFirstCell, 'row' | 'style' | 'shadowProps'>) {
        if (!this.isLast) return;
        this.renderAddFieldBlank(row);
        if (this.isFirst) return;

        const { fill, stroke } = style || {};
        this.rect({
            x: this.x,
            y: this.y,
            width: this.columnWidth,
            height: this.rowHeight,
            fill: fill || this.colors.backgroundColor,
            stroke: stroke || this.colors.lines,
            ...shadowProps,
        });

        // this.renderIndentEnd(this.groupCount);
    }

    private renderCommonCell({ style, shadowProps }: Pick<IFirstCell, 'style' | 'shadowProps'>) {
        if (this.isFirst || this.isLast) return;

        const { fill, stroke } = style || {};
        this.rect({
            x: this.x,
            y: this.y,
            width: this.columnWidth,
            height: this.rowHeight,
            fill: this.colors.backgroundColor,
        });
        this.rect({
            x: this.x,
            y: this.y,
            width: this.columnWidth,
            height: this.rowHeight,
            fill: fill || this.colors.backgroundColor,
            stroke: stroke || this.colors.lines,
            ...shadowProps,
        });
    }

    render(props: IFirstCell) {
        const {
            row,
            isHoverRow,
            isCheckedRow,
            isActiveRow,
            isDraggingRow,
            isThisCellWillMove,
            shadowProps,
        } = props;

        let fill = this.colors.backgroundColor;

        if (isHoverRow || isCheckedRow || isActiveRow || isThisCellWillMove) {
            fill = this.colors.rowSelectedBg;
            if (isDraggingRow) {
                fill = this.colors.lowestBg;
            } else if (isThisCellWillMove) {
                fill = this.colors.warnLight;
            } else if (isCheckedRow) {
                fill = this.colors.cellSelectedColorSolid;
            }
        }

        this.renderFirstCell({
            row,
            style: { fill },
            isHoverRow,
            isActiveRow,
            isCheckedRow,
            isDraggingRow,
            isThisCellWillMove,
            shadowProps,
        });
        this.renderCommonCell({
            style: { fill },
            shadowProps,
        });
        this.renderLastCell({
            row,
            style: { fill },
            shadowProps,
        });
    }
}

export const recordRowLayout = new RecordRowLayout();
