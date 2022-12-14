import chalk from 'chalk';
import State from '@j-cake/jcake-utils/state';
import { iterSync } from '@j-cake/jcake-utils/iter';
import * as Format from '@j-cake/jcake-utils/args';

import log from './log.js';
import type { HTTPHandler } from './handler.js';

type LogLevel = keyof typeof log;

export interface ArgV {
    logLevel: LogLevel,
    port: number,
    roots: string[],
    static: string[],
    devMode: boolean,
    errors: {
        404: string
    }
}

export const config: State<ArgV> = new State({
    logLevel: 'request' as LogLevel,
    port: 80,
    roots: [] as string[],
    static: [] as string[],
    devMode: false,
    errors: {
        404: ""
    }
});

export declare type Nullable<T> = T | null | undefined;

export default async function main(argv: string[]): Promise<boolean> {
    const logLevel = Format.oneOf(Object.keys(log) as LogLevel[], false);

    for (const { current: i, skip: next } of iterSync.peekable(argv))
        if (i == '--log-level')
            config.setState({ logLevel: logLevel(next()) });

        else if (i == '--404')
            config.setState(prev => ({
                errors: {
                    404: next()
                }
            }));
        
        else if (i == '--dev')
            config.setState({ devMode: true });
            
        else if (i == '--port' || i == '-p')
            config.setState({ port: Number(next()) });

        else if (i == '--static' || i == '-s')
            config.setState(prev => ({ static: [...prev.static, next()] }));

        else
            config.setState(prev => ({ roots: [...prev.roots, i as string] }));
    
    if (config.get().devMode)
        log.verbose(`Dev Mode`);

    const { default: Server } = await import('./server.js');
    return await Server(config.get().port);
}
