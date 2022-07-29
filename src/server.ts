import http from 'node:http';
import urllib from 'node:url';
import stream from 'node:stream';
import chalk from 'chalk';

import log, {stripAnsi} from './log.js';
import resolveHandler from './handler.js';

export default function Serve(port: number): Promise<boolean> {
    return new Promise<boolean>(async function(ok, error) {
        const server = http.createServer(async function(req: http.IncomingMessage, res: http.ServerResponse) {
            const url = new urllib.URL(req.url ?? '/', `http://localhost:${port}`);
            
            res.on('finish', function() {
                const method = (method?: string): string => {
                    if (!method)
                        return '';
                    const colours: Record<string, (text: string) => string> = {
                        GET: chalk.green,
                        POST: chalk.blue,
                        PUT: chalk.blue,
                        DELETE: chalk.red,
                        OPTIONS: chalk.grey,
                        HEAD: chalk.whiteBright,
                    }

                    if (method.toUpperCase() in colours)
                        return colours[method](method)
                    else
                        return chalk.bgGrey(method);
                }

                const status = (status: number): string => {
                    const codes: Record<number, (text: string) => string> = [
                        chalk.grey,
                        chalk.green,
                        chalk.whiteBright,
                        chalk.yellow,
                        chalk.red,
                    ];

                    return codes[Math.floor(status / 100) - 1](status.toString()) ?? chalk.bgGrey(status.toString());
                }

                log.request(chalk.whiteBright(`${new Date().toLocaleString()} - ?.?.?.?`), method(req.method?.toUpperCase()), chalk.yellow(url.pathname), status(res.statusCode));
            });

            const handler = await resolveHandler(url.pathname ?? '/')
                .catch((err: { code: number, err: string }) => {
                    log.err(err);
                    res.writeHead(err.code ?? 404, { 'content-type': 'text/plain' });
                    res.end(stripAnsi(err.err ?? ''));
                });

            if (!handler)
                return;

            let handlerInstance: any;
            stream.Readable.from(handler.default(handlerInstance = {
                getHeader: (header: string) => Object.entries(req.headers).find(([a]) => a.toLowerCase() == header.toLowerCase())?.[1] ?? '',
                url,
                header: (name: string, ...values: string[]) => res.setHeader(name, values.join(';')) && handlerInstance,
                status: (status: number) => res.writeHead(status) && handlerInstance,
                method: req.method!,
                request: () => req
            })).pipe(res);
        });

        server.listen(port, () => log.info(`Server listening on port ${chalk.yellow(port)}`));

        server.on('close', () => ok(true));
        server.on('error', err => error(err))
    });
}
