import { memo, ReactNode, Fragment } from 'react';
import { DataModule } from './types';

export default memo(
    ({ children }: { children: ReactNode; sources: Record<string, DataModule[]> }) => (
        <Fragment children={children} />
    ),
);
