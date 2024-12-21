import React, { useCallback, useEffect, useRef, useState, useMemo, CSSProperties } from 'react';
import { useLatest } from '@bambooapp/bamboo-molecules';

import type {
    CellInterface,
    ScrollCoords,
    CellPosition,
    GridRef,
    SelectionArea,
} from '../components/Grid/types';
import { KeyCodes, Direction } from '../components/Grid/types';
import {
    findNextCellWithinBounds,
    isEqualCells,
    HiddenType,
    isArrowKey,
    getNextFocusableCellByDirection,
} from '../components/Grid/helpers';
import { castToString, autoSizerCanvas } from '../utils';
import { resolveFloatingRowPosition } from '../utils/resolveFloatingRowPosition';
// import { useWhatHasUpdated } from './useWhatHasUpdated';

export type EditorConfig = {
    showOnFocused?: boolean;
    showOnDoubleClicked?: boolean;
    concatInitialValue?: boolean;
    canEdit?: boolean;
};

export interface UseEditableOptions {
    editorProps?: () => any;
    /**
     * Inject custom editors based on a cell
     */
    getEditor?: (cell: CellInterface | null) => React.ElementType | undefined;
    /*
     *
     * */
    useEditorConfig?: (cell: CellInterface | null) => EditorConfig | undefined;
    /**
     * Access grid methods
     */
    gridRef: React.MutableRefObject<GridRef | null>;
    /**
     * Value getter
     */
    useValue: (
        cell: CellInterface | null,
    ) => [any, (newValue: any, _?: unknown, _2?: unknown, isInitialValue?: boolean) => void];
    /**
     * Callback when user cancels editing
     */
    onCancel?: (
        e?: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>,
    ) => void;
    /**
     * Callback when user changes a value in editor
     */
    onChange?: (value: any, activeCell: CellInterface) => void;
    /**
     * Callback when user submits a value. Use this to update state
     */
    onAfterSubmit?: (
        value: any,
        activeCell: CellInterface,
        nextActiveCell?: CellInterface | null,
    ) => void;
    /**
     * Callback when user selects an area and presses delete key
     */
    onDelete?: (activeCell: CellInterface, selections: SelectionArea[]) => void;
    /**
     * Currently selected cells, injected by useSelection
     */
    selections: SelectionArea[];
    /**
     * Active selected cell. This can change, if the user is in formula mode
     */
    activeCell: CellInterface | null;
    /**
     * Callback fired before editing. Can be used to prevent editing. Do not use it, Can be removed in next release.
     */
    canEdit?: (coords: CellInterface) => boolean;
    /**
     * Number of frozen columns
     */
    frozenColumns?: number;
    /**
     * Number of frozen rows
     */
    frozenRows?: number;
    /**
     * Hide editor on blur
     */
    hideOnBlur?: boolean;
    /**
     * Hidden rows
     */
    isHiddenRow?: HiddenType;
    /**
     * Hidden columns
     */
    isHiddenColumn?: HiddenType;
    /**
     * Is last row?
     */
    isLastRow?: HiddenType;
    /**
     * Is last column?
     */
    isLastColumn?: HiddenType;
    /**
     * No of columns in the grid
     */
    columnCount: number;
    /**
     * No of rows in the grid
     */
    rowCount: number;
    /**
     * Top bound of selection
     */
    selectionTopBound?: number;
    /**
     * Bottom bound
     */
    selectionBottomBound?: number;
    /**
     * Left bound
     */
    selectionLeftBound?: number;
    /**
     * Right bound
     */
    selectionRightBound?: number;
    onKeyDown?: (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLDivElement>,
    ) => void;
    /**
     * Sync callback before a cell is edited
     */
    onBeforeEdit?: (coords: CellInterface) => void;
    /**
     * If true, Once the editor is active, it will be always visible.
     * Editor will not scroll with the grid
     */
    sticky?: boolean;
    /**
     * Callback to submit the value back to data store
     */
    onSubmit?: (
        value: string | number,
        activeCell: CellInterface,
        nextActiveCell?: CellInterface | null,
    ) => void;
    floatingRowIndex?: number;
    isFloatingRowMoved?: boolean;
    isFloatingRowFiltered?: boolean;
    floatingRowHeight?: number;
}

