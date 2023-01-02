import { isNil, map, flatten, concat, isEmpty, mergeAll, prop, without, toPairs, compose, reject, reduce, mergeDeepLeft, filter, includes, difference } from 'ramda';
import { ProcessedEntityType, ProcessedProperty } from 'odata-metadata-processor';
import { ColumnDef, ColumnSort, PaginationState, SortingState, TableState, VisibilityState } from '@tanstack/react-table';
import { replaceDot } from './utils';

export const getAllProps : (props) => ProcessedEntityType[] = (props: ProcessedEntityType) => {
	// get current
	const curr = props.property;
	// map over them
	const recursed = flatten(map(getAllProps, curr));
	return concat(curr, recursed);
};

export const buildColumns = (followNav : boolean, columnFn: (ProcessedEntityType) => ColumnDef<any>) => (entity: ProcessedEntityType) => {
	const myProps = map(columnFn, getAllProps(entity));
	const navProps : ColumnDef<any>[] = followNav ? flatten(map(buildColumns(followNav, columnFn), entity.navigationProperty)) : [];
	return concat(myProps, navProps);
};

const filterFunc = (hidden: string []) => (p: ProcessedProperty) => includes(p.pathName, hidden);

export const buildExpand = (hidden: string[]) => (entity: ProcessedEntityType) => {
    // recursively call the next level
    const navExpand: any[] = map(buildExpand(hidden), entity.navigationProperty);
    // flatten the nav
    const flatNav = reduce<any, any>(mergeDeepLeft, {}, navExpand);
    // see what is hidden for this entity
    const allProps = getAllProps(entity);
    // @ts-ignore
    const hiddenCheck = filter(filterFunc(hidden), allProps);
    // @ts-ignore
    const select = map(prop('name'), reject(filterFunc(hidden), allProps));
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

export const buildPaging = (state: PaginationState) => {
    const {pageSize, pageIndex} = state;
    return { top: pageSize, skip: pageIndex > 0 ? (pageIndex * pageSize) : undefined };
}

export const buildSort = (sorting: SortingState) => ({ orderBy: map(orderByMap, sorting)});
// compose causes really painful type problems
// @ts-ignore
export const buildHidden :(visibility: VisibilityState) => string[] = (visibility: VisibilityState) => compose(map(prop(0)), reject(prop(1)), toPairs)(visibility)
export const buildSelect = (hidden: string[], allProps: ProcessedEntityType[]) => without(hidden, map(prop('name'), allProps));

export const orderByMap = (s: ColumnSort) => `${replaceDot(s.id)} ${s.desc ? 'desc' : 'asc'}`;

export const defaultTableState : TableState = {
	rowSelection: {},
	expanded: {},
	grouping: [],
	sorting: [],
	pagination : { pageIndex: 0, pageSize: 10 },
	columnFilters: [],
	globalFilter: {},
	columnOrder: [],
	columnPinning: {},
	columnSizing: {},
	columnVisibility: {},
	columnSizingInfo: {
		startOffset: null,
		startSize: null,
		deltaOffset: null,
		deltaPercentage: null,
		isResizingColumn: false,
		columnSizingStart: []
	}
};