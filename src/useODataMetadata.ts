import { isNil, isEmpty, append } from 'ramda';
import { ODataMetadata } from "odata-metadata-processor";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export interface UseODataMetadataOptions {
    metadataUrl?: string,
    parseFn: (metadata: string) => ODataMetadata,
    fetchFn: (url: string) => Promise<string>,
    queryKey: string[],
    options: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

export const useODataMetadata = ({metadataUrl, parseFn, fetchFn, queryKey, options,} : UseODataMetadataOptions) => 
    useQuery(append(metadataUrl ?? '', queryKey), () => fetchFn(metadataUrl ?? '').then(parseFn), {
        ...options,
        enabled: !isEmpty(metadataUrl) && !isNil(metadataUrl)
    });

export default useODataMetadata;