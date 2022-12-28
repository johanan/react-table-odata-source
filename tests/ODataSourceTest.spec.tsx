import React from 'react';
import { prop, lensProp, over, take } from 'ramda'
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { columnFn, simpleFilterFn, bindMetadataQuery, useODataSource } from '../src';
import { metadataParser } from 'ts-odatajs/lib/odata/metadata';
import { AppProvider } from './utils';
import { ODataMetadata } from 'odata-metadata-processor';
import { UseODataSourceOptions } from '../src/useODataSource';
import { ColumnHiding, Pagination, Table } from './TanTable';
import { ReactTableProvider } from 'react-table-provider';
import { getCoreRowModel } from '@tanstack/react-table';
import { csdl, data, ODataDataType } from './csdl';
import { ODataServiceDocument } from '../types';

const MockAdapter = require("axios-mock-adapter");

const valueLens = lensProp<ODataServiceDocument<any>>('value');

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
        <ColumnHiding />
        <Table />
        <Pagination />
        <pre>{odata.queryString}</pre>
    </ReactTableProvider>);
}

describe('OData Source', () => {
    it('should render', async () => {
        var mock = new MockAdapter(axios);
        // metadata query
        mock.onGet('https://test.com/?metadata').replyOnce(200, csdl);
        // count query
        mock.onGet('https://test.com/Providers?$count=true&$top=0').replyOnce(200, { '@odata.count': data.value.length, value: [] });
        // data query
        mock.onGet('https://test.com/Providers?$select=ID,Name,Description,ReleaseDate,DiscontinuedDate,Rating,Price&$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));

        render(<AppProvider><ODataComp options={{
            metadataUrl: 'https://test.com/?metadata',
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
            filterMapFn: simpleFilterFn,
            columnFn,
            fetchFn
        }} /></AppProvider>);
        // did the column render?
        await waitFor(() => expect(screen.getAllByText('Description')));
        // did the data render?
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
    });

    it('should discover the metadata', async () => {
        var mock = new MockAdapter(axios);
        // discovery query - return the metadata url
        mock.onGet('https://test.com/Providers?$top=0').replyOnce(200, {"@odata.context": "https://test.com/?metadata", value:[]});
        mock.onGet('https://test.com/?metadata').replyOnce(200, csdl);
        mock.onGet('https://test.com/Providers?$count=true&$top=0').replyOnce(200, { '@odata.count': data.value.length, value: [] });
        mock.onGet('https://test.com/Providers?$select=ID,Name,Description,ReleaseDate,DiscontinuedDate,Rating,Price&$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));

        render(<AppProvider><ODataComp options={{
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
            filterMapFn: simpleFilterFn,
            columnFn,
            fetchFn
        }} /></AppProvider>);
        // did the column render?
        await waitFor(() => expect(screen.getAllByText('Description')));
        // did the data render?
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
    });
})