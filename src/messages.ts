export const enum MessageKind {
    change = 1,
    finish = 2,
}

export type ChangeMessage = Readonly<{
    k: MessageKind.change, // kind
    p: string, // file path
    r: [number, number], // range
    t: string, // text
    c: string, // codemod id
}>;

export type FinishMessage = Readonly<{
    k: MessageKind.finish,
}>;

export type Message = 
| ChangeMessage
| FinishMessage;