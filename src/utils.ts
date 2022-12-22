import { ColumnDef, TableOptions, TableState, ColumnFilter, getCoreRowModel } from "@tanstack/react-table";
import { ProcessedProperty } from "odata-metadata-processor";
import { init, join, path, isNil } from 'ramda';

export const defaultTableProps : Partial<TableOptions<any>> = {
	getCoreRowModel: getCoreRowModel(),
	autoResetAll: false,
	manualSorting: true,
	manualPagination: true,
	manualFiltering: true
}

export const emptyArray = <T,>(arr?: T[]) => isNil(arr) ? [] : arr!;
export const replaceDot = (s:string) => `${s.replace(/\./g, '/')}`;

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
}

export const columnFn : (p: ProcessedProperty) => ColumnDef<any> = (p) => ({
	header: p.name,
	id: p.pathName,
	accessorFn: p.isCollection ? path(join('.', init(p.path))) : path(p.path),
	odataType: p.type,
    path: p.path,
    isCollection: p.isCollection,
});

export const simpleFilterFn = (filter: ColumnFilter) => path(['value', 1])(filter);