import { ODataMetadata } from 'odata-metadata-processor';
import React from 'react'
//import { useMetadataQuery } from 'react-table-odata-source';
import { metadataParser } from 'ts-odatajs/lib/odata/metadata';
import { useODataSource, useMetadataQuery, columnFn, simpleFilterFn } from '../../../src';
import { ReactTableProvider } from "react-table-provider";
import { getCoreRowModel
    } from "@tanstack/react-table";
import Table, { Debug } from './Table';
import Pagination from './Pagination';
import ColumnHiding from './ColumnHiding';
import { ODataContainsFilter } from './Filters';

const parseFn = (xml: string) => metadataParser(null, xml) as ODataMetadata;
function formatMoney(number) {
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

const customColumns = [
    { id: 'Price', cell: ({ getValue }) => getValue() ? formatMoney(getValue()) : null},
    { id: 'Description', filter: ODataContainsFilter, enableColumnFilter: true }
]

const App = () => {
    const metadataQuery = useMetadataQuery({ parseFn });
    const odata = useODataSource({
        baseAddress: 'https://services.odata.org/V4/OData/OData.svc/Products',
        entityType: 'ODataDemo.Product',
        useMetadataQuery: metadataQuery, 
        columnFn,
        filterMapFn: simpleFilterFn,
        customColumns,
        includeNavigation: true,
        selectAll: false
    })
    

    return (<div>
        <ReactTableProvider 
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
            <div>Table</div>
            <ColumnHiding />
            <Table />
            <Pagination />
            { odata.isFetching ? 'Loading...' : null }
            <Debug />
        </ReactTableProvider>
        <pre>{odata.queryString}</pre>
    </div>);
}

export default App;