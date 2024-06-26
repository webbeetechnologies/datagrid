import React, { createContext, PureComponent, useContext } from 'react';

import isInteger from './isInteger';
import isRangeVisible from './isRangeVisible';
import scanForUnloadedRanges from './scanForUnloadedRanges';
import type { Ranges } from './types';
import type { GridRef } from '../Grid';

type onItemsRenderedParams = {
    visibleStartIndex: number;
    visibleStopIndex: number;
};
type onItemsRendered = (params: onItemsRenderedParams) => void;
type setRef = (ref: any) => void;

export type InfiniteLoaderChildrenArg = { onItemsRendered: onItemsRendered; ref: setRef };

export type InfiniteLoaderProps = {
    // Render prop.
    children: React.ReactNode;
    // Function responsible for tracking the loaded state of each item.
    isItemLoaded: (index: number) => boolean;
    // Number of rows in list; can be arbitrary high number if actual number is unknown.
    itemCount: number;
    // Callback to be invoked when more rows must be loaded.
    // It should return a Promise that is resolved once all data has finished loading.
    loadMoreItems: (startIndex: number, stopIndex: number) => Promise<void>;
    // Minimum number of rows to be loaded at a time; defaults to 10.
    // This property can be used to batch requests to reduce HTTP requests.
    minimumBatchSize?: number;
    // Threshold at which to pre-fetch data; defaults to 15.
    // A threshold of 15 means that data will start loading when a user scrolls within 15 rows.
    threshold?: number;
};
export class InfiniteLoader extends PureComponent<InfiniteLoaderProps> {
    _lastRenderedStartIndex: number = -1;
    _lastRenderedStopIndex: number = -1;
    _listRef: GridRef | undefined;
    _memoizedUnloadedRanges: Ranges = [];

    resetloadMoreItemsCache(autoReload: boolean = false) {
        this._memoizedUnloadedRanges = [];

        if (autoReload) {
            this._ensureRowsLoaded(this._lastRenderedStartIndex, this._lastRenderedStopIndex);
        }
    }

    _onItemsRendered: onItemsRendered = ({
        visibleStartIndex,
        visibleStopIndex,
    }: onItemsRenderedParams) => {
        if (process.env.NODE_ENV !== 'production') {
            if (!isInteger(visibleStartIndex) || !isInteger(visibleStopIndex)) {
                console.warn(
                    'Invalid onItemsRendered signature; please refer to InfiniteLoader documentation.',
                );
            }
        }

        this._lastRenderedStartIndex = visibleStartIndex;
        this._lastRenderedStopIndex = visibleStopIndex;

        this._ensureRowsLoaded(visibleStartIndex, visibleStopIndex);
    };
    _setRef: setRef = (listRef: any) => {
        this._listRef = listRef;
    };

    _ensureRowsLoaded(startIndex: number, stopIndex: number) {
        const { isItemLoaded, itemCount, minimumBatchSize = 10, threshold = 15 } = this.props;
        const unloadedRanges = scanForUnloadedRanges({
            isItemLoaded,
            itemCount,
            minimumBatchSize,
            startIndex: Math.max(0, startIndex - threshold),
            stopIndex: Math.min(itemCount - 1, stopIndex + threshold),
        });

        // Avoid calling load-rows unless range has changed.
        // This shouldn't be strictly necessary, but is maybe nice to do.
        if (
            this._memoizedUnloadedRanges.length !== unloadedRanges.length ||
            this._memoizedUnloadedRanges.some(
                (startOrStop, index) => unloadedRanges[index] !== startOrStop,
            )
        ) {
            this._memoizedUnloadedRanges = unloadedRanges;

            this._loadUnloadedRanges(unloadedRanges);
        }
    }

    _loadUnloadedRanges(unloadedRanges: Ranges) {
        // loadMoreRows was renamed to loadMoreItems in v1.0.3; will be removed in v2.0
        const loadMoreItems = this.props.loadMoreItems;

        for (let i = 0; i < unloadedRanges.length; i += 2) {
            const startIndex = unloadedRanges[i];
            const stopIndex = unloadedRanges[i + 1];
            const promise = loadMoreItems(startIndex, stopIndex);

            if (promise != null) {
                promise.then(() => {
                    // Refresh the visible rows if any of them have just been loaded.
                    // Otherwise they will remain in their unloaded visual state.
                    if (
                        isRangeVisible({
                            lastRenderedStartIndex: this._lastRenderedStartIndex,
                            lastRenderedStopIndex: this._lastRenderedStopIndex,
                            startIndex,
                            stopIndex,
                        })
                    ) {
                        // Handle an unmount while promises are still in flight.
                        if (this._listRef == null) {
                            return;
                        }

                        // Resize cached row sizes for VariableSizeList,
                        // otherwise just re-render the list.
                        if (typeof this._listRef.resetAfterIndices === 'function') {
                            this._listRef?.resetAfterIndices({ rowIndex: startIndex }, true);
                        } else {
                            // HACK reset temporarily cached item styles to force PureComponent to re-render.
                            // This is pretty gross, but I'm okay with it for now.
                            // Don't judge me.
                            // if (typeof this._listRef._getItemStyleCache === 'function') {
                            //     this._listRef?._getItemStyleCache(-1);
                            // }
                            //
                            // // TODO - check if this is needed
                            // this._listRef?.forceUpdate();
                        }
                    }
                });
            }
        }
    }

    contextValue = {
        onItemsRendered: this._onItemsRendered,
        ref: this._setRef,
    };

    componentDidMount() {
        if (process.env.NODE_ENV !== 'production') {
            if (this._listRef == null) {
                console.warn('Invalid list ref; please refer to InfiniteLoader documentation.');
            }
        }
    }

    render() {
        const { children } = this.props;
        return (
            <InfiniteLoaderArgsContext.Provider value={this.contextValue}>
                {children}
            </InfiniteLoaderArgsContext.Provider>
        );
    }
}

export const InfiniteLoaderArgsContext = createContext<InfiniteLoaderChildrenArg | null>(null);

export const useInfiniteLoaderArgsContext = () => {
    const contextValue = useContext(InfiniteLoaderArgsContext);

    if (!contextValue) {
        throw new Error('useInfiniteLoaderArgsContext must be used inside the InfiniteLoader');
    }

    return contextValue;
};
