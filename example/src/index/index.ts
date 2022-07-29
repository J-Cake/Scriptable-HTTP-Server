/// <reference path="../../../def.d.ts" />
import cp from 'node:child_process';

export default function(req: HTTPRequest): AsyncIterable<string> {
    req.status(200);
    
    return cp.exec('ls -1').stdout!;
}
