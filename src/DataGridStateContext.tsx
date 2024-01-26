import { createFastContext } from '@bambooapp/bamboo-molecules/fast-context';
import type { CellInterface } from './components';

export const {
    useContextValue: useDataGridState,
    useStoreRef: useDataGridStateStoreRef,
    Provider: DataGridStateProvider,
} = createFastContext<{ hoveredCell: CellInterface | null }>(
    {
        hoveredCell: null,
    },
    true,
);
