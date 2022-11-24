export const enum MessageKind {
	change = 1,
	finish = 2,
	rewrite = 3,
}

export type ChangeMessage = Readonly<{
	k: MessageKind.change; // kind
	p: string; // file path
	r: [number, number]; // range
	t: string; // text
	c: string; // codemod id
}>;

export type RewriteMessage = Readonly<{
	k: MessageKind.rewrite; // kind
	i: string; // (input) file path
	o: string; // output file path
	c: string;
}>;

export type FinishMessage = Readonly<{
	k: MessageKind.finish;
}>;

export type Message = ChangeMessage | FinishMessage;
