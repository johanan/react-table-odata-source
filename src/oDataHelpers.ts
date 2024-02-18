import { defaultTableState } from './oDataFunctions';
import useODataSource, { UseODataSourceOptions } from './useODataSource';
import { columnFn, simpleFilterFn } from './utils';

const defaultODataOptions = {
    includeNavigation: true,
    selectAll: false,
    fetchFn: (url: string) => fetch(url).then(r => r.json()),
    queryKey: ['ODATA'],
    queryOptions: {
		staleTime: 300000,
	},
    initialState: defaultTableState,
    columnFn,
    filterMapFn: simpleFilterFn,
    customColumns: [],
};

export type BindFunctions = Partial<Pick<UseODataSourceOptions, "fetchFn" | "queryKey" | "queryOptions">>;
export type InstanceExectuteOptions = Partial<Pick<UseODataSourceOptions, "fetchFn" | "queryKey" | "queryOptions" | "includeNavigation" | "selectAll" |"initialState" | "columnFn" | "filterMapFn" | "customColumns">>;
export type RequiredExecuteOptions = Pick<UseODataSourceOptions, "baseAddress" | "entityType" | "metadata">;

export const bindODataSource = (bound?: BindFunctions) => (options: RequiredExecuteOptions & InstanceExectuteOptions) => useODataSource({ ...defaultODataOptions, ...bound, ...options});