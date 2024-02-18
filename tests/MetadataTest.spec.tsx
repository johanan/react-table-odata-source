import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
var MockAdapter = require("axios-mock-adapter");
import { bindMetadataQuery, useDiscoverMetadata, bindDiscoverQuery } from '../src';
import { AppProvider, ErrorBoundary } from './utils';

const parseFn = (s) => ({ dataServices: { schema: [] } })

const TestComp = ({ metadataUrl, fetchFn, parseFn }) => {
    const query = bindMetadataQuery({ parseFn, fetchFn, options: { retry: 0 } })(metadataUrl);
    return (<div>Rendered</div>);
}

const Discover = ({ baseAddress, fetchFn }) => {
    const query = bindDiscoverQuery({ fetchFn, options: { retry: 0 } })(baseAddress);
    return query;
}

describe('useODataMetadata', () => {
    it('should not render with an empty string', async () => {
        const fetchFn = jest.fn();
        // create error boundary to catch error

        render(<AppProvider>
            <ErrorBoundary>
            <TestComp metadataUrl='' fetchFn={fetchFn} parseFn={parseFn} />
            </ErrorBoundary>
            </AppProvider>);
        await waitFor(() => expect(screen.getByText(/Url is required/)));
        expect(fetchFn).toBeCalledTimes(0);
    });

    it('should make the call with a URL', async () => {
        var mock = new MockAdapter(axios);
        mock.onGet('https://test.com/?metadata').reply(200, 'XML HERE');
        const fetchFn = (url) => axios({ url });
        const jestParser = jest.fn(parseFn);
        render(<AppProvider><TestComp metadataUrl='https://test.com/?metadata' fetchFn={fetchFn} parseFn={jestParser} /></AppProvider>);
        await waitFor(() => expect(screen.getByText('Rendered')));
        expect(jestParser).toBeCalledTimes(1);
    })
})

describe('useDiscoverMetadata', () => {
    it('should not render with an empty string', async () => {
        const fetchFn = jest.fn();
        // create error boundary to catch error
        render(<AppProvider>
            <ErrorBoundary>
            <Discover baseAddress='' fetchFn={fetchFn} />
            </ErrorBoundary>
            </AppProvider>);
        await waitFor(() => expect(screen.getByText(/Url is required/)));
        expect(fetchFn).toBeCalledTimes(0);
    });

    it('should make the call with a URL', async () => {
        const mock = new MockAdapter(axios);
        mock.onGet('https://test.com/?$top=0').reply(200, { '@odata.context': 'https://test.com/$metadata' });
        const fetchFn = (url) => axios({ url }).then(r => r.data);
        render(<AppProvider><Discover baseAddress='https://test.com/' fetchFn={fetchFn} /></AppProvider>);
        await waitFor(() => expect(screen.getByText('https://test.com/$metadata')));
    });
});