export interface EditableResults {
    /**
     * Editor component that can be injected
     */
    editorComponent: React.ReactNode;
    /**
     * Double click listener, activates the grid
     */
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    /**
     * OnScroll listener to align the editor
     */
    onScroll?: (props: ScrollCoords) => void;
    /**
     * Key down listeners
     */
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    /**
     * Get next focusable cell based on current activeCell and direction user is moving
     */
    nextFocusableCell: (currentCell: CellInterface, direction: Direction) => CellInterface | null;
    /**
     * Is editing in progress
     */
    isEditInProgress: boolean;
    /**
     * Currently editing cell
     */
    editingCell: CellInterface | null;
    /**
     * Make a cell editable
     */
    makeEditable: (cell: CellInterface, value?: string) => void;
    /**
     * Set editable value imperatively
     */
    setValue: (value: any, activeCell: CellInterface, previousValue?: string) => void;
    /**
     * Hide editor
     */
    hideEditor: () => void;
    /**
     * Show editor
     */
    showEditor: () => void;
    /**
     * Bind to mousedown event
     */
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    /**
     * Imperatively trigger submit
     */
    submitEditor: (
        value: string,
        activeCell: CellInterface,
        nextActiveCell?: CellInterface | null,
    ) => void;
    /**
     * Cancels an edit
     */
    cancelEditor: () => void;
}

export interface EditorProps {
    /**
     * Currently selected bounds, useful for fomulas
     */
    selections?: SelectionArea[];
    /**
     * Callback when a value has changed.
     */
    onChange?: (value: string, activeCell: CellInterface) => void;
    /**
     * Callback to submit the value back to data store
     */
    onSubmit?: (
        value: string | number,
        activeCell: CellInterface,
        nextActiveCell?: CellInterface | null,
    ) => void;
    /**
     * On Cancel callbacks. Hides the editor
     */
    onCancel?: (
        e?: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>,
    ) => void;
    /**
     * Cell position, x, y, width and height
     */
    position: CellPosition;
    /**
     * Currently active cell, based on selection
     */
    activeCell: CellInterface;
    /**
     * Currrently edited cell
     */
    cell: CellInterface;
    /**
     * Scroll position of the grid
     */
    scrollPosition: ScrollCoords;
    /**
     * Next cell that should receive focus
     */
    nextFocusableCell?: (activeCell: CellInterface, direction?: Direction) => CellInterface | null;
    /**
     * Autofocus the editor when open
     */
    autoFocus?: boolean;
    /**
     * On keydown event
     */
    onKeyDown?: (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLDivElement>,
    ) => void;
    /**
     * Max editor width
     */
    maxWidth?: string | number;
    /**
     * Max editor height
     */
    maxHeight?: string | number;
    /**
     * Indicates if the cell is part of frozen row
     */
    isFrozenRow?: boolean;
    /**
     * Indicates if the cell is part of frozen column
     */
    isFrozenColumn?: boolean;
    /**
     * Frozen row offset
     */
    frozenRowOffset?: number;
    /**
     * Frozen column offset
     */
    frozenColumnOffset?: number;
    hasInitialValue: boolean;
}

/**
 * Default cell editor
 * @param props
 */
