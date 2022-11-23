export const enum MessageKind {
    change = 1,
    finish = 2,
}

export type ChangeMessage = Readonly<{
    k: MessageKind.change,
    p: string,
    r: [number, number],
    t: string,
}>;

export type Message = 
ChangeMessage
| Readonly<{
    k: MessageKind.finish,
}>;