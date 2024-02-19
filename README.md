# React Table OData Source (aka TanStack React Table)
This library providers a hook that will take the state from React Table and turn it into OData queries.

## QuickStart
There are a lot of parameters, options, and return types, but most use cases are very straight-forward.
There is an `examples` directory that has a working examples.

### Create an OData backed TanStack Table

Infrastructure setup. Helper functions exist to "bind" fetch and parse functions once.
By default the helper functions will use `fetch`, but let's say `axios` is required. Bind the `axios` function once and it is good to go.

```jsx
// best OData metadata parser
import { metadataParser } from 'ts-odatajs/lib/odata/metadata';
import { ODataMetadata } from 'odata-metadata-processor';
import axios from 'axios';
import { bindMetadataQuery, bindDiscoverQuery, bindODataSource } from 'react-table-odata-source';

const parseFn = (xml: string) => metadataParser(null, xml) as ODataMetadata;
// this can be anything as long as it takes a string and returns a promise of the data
const fetchFn = (url) => axios({ url }).then(r => r.data);

// all tanstack queries will build from the query key passed in
const queryKey = ["YOUR", "TANSTACK", "QUERY", "KEY"]

// helper functions to bind options
// once bound then can be overridden later, or will use these as the defaults
// each one of these bind functions can be executed with no options to default everything
const useMetadataQuery = bindMetadataQuery({ parseFn, fetchFn, queryKey });
const useDiscovery = bindDiscoverQuery({ fetchFn, queryKey });
const useOdata = bindODataSource({ fetchFn, queryKey });
```

Now that there are bound hooks, they can be used to build a TanStack Table.

```jsx
import { ReactTableProvider } from "react-table-provider";
import { getCoreRowModel
    } from "@tanstack/react-table";
// build your own Table components, check under tests to see an example
import { Table, Pagination, ColumnHiding, Debug } from 'your/components/Table';


// you can add to a column by partially defining the column
// it will be merged by the id
const customColumns = [
    { id: 'Price', cell: ({ getValue }) => getValue() ? formatMoney(getValue()) : null},
    { id: 'Description', filter: ODataContainsFilter, enableColumnFilter: true }
]

const App = () => {
    // this is a real OData service document you can use
    const metadatUrl = useDiscovery('https://services.odata.org/V4/OData/OData.svc/Products');
    const metadata = useMetadataQuery(metadatUrl);
    const odata = useOdata({
        baseAddress: 'https://services.odata.org/V4/OData/OData.svc/Products',
        entityType: 'ODataDemo.Product',
        metadata: metadata.data,
        customColumns,
    });

    // ReactTableProvider is a context that allows a table to be
    // composed in pieces. The return type of useOdata is designed
    // to go straight into TanStack Table
    return (<div>
        <ReactTableProvider 
            data={odata.data}
            columns={odata.columns}
            state={odata.state}
            onStateChange={odata.onStateChange}
            pageCount={odata.pageCount}
            meta={odata.meta}
            getCoreRowModel={getCoreRowModel()}
            autoResetAll={false}
            manualSorting
            manualPagination
            manualFiltering
        >
            <ColumnHiding />
            <Table />
            <Pagination />
            { fetching ? 'Loading...' : null }
            <Debug />
        </ReactTableProvider>
        <pre>{odata.meta.queryString}</pre>
    </div>);
```

There are multiple functions that can change any behavior. For example, `columnFn` handles the output of all the columns. There is a default, but is easily overriden. `utils.tsx` has most of the defaults and `odataHelpers.ts` is where the defaults are bound through the "binder" functions.

## Hooks to load and use OData Metadata
These are the underlying hooks that power all the functionality.
`useDiscoverMetadata` and `useODataMetadata` are both used to discover and then load the metadata for an OData service. 
`useODataSource` then will turn that metadata into a TanStack Table state object and build the correct queries to load data from the service. All automatically.

