import React from 'react';
import { prop } from 'ramda'
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
var MockAdapter = require("axios-mock-adapter");
import { columnFn, simpleFilterFn, bindMetadataQuery, useODataSource } from '../src';
import { metadataParser } from 'ts-odatajs/lib/odata/metadata';
import { AppProvider } from './utils';
import { ODataMetadata } from 'odata-metadata-processor';
import { UseODataSourceOptions } from '../src/useODataSource';
import { Table } from './TanTable';
import { ReactTableProvider } from 'react-table-provider';
import { getCoreRowModel } from '@tanstack/react-table';
import { csdl } from './csdl';

const parseFn = (xml: string) => metadataParser(null, xml) as ODataMetadata;
const fetchFn = (url) => axios({ url }).then(prop('data'));
const useMetadataQuery = bindMetadataQuery({ parseFn, fetchFn });

const ODataComp = ({ options } : { options: Omit<UseODataSourceOptions, "useMetadataQuery">}) => {
    const odata = useODataSource({ ...options, useMetadataQuery });

    return (<ReactTableProvider 
        data={odata.data}
        columns={odata.columns}
        state={odata.state}
        onStateChange={odata.onStateChange}
        onColumnFiltersChange={odata.onColumnFiltersChange}
        pageCount={odata.pageCount}
        getCoreRowModel={getCoreRowModel()}
        autoResetAll={false}
        manualSorting
        manualPagination
        manualFiltering
    >
        <Table />
    </ReactTableProvider>);
}

describe('OData Source', () => {
    it('should render', async () => {
        var mock = new MockAdapter(axios);
        mock.onGet('https://test.com/?metadata').replyOnce(200, csdl);
        mock.onGet('https://test.com/Providers?$count=true&$top=0').replyOnce(200, { '@odata.count': 11, value: [] });
        mock.onGet('https://test.com/Providers?$select=ID,Name,Description,ReleaseDate,DiscontinuedDate,Rating,Price&$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, { value: [] });
        mock.onAny(/.*/).reply(c => {
            return [400, null]
        })

        render(<AppProvider><ODataComp options={{
            metadataUrl: 'https://test.com/?metadata',
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
            filterMapFn: simpleFilterFn,
            columnFn,
            fetchFn
        }} /></AppProvider>);
        await waitFor(() => expect(screen.getByText('Description')));
    })
})