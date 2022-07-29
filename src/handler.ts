import url from 'node:url';
import os from 'node:os';
import fss, { promises as fs } from 'node:fs';
import http from 'node:http';
import chalk from 'chalk';

import type { Nullable } from './index.js';
import { config } from './index.js';
import log from './log.js';
import { staticHandler } from './static.js';

export type HTTPRequest = {
    request(): http.IncomingMessage,
    url: url.URL,
    method: string,
    status(status: number): HTTPRequest,
    header(name: string, ...values: string[]): HTTPRequest,
    getHeader(name: string): Nullable<string | string[]>
};

export type HTTPResponse = AsyncIterable<Buffer | string> | Iterable<Buffer | String>;
export type HTTPHandler = (ans: HTTPRequest) => HTTPResponse | Promise<HTTPResponse>;

export const handlerCache: Map<string, HTTPHandler> = new Map();

const clean = (path: string): string => path
    .replaceAll('./', '')
    .replaceAll(/[^\/]*\/\.\.\//g, '')
    .replaceAll(/^\.\./g, '')
    .replaceAll(/\/+/g, '/');

export const toAbs = (path: string): string => clean((path ? (({
    '~': (path: string) => `${os.homedir()}/${path.slice(1)}`,
    '/': (path: string) => path
})[['~/', '/'].find(i => path.startsWith(i))!]!?.(path) ?? `${process.cwd()}/${path}`) : '/'));

export default async function resolveHandler(request: string): Promise<HTTPHandler> {
    log.verbose(`Resolving ${chalk.yellow(request)}`);
    for (const i of config.get().roots.map((i: string) => toAbs(i))) {
        const path = clean(`${i}/${clean(request)}`);

        if (handlerCache.has(path)) {
            log.debug(`Reusing handler for ${chalk.yellow(path)}`);
            return handlerCache.get(path)!;
        }

        log.debug(`Loading handler for ${chalk.yellow(path)}`);

        const stat = await fs.stat(path).catch(() => null);
        if (!stat)
            continue;

        if (!stat.isDirectory()) {
            const { default: handler, cacheable } = await import(path);
            if (cacheable !== false)
                handlerCache.set(path, handler);

            return handlerCache.get(path)!;
        } else {
            const stat = await fs.stat(`${path}/index.js`).catch(() => null);
            if (!stat || stat.isDirectory())
                continue;

            log.debug(`Coalesce to ${chalk.yellow(`${path}/index.js`)}`);

            const { default: handler, cacheable } = await import(`${path}/index.js`).then(handler => handler.default);

            if (cacheable !== false) {
                handlerCache.set(path, handler); // only cache `handler` because `handler`/index.js` is resolved to `handler`
                handlerCache.set(`${path}/index.js`, handler); // only cache `handler` because `handler`/index.js` is resolved to `handler`
            }

            return handlerCache.get(`${path}/index.js`)!;
        }
    }
    
    log.debug(`No scriptlet found for ${request}`);

    for (const i of config.get().static.map((i: string) => toAbs(i))) {
        const path = clean(`${i}/${clean(request)}`);
        if (handlerCache.has(path))
            return handlerCache.get(path)!;

        if (await fs.stat(path).then(stat => !stat.isDirectory()).catch(() => false)) {
            handlerCache.set(path, staticHandler.bind({ basePath: i }));
            return handlerCache.get(path)!;
        } else if (await fs.stat(`${path}/index.html`).then(stat => !stat.isDirectory()).catch(() => false)) {
            handlerCache.set(path, staticHandler.bind({ basePath: i }));
            return handlerCache.get(`${path}/index.html`)!;
        }
    }

    throw { code: 404, err: `Unable to locate handler for ${chalk.yellow(request)}` };
}