## useDiscoverMetadata
This hook fetches a service document and returns the '@odata.context' property. Use this to 'discover' the metadata Url when you know the root.

### Parameters

- `options`: An object of type `UseDiscoverMetadataOptions` that specifies how to fetch the service document.

#### Properties

- `baseAddress`: The base address for the OData service.
- `fetchFn`: A function that fetches the service document from the given URL.
- `queryKey`: An array of strings that uniquely identifies the query.
- `options`: TanStack Query options, excluding 'queryKey' and 'queryFn'.

### Returns

- The '@odata.context' property of the fetched service document.

### Usage

```typescript
const context = useDiscoverMetadata({
  baseAddress: 'https://example.com/odata',
  fetchFn: fetch,
  queryKey: ['serviceDocument'],
  options: {},
});
```

## useODataMetadata

This hook fetches and parses OData metadata.

### Parameters

- `options`: An object of type `UseODataMetadataOptions` that specifies how to fetch and parse the metadata.

#### Properties

- `metadataUrl`: The URL from which to fetch the metadata.
- `fetchFn`: A function that fetches the metadata from the given URL.
- `parseFn`: A function that parses the metadata string into an `ODataMetadata` object.
- `queryKey`: An array of strings that uniquely identifies the query.
- `options`: TanStack Query options, excluding 'queryKey' and 'queryFn'.

### Returns

- A query object that contains the fetched and parsed metadata.

### Usage

```typescript
const metadata = useODataMetadata({
  metadataUrl: 'https://example.com/odata/$metadata',
  parseFn: parseMetadata,
  fetchFn: fetch,
  queryKey: ['metadata'],
  options: {},
});
```
## useODataSource

This hook fetches and processes OData source.

### Parameters

- `options`: An object of type `UseODataSourceOptions` that specifies how to fetch and process the OData source.

#### Properties

- `baseAddress`: The base address for the OData service.
- `entityType`: The type of the entity to fetch.
- `includeNavigation`: Whether to include navigation properties in the fetched data. Turn this off to just load one type without having to explicitly exclude everything else.
- `metadata`: The metadata for the OData service.
- `selectAll`: Whether to select all properties of the entity. Use this to continue to select all the properties even when certain properties are hidden.
- `initialState`: The initial TanStack Table state.
- `filterMapFn`: A function that maps a column filter to an OData filter.
- `fetchFn`: A function that fetches the data from the given URL.
- `queryOptions`: TanStack query options, excluding 'queryKey' and 'queryFn'.
- `queryKey`: An array of strings that uniquely identifies the query.
- `columnFn`: A function that maps a property to a TanStack Table column definition.
- `customColumns`: An array of custom column definitions merged by `id`. This can either add a custom column definition to a property from OData. Or just add a column that does not exist in OData.

### Returns

- An object of type `ODataSource` that contains the fetched and processed data.

#### Properties

- `data`: The fetched data.
- `state`: The current TanStack Table state.
- `setState`: The table state setter.
- `onStateChange`: Same function as `setState`, just named the same as the function name for TanStack Table.
- `columns`: The columns of the table.
- `pageCount`: The number of pages in the table.
- `meta`: Metadata about the data source.

#### Meta Properties

- `baseAddress`: The base address for the OData service.
- `total`: The total number of entities in the data source.
- `queryString`: The query string used to fetch the data.
- `boundQueryKey`: The string array used as the query key for TanStack Query. Great for finding or invalidating queries as needed.
- `typeRoot`: The root type of the entities in the data source.
- `defaultOrder`: The default order of the entities in the data source.

### Usage

```typescript
const dataSource = useODataSource({
  baseAddress: 'https://example.com/odata',
  entityType: 'Product',
  includeNavigation: true,
  metadata: metadata,
  selectAll: true,
  initialState: {},
  filterMapFn: mapFilter,
  fetchFn: fetch,
  queryOptions: {},
  queryKey: ['dataSource'],
  columnFn: mapPropertyToColumn,
  customColumns: [],
});
```
