/// <reference path="../../../def.d.ts" />

export default async function*(req: HTTPRequest): AsyncGenerator<string> {
    yield "<html>";
    
    yield "Hi";
    
    yield "</html>";
}
