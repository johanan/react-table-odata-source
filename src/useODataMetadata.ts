import { append } from 'ramda';
import { ODataMetadata } from "odata-metadata-processor";
import { useSuspenseQuery, UseQueryOptions } from "@tanstack/react-query";
import { ODataServiceDocument } from './index.d';
import { requiredUrl } from './utils';

export interface UseBaseOptions {
    parseFn: (metadata: string) => ODataMetadata,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

export interface UseODataMetadataOptions extends UseBaseOptions {
    metadataUrl: string,
    fetchFn: (url: string) => Promise<string>,
    parseFn: (metadata: string) => ODataMetadata,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

export interface UseDiscoverMetadataOptions {
    baseAddress: string,
    fetchFn: <T>(url: string) => Promise<T>,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataServiceDocument<any>, unknown, ODataServiceDocument<any>, string[]>, 'queryKey' | 'queryFn'>
}

export const useODataMetadata = ({metadataUrl, parseFn, fetchFn, queryKey, options,} : UseODataMetadataOptions) => 
    useSuspenseQuery({ queryKey: append(metadataUrl, queryKey), queryFn: () => requiredUrl(metadataUrl).then(fetchFn).then(parseFn), 
        ...options,
    });

export const useDiscoverMetadata = ({ baseAddress, fetchFn, queryKey, options } : UseDiscoverMetadataOptions) => { 
    const discovery = useSuspenseQuery({ queryKey: append('?$top=0', queryKey), queryFn: () => requiredUrl(baseAddress).then(u => `${u}?$top=0`).then<ODataServiceDocument<any>>(fetchFn), 
        ...options,});
    return discovery.data['@odata.context']
}

export default useODataMetadata;