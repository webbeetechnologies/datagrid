import React, { memo } from 'react';
import type { SelectionProps } from './types';
import { createHTMLBox } from './utils';

const Selection: React.FC<SelectionProps> = memo(props => {
    return createHTMLBox({ strokeWidth: 1, ...props });
});

export default Selection;
