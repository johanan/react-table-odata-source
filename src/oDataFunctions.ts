import { isNil, map, flatten, concat, isEmpty, mergeAll, prop, without, toPairs, compose, reject, reduce, mergeDeepLeft, filter, includes } from 'ramda';
import { ProcessedEntityType, ProcessedProperty } from 'odata-metadata-processor';
import { ColumnDef, ColumnSort, PaginationState, SortingState, VisibilityState } from '@tanstack/react-table';
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

export const buildExpand = (hidden: string[]) => (entity: ProcessedEntityType) => {
    // recursively call the next level
    const navExpand: any[] = map(buildExpand(hidden), entity.navigationProperty);
    // flatten the nav
    const flatNav = reduce<any, any>(mergeDeepLeft, {}, navExpand);
    // see what is hidden for this entity
    const allProps = getAllProps(entity);
    const hiddenCheck = without(map(prop('pathName'), allProps), hidden);
    // @ts-ignore
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

export const buildPaging = (state: PaginationState) => {
    const {pageSize, pageIndex} = state;
    return { top: pageSize, skip: pageIndex > 0 ? (pageIndex * pageSize) : undefined };
}

export const buildSort = (sorting: SortingState) => ({ orderBy: map(orderByMap, sorting)});
// compose causes really painful type problems
// @ts-ignore
export const buildHidden :(visibility: VisibilityState) => string[] = (visibility: VisibilityState) => compose(map(prop(0)), reject(prop(1)), toPairs)(visibility)
export const buildSelect = (hidden: string[], typeRoot: ProcessedEntityType) => ({ select: without(hidden, map(prop('name'), getAllProps(typeRoot))) });

const orderByMap = (s: ColumnSort) => `${replaceDot(s.id)} ${s.desc ? 'desc' : 'asc'}`;