import React from 'react';
import { prop, lensProp, over, take, compose, ascend, sortBy, sort } from 'ramda'
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { columnFn, simpleFilterFn, bindMetadataQuery, useODataSource, bindDiscoverQuery, bindODataSource, BindFunctions, RequiredExecuteOptions, InstanceExectuteOptions } from '../src';
import { metadataParser } from 'ts-odatajs/lib/odata/metadata';
import { AppProvider, ErrorBoundary } from './utils';
import { ODataMetadata } from 'odata-metadata-processor';
import { UseODataSourceOptions } from '../src/useODataSource';
import { ColumnHiding, Pagination, Table } from './TanTable';
import { ReactTableProvider } from 'react-table-provider';
import { getCoreRowModel } from '@tanstack/react-table';
import { csdl, data, ODataDataType } from './csdl';
import { ODataServiceDocument } from '../src/index.d';

const MockAdapter = require("axios-mock-adapter");

const valueLens = lensProp<ODataServiceDocument<any>>('value');

const parseFn = (xml: string) => metadataParser(null, xml) as ODataMetadata;
const fetchFn = (url) => axios({ url }).then(prop('data'));
const useMetadataQuery = bindMetadataQuery({ parseFn, fetchFn });
const useDiscovery = bindDiscoverQuery({ fetchFn, options: { retry: 0 } });

const ODataComp = ({ required } : { required: Omit<RequiredExecuteOptions & InstanceExectuteOptions, "metadata">}) => {
    const metadatUrl = useDiscovery(required.baseAddress);
    const metadata = useMetadataQuery(metadatUrl);
    const useOdata = bindODataSource();
    const odata = useOdata({ metadata: metadata.data, ...required });

    return (<ReactTableProvider 
        data={odata.data}
        columns={odata.columns}
        state={odata.state}
        onStateChange={odata.onStateChange}
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
        <pre>{odata.meta.queryString}</pre>
        <span>{JSON.stringify(odata.state.columnOrder)}</span>
        <pre>{JSON.stringify(odata.meta.defaultOrder)}</pre>
    </ReactTableProvider>);
}

const setupMock = (mock) => {
    // discovery query
    mock.onGet('https://test.com/Providers?$top=0').replyOnce(200, {"@odata.context": "https://test.com/?metadata", value:[]});
    // metadata query
    mock.onGet('https://test.com/?metadata').replyOnce(200, csdl);
    // count query
    mock.onGet('https://test.com/Providers?$count=true&$top=0').replyOnce(200, { '@odata.count': data.value.length, value: [] });
}

describe('OData Source', () => {
    it('should error when no baseAddress is provided', async () => {
        const fetchFn = jest.fn();
        // create error boundary to catch error
        render(<AppProvider>
            <ErrorBoundary>
            <ODataComp
            required={{
                baseAddress: '',
                entityType: 'ODataDemo.Product',
            }}/>
            </ErrorBoundary>
            </AppProvider>);
        await waitFor(() => expect(screen.getByText(/Url is required/)));
        expect(fetchFn).toBeCalledTimes(0);
    });

    it('should render', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        mock.onGet('https://test.com/Providers?$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));

        render(<AppProvider>
            <ODataComp 
                required={{
                    fetchFn,
                    baseAddress: 'https://test.com/Providers',
                    entityType: 'ODataDemo.Product',
                }}/>
                </AppProvider>);
        // did the column render?
        await waitFor(() => expect(screen.getAllByText('Description')));
        // did the data render?
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
    });

    it('should discover the metadata', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        mock.onGet('https://test.com/Providers?$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));

        render(<AppProvider>
            <ODataComp 
                required={{
                    fetchFn,
                    baseAddress: 'https://test.com/Providers',
                    entityType: 'ODataDemo.Product',
                }}/></AppProvider>);
        // did the column render?
        await waitFor(() => expect(screen.getAllByText('Description')));
        // did the data render?
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
    });

    it('should only expand when includeNavigations is true', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        // missing expand
        mock.onGet('https://test.com/Providers?$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));
        
        render(<AppProvider><ODataComp 
        required={{
            fetchFn,
            includeNavigation: false,
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
        }}/></AppProvider>);
        await waitFor(() => expect(screen.getAllByText('Description')));
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
    });

    it('should limit the select when a subset is selected', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        mock.onGet('https://test.com/Providers?$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));
        mock.onGet('https://test.com/Providers?$select=Name,Description,ReleaseDate,DiscontinuedDate,Rating,Price&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));
        mock.onAny().passThrough();
        
        render(<AppProvider><ODataComp 
        required={{
            fetchFn,
            includeNavigation: false,
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
        }} /></AppProvider>);
        await waitFor(() => expect(screen.getAllByText('Description')));
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
        var table = screen.getByRole("table") as HTMLTableElement;
        expect(table.rows[1].cells.length).toBe(7);
        // uncheck the ID column
        await userEvent.click(screen.getByLabelText('ID'));
        await waitFor(() => expect(table.rows[1].cells.length).toBe(6));
    });

    it('should use initialstate to build the query', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        mock.onGet('https://test.com/Providers?$select=Name,Description,ReleaseDate,DiscontinuedDate,Rating,Price&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));
        mock.onAny().passThrough();

        render(<AppProvider><ODataComp
        required={{
            fetchFn,
            includeNavigation: false,
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
            initialState: {
                columnVisibility: { ID: false }
            }
        }}/></AppProvider>);
        await waitFor(() => expect(screen.getAllByText('Description')));
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
        var table = screen.getByRole("table") as HTMLTableElement;
        expect(table.rows[1].cells.length).toBe(6);
    });

    it('should build select in expand when subset is selected', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        mock.onGet('https://test.com/Providers?$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));
        // sorted query
        mock.onGet('https://test.com/Providers?$expand=Categories,Supplier,ProductDetail&$orderby=Name asc&$top=10')
        // @ts-ignore
           .replyOnce(200, over<ODataDataType, any>(valueLens, compose(take(10), sort(ascend(prop('Name')))), data));
        mock.onAny().passThrough();

        render(<AppProvider><ODataComp 
            required={{
                fetchFn,
                baseAddress: 'https://test.com/Providers',
                entityType: 'ODataDemo.Product',
            }} />
            </AppProvider>);

        await waitFor(() => expect(screen.getAllByText('Description')));
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
        
        await userEvent.click(screen.getByLabelText('Name-sort'));
        // this only appears after sorting
        await waitFor(() => expect(screen.getByText("Bulk size can of instant coffee")));
    });

    it('should not reset the column order', async () => {
        var mock = new MockAdapter(axios);
        setupMock(mock);
        mock.onGet('https://test.com/Providers?$expand=Categories,Supplier,ProductDetail&$top=10')
            .replyOnce(200, over<ODataDataType, any>(valueLens, take(10), data));

        render(<AppProvider><ODataComp
        required={{
            fetchFn,
            baseAddress: 'https://test.com/Providers',
            entityType: 'ODataDemo.Product',
            initialState: {
                columnOrder: ["Description","ID"]
            }
        }}/></AppProvider>);

        await waitFor(() => expect(screen.getAllByText('Description')));
        await waitFor(() => expect(screen.getByText("Whole grain bread")));
        // current order
        screen.getByText(/"Description","ID"/);
        //the default order
        screen.getByText(/"ID","Name","Description"/);
    });
})