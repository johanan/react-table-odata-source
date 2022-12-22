import { isNil } from 'ramda';
import { ODataMetadata } from "odata-metadata-processor";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export interface useODataMetadataOptions {
    metadataUrl?: string,
    parseFn: (metadata: string) => ODataMetadata,
    queryFn?: (url: string) => Promise<string>,
    queryKey?: string[],
    options?: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

const useODataMetadata = ({metadataUrl,
    parseFn,
    queryFn = (url) => fetch(url).then<string, string>(r => r.text()),
    queryKey = ['ODATA', 'METADATA', metadataUrl ?? ''],
    options = {
        suspense: true,
        staleTime: 600000,
    }
} : useODataMetadataOptions) => useQuery(queryKey, () => queryFn(metadataUrl ?? '').then(parseFn), {
        ...options,
        enabled: !isNil(metadataUrl)
    });

export const useMetadataQuery = (options: useODataMetadataOptions) => (metadataUrl?: string) => useODataMetadata({ ...options, metadataUrl})

export default useODataMetadata;