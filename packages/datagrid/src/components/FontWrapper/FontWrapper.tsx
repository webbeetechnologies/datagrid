import React, { memo, Fragment } from 'react';
import { DataModule } from './types';

export default memo(
    ({ children }: { children: React.ReactNode; sources: Record<string, DataModule[]> }) => (
        <Fragment children={children} />
    ),
);
