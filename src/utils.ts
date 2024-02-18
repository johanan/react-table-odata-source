import { ColumnDef, TableOptions, ColumnFilter, getCoreRowModel } from "@tanstack/react-table";
import { ProcessedProperty } from "odata-metadata-processor";
import { init, join, path, isNil, isEmpty } from 'ramda';

export const defaultQueryKey = ['ODATA'];
export const defaultMetadataQueryKey = ['ODATA', 'METADATA'];

export const requiredUrl = (url: string) => new Promise<string>((resolve, reject) => { isEmpty(url) ? reject('Url is required') : resolve(url) });

const baseFetch = (url: string ) => fetch(url).then(r => {
	if (!r.ok) throw new Error(r.statusText);
	return r;
});

export const jsonFetchFn = <T>(url: string) => baseFetch(url).then<T>(r => r.json());
export const textFetchFn = (url: string) => baseFetch(url).then(r => r.text());

export const defaultTableProps : Partial<TableOptions<any>> = {
	getCoreRowModel: getCoreRowModel(),
	autoResetAll: false,
	manualSorting: true,
	manualPagination: true,
	manualFiltering: true
}

export const emptyArray = <T,>(arr?: T[]) => isNil(arr) ? [] : arr!;
export const replaceDot = (s:string) => `${s.replace(/\./g, '/')}`;

export const columnFn : (p: ProcessedProperty) => ColumnDef<any> = (p) => ({
	header: p.name,
	id: p.pathName,
	accessorFn: p.isCollection ? join('.', init(p.path)) : path(p.path),
	odataType: p.type,
    path: p.path,
    isCollection: p.isCollection,
});

export const simpleFilterFn = (filter: ColumnFilter) => path<string>(['value', 1])(filter);