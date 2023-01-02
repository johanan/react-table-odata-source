import typescript from '@rollup/plugin-typescript';

export default [
    {
        input: 'src/index.ts',
        output: [{
            file: 'dist/index.js',
            format: 'es',
            sourcemap: true,
        }],
        external: ['react', 'ramda', '@tanstack/react-query', 'odata-metadata-processor',
            'odata-query', 'functional-object-array-merge', '@tanstack/react-table'],
        plugins: [
            typescript()
        ]
    }
];