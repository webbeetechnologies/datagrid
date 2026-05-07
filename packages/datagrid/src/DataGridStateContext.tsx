import { createFastContext } from '@react-native-molecules/utils/fast-context';
import type { ComponentType, ReactNode } from 'react';
import type { HoveredCell } from './components';

type DataGridState = { hoveredCell: HoveredCell | null };
type DataGridStateProviderProps = { value: DataGridState; children: ReactNode };

const dataGridStateContext = createFastContext<DataGridState>(
    {
        hoveredCell: null,
    },
    true,
);

export const useDataGridState = dataGridStateContext.useContextValue;
export const useDataGridStateStoreRef = dataGridStateContext.useStoreRef;
export const DataGridStateProvider: ComponentType<DataGridStateProviderProps> =
    dataGridStateContext.Provider;
