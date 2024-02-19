import { append } from 'ramda';
import { ODataMetadata } from "odata-metadata-processor";
import { useSuspenseQuery, UseQueryOptions } from "@tanstack/react-query";
import { ODataServiceDocument } from './index.d';
import { requiredUrl } from './utils';

/**
 * Interface: UseBaseOptions
 * This interface represents the base options for useODataMetadata and useDiscoverMetadata hooks.
 *
 * Properties:
 * - parseFn: A function that parses the metadata string into an ODataMetadata object.
 * - queryKey: An array of strings that uniquely identifies the query.
 * - options: Additional options for the query, excluding 'queryKey' and 'queryFn'.
 */
export interface UseBaseOptions {
    parseFn: (metadata: string) => ODataMetadata,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

/**
 * Interface: UseODataMetadataOptions
 * This interface extends UseBaseOptions with additional properties specific to the useODataMetadata hook.
 *
 * Properties:
 * - metadataUrl: The URL from which to fetch the metadata.
 * - fetchFn: A function that fetches the metadata from the given URL.
 */
export interface UseODataMetadataOptions extends UseBaseOptions {
    metadataUrl: string,
    fetchFn: (url: string) => Promise<string>,
    parseFn: (metadata: string) => ODataMetadata,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

/**
 * Interface: UseDiscoverMetadataOptions
 * This interface represents the options for the useDiscoverMetadata hook.
 *
 * Properties:
 * - baseAddress: The base address for the OData service.
 * - fetchFn: A function that fetches the service document from the given URL.
 */
export interface UseDiscoverMetadataOptions {
    baseAddress: string,
    fetchFn: <T>(url: string) => Promise<T>,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataServiceDocument<any>, unknown, ODataServiceDocument<any>, string[]>, 'queryKey' | 'queryFn'>
}

/**
 * Hook: useODataMetadata
 * This hook fetches and parses OData metadata.
 *
 * Parameters:
 * - options: An object of type {@link UseODataMetadataOptions} that specifies how to fetch and parse the metadata.
 *
 * Returns:
 * - A query object that contains the fetched and parsed metadata.
 */
export const useODataMetadata = ({metadataUrl, parseFn, fetchFn, queryKey, options,} : UseODataMetadataOptions) => 
    useSuspenseQuery({ queryKey: append(metadataUrl, queryKey), queryFn: () => requiredUrl(metadataUrl).then(fetchFn).then(parseFn), 
        ...options,
    });

/**
 * Hook: useDiscoverMetadata
 * This hook fetches a service document and returns the '@odata.context' property.
 *
 * Parameters:
 * - options: An object of type {@link UseDiscoverMetadataOptions} that specifies how to fetch the service document.
 *
 * Returns:
 * - The '@odata.context' property of the fetched service document.
 */
export const useDiscoverMetadata = ({ baseAddress, fetchFn, queryKey, options } : UseDiscoverMetadataOptions) => { 
    const discovery = useSuspenseQuery({ queryKey: append('?$top=0', queryKey), queryFn: () => requiredUrl(baseAddress).then(u => `${u}?$top=0`).then<ODataServiceDocument<any>>(fetchFn), 
        ...options,});
    return discovery.data['@odata.context']
}

export default useODataMetadata;