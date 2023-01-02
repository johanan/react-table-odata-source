import * as React from 'react';
import { append, isNil, map, concat, isEmpty, mergeAll, prop, reduce, mergeDeepLeft } from 'ramda';
import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { ODataServiceDocument } from '../types';
import { buildTypeRoot, ODataMetadata, ProcessedEntityType, ProcessedProperty } from 'odata-metadata-processor';
import { ColumnDef, TableState, ColumnFilter } from '@tanstack/react-table';
import buildQuery, { Filter } from 'odata-query';
import { idMerge } from 'functional-object-array-merge';
import { buildColumns, buildExpand, buildHidden, buildPaging, buildSelect, buildSort, defaultTableState, getAllProps } from './oDataFunctions';

export interface UseODataSourceOptions {
    baseAddress: string,
    entityType: string,
    metadataUrl?: string,
    includeNavigation?: boolean,
    selectAll?: boolean,
    initialState?: Partial<TableState>,
    filterMapFn: (filter: ColumnFilter) => Filter | undefined,
    fetchFn?: <T>(url: string) => Promise<T>,
    queryOptions?: Omit<UseQueryOptions<any, unknown, any, any>, 'queryKey' | 'queryFn' | 'initialData'> & {
        initialData?: () => undefined;
    },
    queryKey?: string[],
    columnFn: (property: ProcessedProperty) => ColumnDef<any>,
    customColumns?: Partial<ColumnDef<any>>[],
    useMetadataQuery: (url?: string) => UseQueryResult<ODataMetadata, unknown>
}

interface ODataSource {
    data: any[],
    state: Partial<TableState>,
    setState: any,
    setFilters: any,
    onStateChange: any,
    onColumnFiltersChange: any,
    columns: ColumnDef<any>[],
    metadataQuery: UseQueryResult<ODataMetadata>;
    isLoading: boolean,
    isFetching: boolean,
    total: number,
    pageCount: number,
    queryString: string
    boundQueryKey: string[],
    typeRoot?: ProcessedEntityType
}

