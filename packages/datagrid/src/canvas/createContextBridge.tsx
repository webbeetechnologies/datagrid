import React, { ComponentType, Context as ContextType, PropsWithChildren, ReactNode } from 'react';
import { Fragment, memo, useContext, useId, useMemo, useRef, useState } from 'react';

type ContextRegistry = Record<string, ContextType<any>[]>;

const contextRegistry: ContextRegistry = {};

// In development, React will warn about using contexts between renderers.
// Hide the warning because its-fine fixes this issue
// https://github.com/facebook/react/pull/12779
function wrapContext<T>(context: React.Context<T>): React.Context<T> {
    try {
        return Object.defineProperties(context, {
            _currentRenderer: {
                get() {
                    return null;
                },
                set() {},
            },
            _currentRenderer2: {
                get() {
                    return null;
                },
                set() {},
            },
        });
    } catch (_) {
        return context;
    }
}

export const createContextBridge = <T extends object>(
    bridgeName: string,
    Wrapper: ComponentType<T>,
    contexts: ContextType<any>[] = [],
) => {
    contextRegistry[bridgeName] ??= [];

    return {
        registerContextToBridge: (updatedContexts: ContextType<any> | ContextType<any>[]) => {
            contextRegistry[bridgeName] = [
                ...contextRegistry[bridgeName],
                ...([] as ContextType<any>[])
                    .concat(updatedContexts)
                    .map(context => wrapContext(context)),
            ];
        },
        BridgedComponent: memo((props: PropsWithChildren<T> & { name?: string }) => {
            const { name, ...rest } = props;
            const contextValuesRef = useRef<any[]>([]);

            const id = useId();

            const [allContexts] = useState(() =>
                Array.from(new Set([...contexts, ...contextRegistry[bridgeName]])),
            );

            for (const i in allContexts) {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                contextValuesRef.current[i] = useContext(allContexts[i]);
            }

            const content = useMemo(() => {
                return allContexts.reduce<ReactNode>((acc, Context, currentIndex) => {
                    return (
                        <Context.Provider value={contextValuesRef.current[currentIndex]}>
                            {acc}
                        </Context.Provider>
                    );
                }, <>{props.children}</>);
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [...contextValuesRef.current, allContexts, props.children]);

            const _key = name ? name + id : id;
            return (
                <Wrapper name={name} {...(rest as T)}>
                    <Fragment key={_key}>{content}</Fragment>
                </Wrapper>
            );
        }),
    };
};
