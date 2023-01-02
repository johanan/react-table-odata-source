export interface ODataServiceDocument<Type> {
    '@odata.context': string,
    '@odata.count': number,
    value: Type[],
}