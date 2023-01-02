import { defaultTableState } from './oDataFunctions';
import useODataSource, { UseODataSourceOptions } from './useODataSource';

const defaultODataOptions = {
    fetchFn: (url: string) => fetch(url).then(r => r.json()),
    queryKey: ['ODATA'],
    queryOptions: {
		keepPreviousData: true,
		staleTime: 300000,
		suspense: true,
	},
    initialState: defaultTableState,
};

export type BindFunctions = Pick<UseODataSourceOptions, "filterMapFn" | "fetchFn" | "queryKey" | "columnFn" | "queryOptions">;
export type RequiredExecuteOptions = Pick<UseODataSourceOptions, "baseAddress" | "entityType" | "useMetadataQuery">;
export type ExecuteOptions = Partial<Pick<UseODataSourceOptions, "metadataUrl" | "includeNavigation" | "selectAll" | "initialState" | "queryKey" >>;

export const bindODataSource = (bound: BindFunctions) => (options: RequiredExecuteOptions & ExecuteOptions) => useODataSource({ ...defaultODataOptions, ...bound, ...options});