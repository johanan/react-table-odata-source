import { ODataMetadata } from 'odata-metadata-processor';
import React from 'react'
import { metadataParser } from 'ts-odatajs/lib/odata/metadata';
import { bindMetadataQuery, bindDiscoverQuery, bindODataSource } from '../../../src';
import { ReactTableProvider } from "react-table-provider";
import { getCoreRowModel
    } from "@tanstack/react-table";
import { Debug } from './Debug';
import { Table, Pagination, ColumnHiding } from '../../../tests/TanTable';
import { ODataContainsFilter } from './Filters';
import { useIsFetching } from '@tanstack/react-query';
import './overlay.css';

const customColumns = [
    { id: 'Price', cell: ({ getValue }) => getValue() ? formatMoney(getValue()) : null},
    { id: 'Description', filter: ODataContainsFilter, enableColumnFilter: true }
]
const parseFn = (xml: string) => metadataParser(null, xml) as ODataMetadata;
const useMetadataQuery = bindMetadataQuery({ parseFn });
const useDiscovery = bindDiscoverQuery();
const useOdata = bindODataSource();
function formatMoney(number) {
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

const App = () => {
    const [isPending, startTransition] = React.useTransition();
    const fetching = useIsFetching();
    const metadatUrl = useDiscovery('https://services.odata.org/V4/OData/OData.svc/Products');
    const metadata = useMetadataQuery(metadatUrl);
    const odata = useOdata({
        baseAddress: 'https://services.odata.org/V4/OData/OData.svc/Products',
        entityType: 'ODataDemo.Product',
        metadata: metadata.data,
        customColumns,
    })

    const nonUrgentOnChange = e => {
        startTransition(() => {
            odata.onStateChange(e);
        });
    }

    return (<div>
        <ReactTableProvider 
            data={odata.data}
            columns={odata.columns}
            state={odata.state}
            onStateChange={nonUrgentOnChange}
            pageCount={odata.pageCount}
            meta={odata.meta}
            getCoreRowModel={getCoreRowModel()}
            autoResetAll={false}
            manualSorting
            manualPagination
            manualFiltering
        >
            <div>Table</div>
            <ColumnHiding />
            <div className='table-container'>
                <Table />
                {isPending ? <div className='overlay'>Loading...</div> : null}
            </div>
            <Pagination />
            { fetching ? 'Loading...' : null }
            <Debug />
        </ReactTableProvider>
        <pre>{odata.meta.queryString}</pre>
    </div>);
}

export default App;