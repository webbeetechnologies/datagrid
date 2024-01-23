enum RowType {
    HEADER = 'header',
    FOOTER = 'footer',
    DATA = 'data',
}

export type AggregateRow = {
    children: AggregateRow[] | GroupRecord[];
    count: number;
    slug: string;
    value: any[];
    hideHeader?: boolean;
    hasData?: boolean;
};

export type TDataTableColumn = string;
export type TDataTableRow = string | number;

export type GroupConstantValues = {
    field: TDataTableColumn;
    value: any;
};

export type GroupMetaStates = {
    isFirstLevel: boolean;
    isLastLevel: boolean;
    isFirst: boolean;
    isLast: boolean;
    isOnly: boolean;
    isRealGroup: boolean;
    rowType: `${RowType}`;
};

export type GroupMeta = GroupMetaStates & {
    groupId: string;
    fieldId?: TDataTableColumn | null;
    count: number;
    level: number;
    groupConstants: GroupConstantValues[];
    isRealGroup?: boolean;
    isCollapsed: boolean;
};

interface GroupBase {
    level: number;
    groupId: string;
    id: TDataTableColumn;
    index: number;
    groupConstants: GroupConstantValues[];
    realIndex: number;
    groupIndex: number;
    nextGroupIndex: number;
    isHidden?: boolean;
    lastRecordIndex: number;
}

export type NormalizedAggregateRecordBase = GroupBase &
    GroupMeta & {
        title: any;
        count: number;
        value: unknown;
        field: TDataTableColumn;
    };

export type GroupHeader = NormalizedAggregateRecordBase & {
    rowType: 'header';
};

export type GroupFooter = Omit<NormalizedAggregateRecordBase, 'recordIds'> & {
    rowType: 'footer';
};

export type GroupRecord = Omit<GroupBase, 'id' | 'nextGroupIndex' | 'lastRecordIndex'> & {
    rowType: 'data';
    indexInGroup: number;
    id: TDataTableRow;
    isPlaceholder?: boolean;
    newRecordIndex: number;
};

export type GroupMetaRow = GroupFooter | GroupHeader;
export type GroupedDataTruthy = GroupMetaRow | GroupRecord;
export type GroupedData = GroupedDataTruthy | undefined;
