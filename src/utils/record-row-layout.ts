import type React from 'react';
// import { ILightOrDarkThemeColors } from '@apitable/components';
// import { ILinearRow, ILinearRowRecord, RowHeight } from '@apitable/core';
// import { CommentBgFilled } from '@apitable/icons';
import { DEFAULT_NESTED_GROUP_GAP, GRID_ROW_HEAD_WIDTH } from './constants';
import { GridLayout } from './grid-layout';
import type { GroupRecord } from './grouping-types';

interface IFirstCell {
    row: GroupRecord;
    style: React.CSSProperties;
    isActiveRow: boolean;
    isCheckedRow: boolean;
    isHoverRow: boolean;
    isDraggingRow: boolean;
    isThisCellWillMove: boolean;
    // commentCount: any;
    // commentVisible?: boolean;
    // colors: ILightOrDarkThemeColors;
}

// const CommentBjFilledPath = CommentBgFilled.toString();

export class RecordRowLayout extends GridLayout {
    private renderFirstCell({
        row,
        style,
        isActiveRow,
        isCheckedRow,
        isHoverRow,
        isDraggingRow,
        isThisCellWillMove,
    }: // commentCount,
    // commentVisible,
    // colors,
    IFirstCell) {
        if (!this.isFirst) return;

        const { level } = row;
        const { fill } = style;
        if (level) this.renderIndentFront(level - 1);
        const y = this.y;
        const rowHeight = this.rowHeight;
        const columnWidth = this.columnWidth;
        const groupOffset = level ? (level - 1) * DEFAULT_NESTED_GROUP_GAP + 0.5 : 0.5;
        this.rect({
            x: groupOffset,
            y,
            width: GRID_ROW_HEAD_WIDTH + columnWidth - groupOffset + 0.5,
            height: rowHeight,
            fill: isDraggingRow ? this.colors.lowestBg : this.colors.white,
            stroke: this.colors.lines,
        });
        this.rect({
            x: GRID_ROW_HEAD_WIDTH + groupOffset,
            y: y + 0.5,
            width: columnWidth - groupOffset,
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
        // this.setStyle({ fontSize: 13 });
        // this.text({
        //     x: groupOffset + GRID_ROW_HEAD_WIDTH / 2,
        //     y: y + 10,
        //     text: String((row as GroupRecord).realIndex),
        //     textAlign: 'center',
        // });
        // if (commentVisible) {
        //     this.path({
        //         x: groupOffset + 44.5,
        //         y: y + (RowHeight.Short - GRID_ICON_COMMON_SIZE) / 2 - 5,
        //         data: CommentBjFilledPath,
        //         size: GRID_ICON_COMMON_SIZE,
        //         scaleX: 0.375,
        //         scaleY: 0.375,
        //         fill: colors.rainbowTeal1,
        //     });
        //     this.text({
        //         x: groupOffset + 48.5 + GRID_ICON_COMMON_SIZE / 2,
        //         y: y + (RowHeight.Short - 14) / 2,
        //         text: String(commentCount),
        //         fillStyle: colors.teal[500],
        //         textAlign: 'center',
        //     });
        // }
    }

    private renderLastCell({ row, style }: Pick<IFirstCell, 'row' | 'style'>) {
        if (!this.isLast) return;
        this.renderAddFieldBlank(row);
        if (this.isFirst) return;

        const { level } = row;
        const { fill, stroke } = style;
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
        if (level > 1) {
            this.renderIndentEnd(level - 1);
        }
    }

    private renderCommonCell({ style }: Pick<IFirstCell, 'style'>) {
        if (this.isFirst || this.isLast) return;

        const { fill, stroke } = style;
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
            // commentCount,
            // commentVisible,
        } = props;

        this.renderFirstCell({
            row,
            style,
            isHoverRow,
            isActiveRow,
            isCheckedRow,
            isDraggingRow,
            isThisCellWillMove,
            // commentCount,
            // commentVisible,
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
