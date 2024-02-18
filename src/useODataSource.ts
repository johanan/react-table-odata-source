import React from 'react';
import { append, map, concat, mergeAll, prop, reduce, mergeDeepLeft } from 'ramda';
import { useSuspenseQuery, UseSuspenseQueryOptions } from '@tanstack/react-query';
import { ODataServiceDocument } from './index.d';
import { buildTypeRoot, ODataMetadata, ProcessedEntityType, ProcessedProperty } from 'odata-metadata-processor';
import { ColumnDef, TableState, ColumnFilter } from '@tanstack/react-table';
import buildQuery, { Filter } from 'odata-query';
import { idMerge } from 'functional-object-array-merge';
import { buildColumns, buildExpand, buildHidden, buildPaging, buildSelect, buildSort, defaultTableState, getAllProps } from './oDataFunctions';
import { requiredUrl } from './utils';

export interface UseODataSourceOptions {
    baseAddress: string,
    entityType: string,
    includeNavigation: boolean,
    metadata: ODataMetadata,
    selectAll: boolean,
    initialState: Partial<TableState>,
    filterMapFn: (filter: ColumnFilter) => Filter | undefined,
    fetchFn: <T>(url: string) => Promise<T>,
    queryOptions: Omit<UseSuspenseQueryOptions<any, unknown, any, any>, 'queryKey' | 'queryFn' >,
    queryKey: string[],
    columnFn: (property: ProcessedProperty) => ColumnDef<any>,
    customColumns: Partial<ColumnDef<any>>[],
}

export interface ODataSourceMeta {
    baseAddress: string;
    total: number,
    queryString: string
    boundQueryKey: string[],
    typeRoot: ProcessedEntityType,
    defaultOrder: string[]
}

export interface ODataSource {
    data: any[],
    state: Partial<TableState>,
    setState: React.Dispatch<React.SetStateAction<TableState>>,
    onStateChange: React.Dispatch<React.SetStateAction<TableState>>,
    columns: ColumnDef<any, unknown>[],
    pageCount: number,
    meta: ODataSourceMeta
}

export interface ProcessedMetadata {
    root: ProcessedEntityType,
    columns: ColumnDef<any>[],
    defaultOrder: string[]
}

const useODataSource : (options: UseODataSourceOptions) => ODataSource = ({
    baseAddress, 
    entityType,
    metadata,
    includeNavigation,
    selectAll,
    fetchFn, 
    queryKey,
    queryOptions,
    initialState,
    columnFn,
    filterMapFn,
    customColumns,
}: UseODataSourceOptions) => {
    const [tableState, setTableState] = React.useState<TableState>({...defaultTableState, ...initialState});

    const { pagination: { pageSize} } = tableState
    const boundQueryKey = concat(queryKey, [baseAddress, entityType]);
    // calculate filters up front
    const filters = { filter: map(filterMapFn, tableState.columnFilters) };

    const processed = useSuspenseQuery<ProcessedMetadata, unknown>({
        queryKey: append('TYPEROOT', boundQueryKey),
        queryFn: () => new Promise((resolve) => {
            const root = buildTypeRoot(metadata)(entityType);
            const builtColumns = buildColumns(includeNavigation, columnFn)(root);
            const columns = idMerge(concat(builtColumns, customColumns));
            const defaultOrder = map<ColumnDef<any>, any>(prop('id'), builtColumns );
            // ts hates the merge for columns
            //@ts-ignore
            return resolve({ root, columns, defaultOrder });
        }),
    })

    // count query - we run this separate from the main query, changes with filter change
    const countKey = append(JSON.stringify(filters), boundQueryKey);
    const countQuery = useSuspenseQuery<ODataServiceDocument<any>, unknown>({ queryKey: countKey, 
        queryFn: () => requiredUrl(baseAddress)
            .then(u => `${u}${buildQuery(mergeAll([filters, { count: true, top: 0 }]))}`)
            .then(fetchFn<ODataServiceDocument<any>>),
			...queryOptions,
		});

    const total = countQuery.data['@odata.count'];
    const pageCount = Math.ceil(total / pageSize);

    // memo the select
    const select = React.useMemo(() => {
        if (selectAll) return {};
        // determine if we are selecting all
        const allProps = getAllProps(processed.data.root);
        const selected = buildSelect(buildHidden(tableState.columnVisibility), allProps); 
        return selected.length !== allProps.length ? { select: selected } : {};
    }, 
    [selectAll, tableState.columnVisibility, processed.data])
        

    // memo the expand
    const expand = React.useMemo(() => {
        if (!includeNavigation) return { expand: {}};
        return reduce<any, any>(mergeDeepLeft, {}, map(buildExpand(buildHidden(tableState.columnVisibility)), processed.data.root.navigationProperty))
    }, [includeNavigation, tableState.columnVisibility, processed.data]);

    const merged = mergeAll([filters, expand, select, buildSort(tableState.sorting), buildPaging(tableState.pagination)]);
    const queryString = buildQuery(merged);

    // THE query that gets the data
	const odataKey = append(queryString, boundQueryKey);
	const query = useSuspenseQuery<ODataServiceDocument<any>, unknown, ODataServiceDocument<any>, any[]>({
		queryKey: odataKey,
        queryFn: () => requiredUrl(baseAddress)
            .then(u => `${u}${queryString}`) 
            .then(fetchFn<ODataServiceDocument<any>>),
        ...queryOptions,
    });

    const onStateChange = setTableState;

    return {
        data: query.data.value,
        state: tableState,
        setState: setTableState,
        onStateChange,
        columns: processed.data.columns,
        pageCount,
        meta: {
            baseAddress,
			total,
			queryString,
			boundQueryKey,
			typeRoot: processed.data.root,
            defaultOrder: processed.data.defaultOrder,
		},
    }
}

export default useODataSource;