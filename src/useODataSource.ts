import * as React from 'react';
import { append, isNil, map, flatten, concat, isEmpty, mergeAll, prop, without, toPairs, compose, reject, reduce, mergeDeepLeft, filter, includes } from 'ramda';
import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { ODataServiceDocument } from '../types';
import { buildTypeRoot, ODataMetadata, ProcessedEntityType, ProcessedProperty } from 'odata-metadata-processor';
import { ColumnDef, ColumnSort, FiltersTableState, PaginationState, SortingState, Table, TableState, VisibilityState, ColumnFilter } from '@tanstack/react-table';
import { defaultTableState, replaceDot } from './utils';
import buildQuery, { QueryOptions, Filter } from 'odata-query';
import { idMerge } from 'functional-object-array-merge';

interface useODataSourceOptions {
    baseAddress: string,
    entityType: string,
    metadataUrl?: string,
    includeNavigation?: boolean,
    selectAll?: boolean,
    initialState?: TableState,
    filterMapFn: (filter: ColumnFilter) => Filter[],
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
    onStateChange: any,
    onColumnFiltersChange: any,
    columns: ColumnDef<any>[],
    metadataQuery: UseQueryResult<ODataMetadata>;
    isLoading: boolean,
    isFetching: boolean,
    total: number,
    pageCount: number,
    queryString: string
}

// functions needed
const orderByMap = (s: ColumnSort) => `${replaceDot(s.id)} ${s.desc ? 'desc' : 'asc'}`;

const getAllProps : (props) => ProcessedEntityType[] = (props: ProcessedEntityType) => {
	// get current
	const curr = props.property;
	// map over them
	const recursed = flatten(map(getAllProps, curr));
	return concat(curr, recursed);
};

const buildColumns = (followNav : boolean, columnFn) => (entity: ProcessedEntityType) => {
	const myProps = map(columnFn, getAllProps(entity));
	const navProps : ColumnDef<any>[] = followNav ? flatten(map(buildColumns(followNav, columnFn), entity.navigationProperty)) : [];
	return concat(myProps, navProps);
};

const buildPaging = (state: PaginationState) => {
    const {pageSize, pageIndex} = state;
    return { top: pageSize, skip: pageIndex > 0 ? (pageIndex * pageSize) : undefined };
}

const buildSort = (sorting: SortingState) => ({ orderBy: map(orderByMap, sorting)});
const buildHidden = (visibility: VisibilityState) => compose(map(prop(0)), reject(prop(1)), toPairs)(visibility)
const buildSelect = (hidden: string[], typeRoot: ProcessedEntityType) => ({ select: without(hidden, map(prop('name'), getAllProps(typeRoot))) });

const buildExpand = (hidden: string[]) => (entity: ProcessedEntityType) => {
    // recursively call the next level
    const navExpand: any[] = map(buildExpand(hidden), entity.navigationProperty);
    // flatten the nav
    const flatNav = reduce<any, any>(mergeDeepLeft, {}, navExpand);
    // see what is hidden for this entity
    const allProps = getAllProps(entity);
    const hiddenCheck = without(map(prop('pathName'), allProps), hidden);
    const select = map(prop('name'), filter((p: ProcessedProperty) => !includes(p.pathName, hidden), allProps));
    // now some logic
    // everything is hidden don't expand
    const noExpand = hiddenCheck.length === allProps.length;
    // subset is selected
    const subset = select.length !== allProps.length;
    const selectObject = noExpand ? undefined : subset && !isEmpty(select) ? { select } : {};

    const merged = mergeAll([flatNav, selectObject]);
	const shouldOutput = !isNil(selectObject) || !isEmpty(flatNav);

	return {
		...(shouldOutput && { expand: { [entity.name]: merged } }),
	};
}

