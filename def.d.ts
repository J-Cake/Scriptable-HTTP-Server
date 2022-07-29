declare type Nullable<T> = T | null | undefined;
declare type HTTPRequest = {
    request(): import('node:http').IncomingMessage,
    url: import('node:url').URL,
    method: string,
    status(status: number): HTTPRequest,
    header(name: string, ...values: string[]): HTTPRequest,
    getHeader(name: string): Nullable<string | string[]>
}
