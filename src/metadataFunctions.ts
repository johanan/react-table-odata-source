import { ODataMetadata } from 'odata-metadata-processor';
import { useODataMetadata } from './useODataMetadata';
import { UseQueryOptions } from "@tanstack/react-query";

export interface PartialMetadataOptions {
    parseFn: (metadata: string) => ODataMetadata,
    fetchFn?: (url: string) => Promise<string>,
    queryKey?: string[],
    options?: Omit<UseQueryOptions<ODataMetadata, unknown, ODataMetadata, string[]>, 'queryKey' | 'queryFn'>
}

const defaultOptions = {
    fetchFn: (url) => fetch(url).then<string, string>(r => r.text()),
    queryKey: ['ODATA', 'METADATA'],
    options: {
        suspense: true,
        staleTime: 600000,
    }
}

export const useMetadataQuery = (options: PartialMetadataOptions) => (metadataUrl?: string) => useODataMetadata({ ...defaultOptions, ...options, metadataUrl})