const useODataSource : (options: useODataSourceOptions) => ODataSource = ({
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
    initialState = defaultTableState,
    columnFn,
    filterMapFn,
    customColumns = [],
    useMetadataQuery
}: useODataSourceOptions) => {
    console.log('rendering odata source')
    const [tableState, setTableState] = React.useState<TableState>(initialState);
    const [columnFilters, setColumnFilters] = React.useState([]);
    const [total, setTotal] = React.useState(0);
	const [pageCount, setPageCount] = React.useState(-1);
    const [columns, setColumns] = React.useState<ColumnDef<any>[]>([]);
    const [validMetadataUrl, setValidMetadataUrl] = React.useState(metadataUrl);
    const [typeRoot, setTypeRoot] = React.useState<ProcessedEntityType>();
    //const [queryString, setQueryString] = React.useState('');

    const { pagination: { pageSize} } = tableState

    const boundQueryKey = concat(queryKey, [baseAddress, entityType]);
    // we have the type root and table state, time to query
    const readyToQuery = !isNil(typeRoot) && !isEmpty(tableState);
    console.log(metadataUrl)
    //will only query if metadata url is set
    const metadataQuery = useMetadataQuery(validMetadataUrl);

    //will only query when metadata url is not set and then will set metadata url
	const discoveryKey = append('?$top=0', boundQueryKey);
    const discovery = useQuery<ODataServiceDocument<any>, unknown>(
		discoveryKey,
		() => fetchFn(`${baseAddress}?$top=0`),
		{
            //...queryOptions,
			enabled: isNil(metadataUrl),
			onSuccess: (data) => {
				if (validMetadataUrl !== data['@odata.context']) {
					setValidMetadataUrl(data['@odata.context']);
				}
			},
		},
	);

    // check if we can set the type root
    React.useEffect(() => {
        if (!isNil(metadataQuery.data)) {
            const root = buildTypeRoot(metadataQuery.data!)(entityType);
			setTypeRoot(root);
            const builtColumns = buildColumns(includeNavigation, columnFn)(root);
            const combined = idMerge(concat(builtColumns, customColumns));
            // typescript doesn't like the fact that the parital objects
            // @ts-ignore
            setColumns(combined);
            setTableState(st => ({ ...st, columnOrder: map(prop('id'), builtColumns )}));
        }
    }, [isNil(metadataQuery.data)])

    // calculate filters up front
    const filters = { filter: map(filterMapFn, columnFilters) };

    // updated page count when the page size changes
	React.useEffect(() => {
		setPageCount(Math.ceil(total / pageSize));
	}, [pageSize]);

    // count query - we run this separate from the main query
    const countKey = append(filters, boundQueryKey);
    const countQuery = useQuery<ODataServiceDocument<any>, unknown>(countKey, 
        () => fetchFn<ODataServiceDocument<any>>(`${baseAddress}${buildQuery(mergeAll([filters, { count: true, top: 0 }]))}`), {
			...queryOptions,
			enabled: readyToQuery,
		});

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
    const select = React.useMemo(() => readyToQuery 
    ? selectAll ? { } 
    // ready to query and we are not selecting everyting
        : buildSelect(buildHidden(tableState.columnVisibility), typeRoot!)
    : {}, 
    [selectAll, tableState.columnVisibility, readyToQuery])

        

    // memo the expand
    const expand = React.useMemo(() => {
        // early exit, no navigations
        if (!includeNavigation) return { expand: {}};
        return readyToQuery 
            ? reduce(mergeDeepLeft, {}, map(buildExpand(buildHidden(tableState.columnVisibility)), typeRoot?.navigationProperty))
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

    const isLoading = metadataQuery.isLoading || discovery.isLoading || query.isLoading;
    const isFetching = metadataQuery.isFetching || discovery.isFetching || query.isLoading;

    const onStateChange = React.useCallback(s => setTableState(s), []);
    const onColumnFiltersChange = React.useCallback(s => setColumnFilters(s), []);

    return {
        data: isNil(query.data) ? [] : query.data!.value,
        state: {...tableState, columnFilters },
        setState: setTableState,
        onStateChange,
        onColumnFiltersChange,
        columns,
        metadataQuery,
        isLoading,
        isFetching,
        pageCount,
        total,
        queryString
    }
}

export default useODataSource;