const DefaultEditor: React.FC<EditorProps> = props => {
    const {
        onChange: onChangeProp,
        onSubmit,
        onCancel,
        position,
        cell,
        nextFocusableCell,
        autoFocus = true,
        onKeyDown: onKeyDownProp,
        ...rest
    } = props;
    const borderWidth = 2;
    const padding = 10; /* 2 + 1 + 1 + 2 + 2 */

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const value = '';

    const { x = 0, y = 0, width = 0, height = 0 } = position;

    const getWidth = useCallback(
        (text: string | number) => {
            const textWidth = autoSizerCanvas.measureText(text)?.width || 0;
            return Math.max(textWidth + padding, width + borderWidth / 2);
        },
        [width],
    );

    const [inputWidth, setInputWidth] = useState(() => getWidth(value));

    useEffect(() => {
        setInputWidth(getWidth(value));
    }, [getWidth, value]);

    useEffect(() => {
        if (!inputRef.current) return;
        if (autoFocus) inputRef.current.focus();
        /* Focus cursor at the end */
        inputRef.current.selectionStart = castToString(value)?.length ?? 0;
        // TODO - remove eslint ignore after testing
        // eslint-disable-next-line
    }, []);

    const inputHeight = height;

    const onChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChangeProp?.(e.target.value, cell);
        },
        [cell, onChangeProp],
    );

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (!inputRef.current) return;
            const isShiftKey = e.nativeEvent.shiftKey;
            const value = inputRef.current.value;

            // Enter key
            if (e.which === KeyCodes.Enter) {
                onSubmit &&
                    onSubmit(
                        value,
                        cell,
                        nextFocusableCell?.(cell, isShiftKey ? Direction.Up : Direction.Down),
                    );
            }

            if (e.which === KeyCodes.Escape) {
                onCancel && onCancel(e);
            }

            if (e.which === KeyCodes.Tab) {
                e.preventDefault();
                onSubmit &&
                    onSubmit(
                        value,
                        cell,
                        nextFocusableCell?.(cell, isShiftKey ? Direction.Left : Direction.Right),
                    );
            }

            onKeyDownProp?.(e);
        },
        [cell, nextFocusableCell, onCancel, onKeyDownProp, onSubmit],
    );

    const { containerStyle } = useMemo(
        () => ({
            containerStyle: {
                top: y - borderWidth / 2,
                left: x,
                position: 'absolute',
                width: inputWidth,
                height: inputHeight + borderWidth,
                padding: borderWidth,
                // boxShadow: '0 2px 6px 2px rgba(60,64,67,.15)',
                border: '2px #1a73e8 solid',
                background: 'white',
            } as CSSProperties,
        }),
        [inputHeight, inputWidth, x, y],
    );

    return (
        <div style={containerStyle}>
            <textarea
                rows={1}
                cols={1}
                ref={inputRef}
                value={value}
                style={textAreaStyle}
                onChange={onChange}
                onKeyDown={onKeyDown}
                {...rest}
            />
        </div>
    );
};

export const getDefaultEditor = (_cell: CellInterface | null) => DefaultEditor;
const useDefaultEditorConfig = () => ({
    showOnDoubleClicked: true,
    concatInitialValue: true,
});

const defaultCanEdit = (_cell: CellInterface) => true;
const defaultIsHidden = (_i: number) => false;

const EMPTY_ARR = [] as SelectionArea[];

/**
 * Hook to make grid editable
 * @param param
 */
