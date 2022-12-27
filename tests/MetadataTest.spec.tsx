import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
var MockAdapter = require("axios-mock-adapter");
import { useMetadataQuery } from '../src';
import { AppProvider } from './utils';

const parseFn = (s) => ({ dataServices: { schema: [] } })

const TestComp = ({ metadataUrl, fetchFn, parseFn }) => {
    const query = useMetadataQuery({ parseFn, fetchFn })(metadataUrl);
    return (<div>Rendered</div>);
}

describe('useODataMetadata', () => {
    it('should not load without url', async () => {
        const fetchFn = jest.fn();
        render(<AppProvider><TestComp metadataUrl='' fetchFn={fetchFn} parseFn={parseFn} /></AppProvider>);
        await waitFor(() => expect(screen.getByText('Rendered')));
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