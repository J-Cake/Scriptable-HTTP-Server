import url from 'node:url';
import os from 'node:os';
import fss, { promises as fs } from 'node:fs';
import http from 'node:http';
import chalk from 'chalk';

import type { Nullable } from './index.js';
import { config } from './index.js';

export type HTTPRequest = {
    request(): http.IncomingMessage,
    url: url.URL,
    method: string,
    status(status: number): HTTPRequest,
    header(name: string, ...values: string[]): HTTPRequest,
    getHeader(name: string): Nullable<string | string[]>
};

export interface HTTPHandler {
    default: (ans: HTTPRequest) => AsyncGenerator<Buffer | string>
}

export const handlerCache: Map<string, HTTPHandler> = new Map();

export const toAbs = (path: string): string => (path ? (({
    '~': (path: string) => `${os.homedir()}/${path.slice(1)}`,
    '/': (path: string) => path
})[['~/', '/'].find(i => path.startsWith(i))!]!?.(path) ?? `${process.cwd()}/${path}`) : '/')
    .replaceAll('./', '')
    .replaceAll(/[^\/]*\/\.\.\//g, '')
    .replaceAll(/^\.\./g, '')

export default async function resolveHandler(handler: string): Promise<HTTPHandler> {
    for (const i of config.get().roots.map(i => toAbs(i))) {
        if (handlerCache.has(i))
            return handlerCache.get(i)!;

        if (await fs.stat(i).then(stat => !stat.isDirectory()).catch(() => false)) {
            handlerCache.set(i, await import(i));
            return handlerCache.get(i)!;
        } else if (await fs.stat(`${i}/index.js`).then(stat => !stat.isDirectory()).catch(() => false)) {
            handlerCache.set(i, await import(`${i}/index.js`));
            return handlerCache.get(i)!;
        }
    }
    
    throw {code: 404, err: `Unable to locate handler for ${chalk.yellow(handler)}`};
}
