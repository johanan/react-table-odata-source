import { useODataMetadata, UseODataMetadataOptions, useDiscoverMetadata } from './useODataMetadata';
import { jsonFetchFn, textFetchFn, defaultMetadataQueryKey } from './utils';

export type RequiredParseFn = Pick<UseODataMetadataOptions, "parseFn"> ;
export type OptionalOptions = Partial<Pick<UseODataMetadataOptions, "fetchFn" | "queryKey" | "options">> ;

const defaultOptions = {
    fetchFn: textFetchFn,
    queryKey: defaultMetadataQueryKey,
    options: {
        staleTime: 600000,
    }
}

export type OptionalDiscoverOptions = Partial<Pick<UseODataMetadataOptions, "fetchFn" | "queryKey" | "options">> ;

const defaultDiscoverOptions = {
    fetchFn: jsonFetchFn,
    queryKey: defaultMetadataQueryKey,
    options: {}
}

export const bindMetadataQuery = (options: RequiredParseFn & OptionalOptions) => (metadataUrl: string) => useODataMetadata({ ...defaultOptions, ...options, metadataUrl});
export const bindDiscoverQuery = (options?: OptionalDiscoverOptions) => (baseAddress: string) => useDiscoverMetadata({ ...defaultDiscoverOptions, ...options, baseAddress});