import util from 'node:util';
import chalk from 'chalk';

import {config} from './index.js';

export const stripAnsi = (str: string): string => str.replace(/[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[\dA-ORZcf-nqry=><]/g, '');
export const centre = (text: string, width: number) => {
    const colourless = stripAnsi(text);
//     const colourless = text.replace(/[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[\dA-ORZcf-nqry=><]/g, '');
    const pad = Math.floor((width - colourless.length) / 2);
    return `${' '.repeat(pad)}${text}${' '.repeat(pad)}`;
}
export function stdout(tag: string, ...msg: any[]): void {
    const log = msg
        .map(i => ['string', 'number', 'bigint', 'boolean'].includes(typeof i) ? i : util.inspect(i, false, null, true))
        .join(' ')
        .split('\n')
        .map((i, a) => `${a ? centre('\u2502', len(tag)) : tag} ${i}\n`);
        
    for (const i of log)
        process.stdout.write(i);
}

export function stderr(tag: string, ...msg: any[]): void {
    const log = msg
            .map(i => ['string', 'number', 'bigint', 'boolean'].includes(typeof i) ? i : util.inspect(i, false, null, true))
            .join(' ')
            .split('\n')
            .map((i, a) => `${a ? centre('\u2502', stripAnsi(tag).length) : tag} ${i}\n`);
            
            for (const i of log)
                process.stderr.write(i);
}

export default {
    err: (...arg: any[]) => void     (['err', 'info', 'request', 'verbose', 'debug'].includes(config.get().logLevel) && stderr(chalk.grey(`[${chalk.red('Error')}]`), ...arg)),
    info: (...arg: any[]) => void    (['info', 'request', 'verbose', 'debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.blue('Info')}]`), ...arg)),
    request: (...arg: any[]) => void    (['request', 'verbose', 'debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.magenta('Request')}]`), ...arg)),
    verbose: (...arg: any[]) => void (['verbose', 'debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.yellow('Verbose')}]`), ...arg)),
    debug: (...arg: any[]) => void   (['debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.cyan('Debug')}]`), ...arg))
}