const useODataSource : (options: UseODataSourceOptions) => ODataSource = ({
    baseAddress, 
    entityType, 
    metadataUrl, 
    includeNavigation = true,
    selectAll = false,
    fetchFn = (url: string) => fetch(url).then(r => r.json()), 
    queryKey = ['ODATA'],
    queryOptions = {
		keepPreviousData: true,
		staleTime: 300000,
		suspense: true,
	},
    initialState = {},
    columnFn,
    filterMapFn,
    customColumns = [],
    useMetadataQuery
}: UseODataSourceOptions) => {
    const [tableState, setTableState] = React.useState<TableState>({...defaultTableState, ...initialState});
    const [columnFilters, setColumnFilters] = React.useState([]);
    const [total, setTotal] = React.useState(0);
	const [pageCount, setPageCount] = React.useState(-1);
    const [columns, setColumns] = React.useState<ColumnDef<any>[]>([]);
    const [validMetadataUrl, setValidMetadataUrl] = React.useState(metadataUrl);
    const [typeRoot, setTypeRoot] = React.useState<ProcessedEntityType>();

    const { pagination: { pageSize} } = tableState

    const boundQueryKey = concat(queryKey, [baseAddress, entityType]);
    // we have the type root and table state, time to query
    const readyToQuery = !isNil(typeRoot) && !isEmpty(tableState);
    //will only query if metadata url is set
    const metadataQuery = useMetadataQuery(validMetadataUrl);
    // calculate filters up front
    const filters = { filter: map(filterMapFn, columnFilters) };

    // effects
    // updated page count when the page size changes
	React.useEffect(() => {
		setPageCount(Math.ceil(total / pageSize));
	}, [pageSize]);

    // check if we can set the type root
    React.useEffect(() => {
        if (!isNil(metadataQuery.data)) {
            const root = buildTypeRoot(metadataQuery.data!)(entityType);
			setTypeRoot(root);
            const builtColumns = buildColumns(includeNavigation, columnFn)(root);
            const combined = idMerge(concat(builtColumns, customColumns));
            // typescript doesn't like the fact that these are partial objects
            // @ts-ignore
            setColumns(combined);
            // idMerge changes the default order of columns
            setTableState(st => ({ ...st, columnOrder: map<ColumnDef<any>, any>(prop('id'), builtColumns )}));
        }
    }, [isNil(metadataQuery.data)]);

    //will only query when metadata url is not set and then will set metadata url
	const discoveryKey = append('?$top=0', boundQueryKey);
    const discovery = useQuery<ODataServiceDocument<any>, unknown>(
		discoveryKey,
		() => fetchFn(`${baseAddress}?$top=0`),
		{
            //...queryOptions,
			enabled: isNil(validMetadataUrl),
			onSuccess: (data) => {
				if (validMetadataUrl !== data['@odata.context']) {
					setValidMetadataUrl(data['@odata.context']);
				}
			},
		},
	);

    // count query - we run this separate from the main query, changes with filter change
    const countKey = append(JSON.stringify(filters), boundQueryKey);
    const countQuery = useQuery<ODataServiceDocument<any>, unknown>(countKey, 
        () => fetchFn<ODataServiceDocument<any>>(`${baseAddress}${buildQuery(mergeAll([filters, { count: true, top: 0 }]))}`), {
			...queryOptions,
			enabled: readyToQuery,
		});
    // update total with count update
    React.useEffect(() => {
        if (!isNil(countQuery.data?.['@odata.count'])) {
            const t = Number(countQuery.data?.['@odata.count']);
            if (t !== total) {
                setTotal(t);
                setPageCount(Math.ceil(t / pageSize));
            }
        }
    }, [countQuery.data?.['@odata.count']]);

    // memo the select
    const select = React.useMemo(() => {
        if (selectAll) return {};
        if (!readyToQuery) return {};
        // determine if we are selecting all
        const allProps = getAllProps(typeRoot);
        const selected = buildSelect(buildHidden(tableState.columnVisibility), allProps); 
        return selected.length !== allProps.length ? { select: selected } : {};
    }, 
    [selectAll, tableState.columnVisibility, readyToQuery])

        

    // memo the expand
    const expand = React.useMemo(() => {
        // early exit, no navigations
        if (!includeNavigation) return { expand: {}};
        return readyToQuery 
            ? reduce<any, any>(mergeDeepLeft, {}, map(buildExpand(buildHidden(tableState.columnVisibility)), typeRoot?.navigationProperty))
            : {};
    }, [includeNavigation, tableState.columnVisibility, readyToQuery]);

    const merged = mergeAll([filters, expand, select, buildSort(tableState.sorting), buildPaging(tableState.pagination)]);
    const queryString = buildQuery(merged);

    // THE query that gets the data
	const odataKey = append(queryString, boundQueryKey);
	const query = useQuery<ODataServiceDocument<any>, unknown, ODataServiceDocument<any>, any[]>(
		odataKey,
		() => fetchFn(`${baseAddress}${queryString}`),
		{
			...queryOptions,
			enabled: readyToQuery,
		},
	);

    const isLoading = metadataQuery.isLoading || discovery.isLoading || countQuery.isLoading || query.isLoading;
    const isFetching = metadataQuery.isFetching || discovery.isFetching || countQuery.isFetching || query.isFetching;

    const onStateChange = setTableState;
    const onColumnFiltersChange = setColumnFilters;

    return {
        data: isNil(query.data) ? [] : query.data!.value,
        state: {...tableState, columnFilters },
        setState: setTableState,
        setFilters: setColumnFilters,
        onStateChange,
        onColumnFiltersChange,
        columns,
        metadataQuery,
        isLoading,
        isFetching,
        pageCount,
        total,
        queryString,
        boundQueryKey,
        typeRoot
    }
}

export default useODataSource;