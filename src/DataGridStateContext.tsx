import { createFastContext } from '@bambooapp/bamboo-molecules/fast-context';
import type { HoveredCell } from './components';

export const {
    useContextValue: useDataGridState,
    useStoreRef: useDataGridStateStoreRef,
    Provider: DataGridStateProvider,
} = createFastContext<{ hoveredCell: HoveredCell | null }>(
    {
        hoveredCell: null,
    },
    true,
);
