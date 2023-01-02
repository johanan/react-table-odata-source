import { useODataMetadata, UseODataMetadataOptions } from './useODataMetadata';

export type RequiredParseFn = Pick<UseODataMetadataOptions, "parseFn"> ;
export type OptionalOptions = Partial<Pick<UseODataMetadataOptions, "fetchFn" | "queryKey" | "options">> ;

const defaultOptions = {
    fetchFn: (url: string) => fetch(url).then<string, string>(r => r.text()),
    queryKey: ['ODATA', 'METADATA'],
    options: {
        suspense: true,
        staleTime: 600000,
    }
}

export const bindMetadataQuery = (options: RequiredParseFn & OptionalOptions) => (metadataUrl?: string) => useODataMetadata({ ...defaultOptions, ...options, metadataUrl})