const useEditable = ({
    getEditor = getDefaultEditor,
    useEditorConfig = useDefaultEditorConfig,
    gridRef,
    useValue,
    onChange,
    onAfterSubmit,
    onCancel,
    onDelete,
    selections = EMPTY_ARR,
    activeCell,
    canEdit = defaultCanEdit,
    frozenRows = 0,
    frozenColumns = 0,
    hideOnBlur = true,
    isHiddenRow = defaultIsHidden,
    isHiddenColumn = defaultIsHidden,
    rowCount,
    columnCount,
    editorProps,
    onBeforeEdit,
    onKeyDown,
    sticky = false,
    onSubmit: onSubmitValue,
    isLastColumn,
    isLastRow,
    floatingRowHeight,
    isFloatingRowFiltered,
    floatingRowIndex,
    isFloatingRowMoved,
}: UseEditableOptions): EditableResults => {
    const [isEditorShown, setShowEditor] = useState<boolean>(false);
    const [position, setPosition] = useState<CellPosition>({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    const currentActiveCellRef = useRef<CellInterface | null>(null);
    const initialActiveCell = useRef<CellInterface | null>();
    const [scrollPosition, setScrollPosition] = useState<ScrollCoords>({
        scrollLeft: 0,
        scrollTop: 0,
    });
    const [value, _setValue] = useValue(activeCell);
    const setValueRef = useLatest(_setValue);

    const [autoFocus, setAutoFocus] = useState<boolean>(true);
    const isDirtyRef = useRef<boolean>(false);
    const currentValueRef = useLatest(value);
    const initialValueRef = useRef<string>();
    const maxEditorDimensionsRef = useRef<{ height: number; width: number }>();
    const hasInitialValue = useRef(false);
    /* To prevent stale closures data */
    // const getValueRef = useRef(getValue);
    const activeCellRef = useLatest(activeCell);

    const editorConfigRef = useLatest(useEditorConfig(activeCell));

    const showEditor = useCallback(() => setShowEditor(true), []);

    const hideEditor = useCallback(() => {
        setShowEditor(false);
        currentActiveCellRef.current = null;
    }, []);

    const focusGrid = useCallback(() => {
        requestAnimationFrame(() => gridRef.current && gridRef.current.focus());
    }, [gridRef]);

    /* Frozen flags */
    const isFrozenRow =
        currentActiveCellRef.current && currentActiveCellRef.current?.rowIndex < frozenRows;
    const isFrozenColumn =
        currentActiveCellRef.current && currentActiveCellRef.current?.columnIndex < frozenColumns;

    /**
     * Get current cell position based on scroll position
     * @param position
     * @param scrollPosition
     */
    const getCellPosition = useCallback(
        (position: CellPosition, scrollPosition: ScrollCoords) => {
            if (!currentActiveCellRef.current) return { x: 0, y: 0 };
            return {
                ...position,
                x: (position.x as number) - (isFrozenColumn ? 0 : scrollPosition.scrollLeft),
                y: (position.y as number) - (isFrozenRow ? 0 : scrollPosition.scrollTop),
            };
        },
        [isFrozenColumn, isFrozenRow],
    );

    /**
     * Make a cell editable
     * @param coords
     * @param initialValue
     */
    const makeEditable = useCallback(
        (
            coords: CellInterface,
            initialValue?: string,
            autoFocus: boolean = true,
            _hasInitialValue = false,
        ) => {
            if (!gridRef.current) return;
            /* Get actual coords for merged cells */
            coords = gridRef.current.getActualCellCoords(coords);

            /* Check if its the same cell */
            if (isEqualCells(coords, currentActiveCellRef.current)) {
                return;
            }

            /* Call on before edit */
            if (editorConfigRef.current && canEdit(coords)) {
                /* Let user modify coords before edit */
                onBeforeEdit?.(coords);

                /*  Focus */
                gridRef.current?.scrollToItem(coords);

                currentActiveCellRef.current = coords;

                /* Get offsets */
                const pos = gridRef.current.getCellOffsetFromCoords(coords);
                const scrollPosition = gridRef.current.getScrollPosition();
                const value = initialValue || currentValueRef.current || '';
                const cellPosition = sticky
                    ? // Editor is rendered outside the <Grid /> component
                      // If the user has scrolled down, and then activate the editor, we will need to adjust the position
                      // of the sticky editor accordingly
                      // Subsequent scroll events has no effect, cos of sticky option
                      getCellPosition(pos, scrollPosition)
                    : pos;
                /**
                 * Set max editor ref based on grid container
                 */
                const { containerWidth, containerHeight } = gridRef.current.getDimensions();
                maxEditorDimensionsRef.current = {
                    height: containerHeight - (cellPosition.y ?? 0),
                    width: containerWidth - (cellPosition.x ?? 0),
                };

                /**
                 * If the user has entered a value in the cell, mark it as dirty
                 * So that during mousedown, onSubmit gets called
                 */
                isDirtyRef.current = !!initialValue;
                initialValueRef.current = initialValue;

                hasInitialValue.current = _hasInitialValue;

                /* Trigger onChange handlers */
                if (initialValue !== undefined) {
                    setValueRef.current(value, undefined, undefined, true);
                    onChange?.(value, coords);
                }

                setAutoFocus(autoFocus);
                setScrollPosition(scrollPosition);
                setPosition(cellPosition);
                showEditor();
            }
        },
        // TODO - remove eslint ignore after testing
        // eslint-disable-next-line
        [
            frozenRows,
            frozenColumns,
            gridRef,
            editorConfigRef,
            canEdit,
            onBeforeEdit,
            currentValueRef,
            sticky,
            getCellPosition,
            setValueRef,
            onChange,
            showEditor,
        ],
    );

    const makeEditableRef = useLatest(makeEditable);

    /* Activate edit mode */
    const handleDoubleClick = useCallback(
        (e: React.MouseEvent<HTMLElement>) => {
            if (!gridRef.current || !activeCellRef.current) return;
            if (!editorConfigRef.current?.showOnDoubleClicked) return;

            let coords = gridRef.current.getCellCoordsFromOffset(
                e.nativeEvent.clientX,
                e.nativeEvent.clientY,
            );
            if (!coords) return;
            const { rowIndex: _rowIndex } = coords;

            if (floatingRowIndex !== undefined && floatingRowHeight !== undefined) {
                resolveFloatingRowPosition({
                    coords,
                    rowIndex: floatingRowIndex ?? _rowIndex,
                    height: floatingRowHeight,
                    clientY: e.clientY,
                    isFiltered: isFloatingRowFiltered,
                    isMoved: isFloatingRowMoved,
                    onResolve: (cell: CellInterface) => {
                        coords = cell;
                    },
                    gridRef,
                });
            }

            makeEditable(coords);
        },
        // TODO - remove eslint ignore after testing
        // eslint-disable-next-line
        [frozenRows, frozenColumns, isFloatingRowMoved, isFloatingRowFiltered, floatingRowHeight, floatingRowIndex],
    );

    const isSelectionKey = useCallback((keyCode: number) => {
        return (
            [
                KeyCodes.Right,
                KeyCodes.Left,
                KeyCodes.Up,
                KeyCodes.Down,
                KeyCodes.Meta,
                KeyCodes.Escape,
                KeyCodes.Tab,
                KeyCodes.Home,
                KeyCodes.End,
                KeyCodes.CapsLock,
                KeyCodes.PageDown,
                KeyCodes.PageUp,
                KeyCodes.ScrollLock,
                KeyCodes.NumLock,
                KeyCodes.Insert,
                KeyCodes.Pause,
            ].includes(keyCode) ||
            // Exclude Function keys
            (keyCode >= KeyCodes.F1 && keyCode <= KeyCodes.F12)
        );
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLElement>) => {
            const keyCode = e.nativeEvent.keyCode;
            if (keyCode === KeyCodes.Tab && !initialActiveCell.current) {
                initialActiveCell.current = activeCell;
            }
            if (isArrowKey(keyCode)) {
                initialActiveCell.current = undefined;
            }

            // TODO - make this configurable
            if (
                isSelectionKey(keyCode) ||
                e.nativeEvent.ctrlKey ||
                e.nativeEvent.which === KeyCodes.SPACE ||
                (e.nativeEvent.shiftKey &&
                    (e.nativeEvent.key === 'Shift' || e.nativeEvent.which === KeyCodes.SPACE)) ||
                e.nativeEvent.metaKey ||
                e.nativeEvent.which === KeyCodes.ALT
            )
                return;

            /* If user has not made any selection yet */
            if (!activeCell) return;

            const { rowIndex, columnIndex } = activeCell;

            if (keyCode === KeyCodes.Delete || keyCode === KeyCodes.BackSpace) {
                // TODO: onbefore  delete
                onDelete && onDelete(activeCell, selections);
                e.preventDefault();
                return;
            }

            const initialValue =
                keyCode === KeyCodes.Enter // Enter key
                    ? undefined
                    : e.nativeEvent.key;

            makeEditable(
                { rowIndex, columnIndex },
                editorConfigRef.current?.concatInitialValue
                    ? initialValue || currentValueRef.current
                    : undefined,
                true,
                !!initialValue,
            );

            /* Prevent the first keystroke */
            e.preventDefault();
        },
        [
            isSelectionKey,
            activeCell,
            makeEditable,
            editorConfigRef,
            currentValueRef,
            onDelete,
            selections,
        ],
    );

    /**
     * Get next focusable cell
     * Respects selection bounds
     */

    const nextFocusableCell = useCallback(
        (
            currentCell: CellInterface,
            direction: Direction = Direction.Right,
        ): CellInterface | null => {
            /* Next immediate cell */
            const bounds = gridRef.current?.getCellBounds(currentCell);

            if (!bounds) return null;

            let nextActiveCell = getNextFocusableCellByDirection({
                rowCount,
                columnCount,
                currentColumnIndex: bounds.left,
                currentRowIndex: bounds.top,
                isHiddenColumn,
                isHiddenRow,
                direction,
                isLastColumn,
                isLastRow,
            });

            if (direction === Direction.Right && !initialActiveCell.current) {
                initialActiveCell.current = currentCell;
            }

            if (direction === Direction.Down) {
                /* Move to the next row + cell */
                initialActiveCell.current = undefined;
            }

            /* If user has selected some cells and active cell is within this selection */
            if (selections.length && currentCell && gridRef.current) {
                const { bounds } = selections[selections.length - 1];
                const activeCellBounds = gridRef.current.getCellBounds(currentCell);
                const nextCell = findNextCellWithinBounds(activeCellBounds, bounds, direction);
                if (nextCell) nextActiveCell = nextCell;
            }
            return nextActiveCell;
        },
        [
            gridRef,
            rowCount,
            columnCount,
            isHiddenColumn,
            isHiddenRow,
            isLastColumn,
            isLastRow,
            selections,
        ],
    );

    const onSubmit = useCallback(
        (value: any, activeCell: CellInterface, _nextActiveCell?: CellInterface | null) => {
            // setValueRef.current(value);

            let nextActiveCell = _nextActiveCell;

            if (
                !nextActiveCell ||
                isHiddenColumn(nextActiveCell.columnIndex) ||
                isHiddenRow(nextActiveCell.rowIndex)
            ) {
                nextActiveCell = null;
            }

            onSubmitValue?.(value, activeCell, nextActiveCell);

            onAfterSubmit?.(value, activeCell, nextActiveCell);
        },
        [isHiddenColumn, isHiddenRow, onAfterSubmit, onSubmitValue],
    );

    /* Save the value */
    const handleSubmit = useCallback(
        (value: any, activeCell: CellInterface, nextActiveCell?: CellInterface | null) => {
            /**
             * Hide the editor first, so that we can handle onBlur events
             * 1. Editor hides -> Submit
             * 2. If user clicks outside the grid, onBlur is called, if there is a activeCell, we do another submit
             */
            hideEditor();

            /* Save the new value */
            onSubmit(value, activeCell, nextActiveCell);

            /* Keep the focus */
            focusGrid();
        },
        [focusGrid, hideEditor, onSubmit],
    );

    /* When the input is blurred out */
    const handleCancel = useCallback(
        (e?: React.KeyboardEvent<HTMLTextAreaElement>) => {
            hideEditor();
            onCancel && onCancel(e);
            /* Keep the focus back in the grid */
            focusGrid();
        },
        [focusGrid, hideEditor, onCancel],
    );

    const handleMouseDown = useCallback(
        (_e: React.MouseEvent<HTMLDivElement>) => {
            /* Persistent input, hides only during Enter key or during submit or cancel calls */
            if (!hideOnBlur) {
                return;
            }
            if (currentActiveCellRef.current) {
                if (isDirtyRef.current) {
                    // handleSubmit(currentValueRef.current, currentActiveCellRef.current);
                } else {
                    handleCancel();
                }
            }
            initialActiveCell.current = undefined;
        },
        [hideOnBlur, handleCancel],
    );

    const handleChange = useCallback(
        (newValue: string, activeCell: CellInterface) => {
            /**
             * Make sure we dont call onChange if initialValue is set
             * This is to accomodate for editor that fire onChange during initialvalue
             * Eg: Slate  <Editor value='' onChange />
             */
            if (initialValueRef.current !== void 0 && initialValueRef.current === newValue) {
                initialValueRef.current = void 0;
                return;
            }
            if (!currentActiveCellRef.current) return;
            /* Check if the value has changed. Used to conditionally submit if editor is not in focus */
            isDirtyRef.current = newValue !== value;
            setValueRef.current(newValue);
            onChange?.(newValue, activeCell);
        },
        [onChange, setValueRef, value],
    );

    const handleScroll = useCallback((scrollPos: ScrollCoords) => {
        if (!currentActiveCellRef.current) return;
        setScrollPosition(scrollPos);
    }, []);

    /* Editor */
    const editingCell = currentActiveCellRef.current;

    const Editor = useMemo(() => {
        if (editingCell) {
            return getEditor(editingCell) || getDefaultEditor(editingCell);
        }

        return null;
    }, [editingCell, getEditor]);

    const handleBlur = useCallback(
        (_e: React.FocusEvent) => {
            if (currentActiveCellRef.current) {
                /* Keep the focus */
                focusGrid();
            }
        },
        [focusGrid],
    );

    const finalCellPosition = useMemo(() => {
        /**
         * Since the editor is sticky,
         * we dont need to adjust the position,
         * as scrollposition wont move the editor
         *
         * When the editor is first active, in makeEditable,
         * we accomodate for the initial scrollPosition
         */
        if (sticky) {
            return position;
        }
        /**
         * If editor is not sticky, keep adjusting
         * its position to accomodate for scroll
         */
        return getCellPosition(position, scrollPosition);
        // TODO - remove eslint ignore after testing
        // eslint-disable-next-line
    }, [sticky, position, scrollPosition, frozenColumns, frozenRows]);

    /* Get offset of frozen rows and columns */
    const frozenRowOffset = gridRef.current?.getRowOffset(frozenRows);
    const frozenColumnOffset = gridRef.current?.getColumnOffset(frozenColumns);

    const isEditorShowRef = useLatest(isEditorShown);

    useEffect(() => {
        if (!activeCell) return;

        if (
            activeCell &&
            currentActiveCellRef.current &&
            (activeCell.columnIndex !== currentActiveCellRef.current.columnIndex ||
                activeCell.rowIndex !== currentActiveCellRef.current.rowIndex) &&
            isEditorShowRef.current
        ) {
            hideEditor();
        }

        if (!editorConfigRef.current?.showOnFocused) return;
        makeEditableRef.current(activeCell);
    }, [activeCell, makeEditableRef, editorConfigRef, hideEditor, isEditorShowRef]);

    const editorComponent =
        isEditorShown && Editor ? (
            <Editor
                {...editorProps?.()}
                /* This is the cell that is currently being edited */
                cell={editingCell}
                activeCell={activeCell}
                autoFocus={autoFocus}
                selections={selections}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                position={finalCellPosition}
                scrollPosition={scrollPosition}
                nextFocusableCell={nextFocusableCell}
                onBlur={handleBlur}
                onKeyDown={onKeyDown}
                maxWidth={maxEditorDimensionsRef.current?.width}
                maxHeight={maxEditorDimensionsRef.current?.height}
                isFrozenRow={isFrozenRow}
                isFrozenColumn={isFrozenColumn}
                frozenRowOffset={frozenRowOffset}
                frozenColumnOffset={frozenColumnOffset}
                hasInitialValue={hasInitialValue.current}
            />
        ) : null;

    return {
        editorComponent,
        onDoubleClick: handleDoubleClick,
        onKeyDown: handleKeyDown,
        nextFocusableCell,
        isEditInProgress: !!editingCell && !editorConfigRef.current?.showOnFocused,
        editingCell,
        makeEditable,
        setValue: handleChange,
        hideEditor,
        showEditor,
        submitEditor: handleSubmit,
        cancelEditor: handleCancel,
        onMouseDown: handleMouseDown,
        onScroll: handleScroll,
    };
};

const textAreaStyle = {
    font: '12px Arial',
    lineHeight: 1.2,
    width: '100%',
    height: '100%',
    padding: '0 1px',
    margin: 0,
    boxSizing: 'border-box',
    borderWidth: 0,
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    verticalAlign: 'top',
    background: 'transparent',
} as CSSProperties;

export default useEditable;
