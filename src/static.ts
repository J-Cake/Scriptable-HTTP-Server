import fss, { promises as fs } from 'node:fs';
import chalk from 'chalk';
import { iter } from '@j-cake/jcake-utils/iter';

import log from './log.js';
import type { HTTPRequest } from './handler.js';

const mime: Record<string, string> = await import('./mime.json').then(res => res.default);
export async function staticHandler(this: { basePath: string }, req: HTTPRequest): Promise<AsyncIterable<Buffer>> {
    const path = `${this.basePath}/${req.url.pathname}`;
    const fileMTime = await fs.stat(path).then(stat => stat.mtime);

    const ifModifiedSinceHeader = new Date([...req.getHeader('if-modified-since') ?? ''].join('') as string);
    if (fileMTime <= ifModifiedSinceHeader) {
        log.debug('Sending', chalk.italic('use cache where possible'));
        req.status(304)
            .header('content-type', mime[req.url.pathname.split('.').pop()!] ?? 'text/plain')
            .header('cache-control', 'max-age=5184000000,public')
            .header('expires', new Date(Date.now() + 5_184_000_000).toISOString())
            .header('last-modified', fileMTime.toISOString());

        return iter.from([]);
    }

    log.debug(`Loading static resource: ${chalk.yellow(req.url.pathname)}`);
    req.status(200)
        .header('content-type', mime[req.url.pathname.split('.').pop()!] ?? 'text/plain')
        .header('cache-control', 'max-age=5184000000,public')
        .header('expires', new Date(Date.now() + 5_184_000_000).toISOString())
        .header('last-modified', fileMTime.toISOString());

    return fss.createReadStream(path);
}
