export const enum MessageKind {
	change = 1,
	finish = 2,
	rewrite = 3,
	progress = 6,
	delete = 7,
	move = 8,
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

export type ProgressMessage = Readonly<{
	k: MessageKind.progress;
	p: number; // number of processed files
	t: number; // total number of files
}>;

export type DeleteMessage = Readonly<{
	k: MessageKind.delete;
	oldFilePath: string;
	modId: string;
}>;

export type MoveMessage = Readonly<{
	k: MessageKind.move;
	oldFilePath: string;
	newFilePath: string;
	modId: string;
}>;

export type Message = ChangeMessage | FinishMessage;
