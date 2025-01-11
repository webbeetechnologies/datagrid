import range from 'lodash/range';
import { ADD_FIELD_COL_WIDTH, DEFAULT_NESTED_GROUP_GAP } from './constants';
import { CanvasDrawer } from './drawer';
import type { Row } from './types';

interface ILayout {
    x: number;
    y: number;
    rowIndex: number;
    columnIndex: number;
    rowHeight: number;
    columnWidth: number;
    groupCount: number;
    columnCount: number;
    // viewType: ViewType;
}

export class GridLayout extends CanvasDrawer {
    protected x = 0;
    protected y = 0;
    protected rowHeight = 0;
    protected columnWidth = 0;
    protected rowIndex = 0;
    protected columnIndex = 0;
    protected groupCount = 0;
    protected columnCount = 0;
    // protected viewType = ViewType.Grid;

    init({
        x,
        y,
        rowIndex,
        columnIndex,
        rowHeight,
        columnWidth,
        groupCount,
        columnCount,
    }: // viewType,
    ILayout) {
        this.x = x;
        this.y = y;
        this.rowIndex = rowIndex;
        this.columnIndex = columnIndex;
        this.rowHeight = rowHeight;
        this.columnWidth = columnWidth;
        this.groupCount = groupCount;
        this.columnCount = columnCount;
        // this.viewType = viewType;
    }

    protected get isFirst() {
        return this.columnIndex === 0;
    }

    protected get isLast() {
        return this.columnIndex === this.columnCount - 1;
    }

    protected get addBtnWidth() {
        return this.groupCount ? ADD_FIELD_COL_WIDTH : ADD_FIELD_COL_WIDTH;
    }

    /**
     * Get the list of corresponding background colors according to the group length
     */
    private getGroupBackgrounds() {
        const length = this.groupCount;
        const backgrounds: string[] = [this.colors.backgroundColor];
        if (length > 1) backgrounds.unshift(this.colors.backgroundColor);
        if (length > 2) backgrounds.unshift(this.colors.backgroundColor);
        return backgrounds;
    }

    /**
     * Get the corresponding background color according to the corresponding depth
     */
    protected getGroupBackgroundByDepth(depth: number) {
        // if (this.viewType === ViewType.Gantt) return colors.defaultBg;
        if (!this.groupCount) return this.colors.backgroundColor;
        const backgrounds = this.getGroupBackgrounds();
        return backgrounds[depth];
    }

    protected renderAddFieldBlank(_row: Row) {
        const width = this.addBtnWidth;
        const background = this.getGroupBackgroundByDepth(0);
        const x = this.x + this.columnWidth;
        const y = this.y;
        const rowHeight = this.rowHeight;
        this.rect({
            x: x + 0.5,
            y: y - 0.5,
            width,
            height: rowHeight + 1,
            fill: background,
        });
        this.line({
            x,
            y,
            points: [width, 0, width, rowHeight],
            stroke: this.colors.lines,
        });
    }

    /**
     * Render row header indent area
     */
    protected renderIndentFront(depth: number) {
        range(depth).forEach(i => {
            this.rect({
                x: i * DEFAULT_NESTED_GROUP_GAP,
                y: this.y - 0.5,
                width: DEFAULT_NESTED_GROUP_GAP,
                height: this.rowHeight,
                fill: this.getGroupBackgroundByDepth(i),
            });
            this.line({
                x: i * DEFAULT_NESTED_GROUP_GAP + 0.5,
                y: this.y,
                points: [0, 0, 0, this.rowHeight],
                stroke: this.colors.lines,
            });
        });
    }

    /**
     * Render row end indent area
     */
    protected renderIndentEnd(depth: number, width?: number) {
        const x = this.x;
        const y = this.y;
        const rowHeight = this.rowHeight;
        range(depth).forEach(i => {
            this.rect({
                x: x + (width || this.columnWidth) + i * DEFAULT_NESTED_GROUP_GAP + 0.5,
                y: y - 0.5,
                width: (i + 1) * DEFAULT_NESTED_GROUP_GAP,
                height: rowHeight,
                fill: this.getGroupBackgroundByDepth(i),
            });
            this.line({
                x: x + (width || this.columnWidth) + i * DEFAULT_NESTED_GROUP_GAP,
                y,
                points: [0, 0, 0, rowHeight],
                stroke: this.colors.lines,
            });
        });
    }
}
