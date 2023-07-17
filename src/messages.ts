export const enum MessageKind {
	finish = 2,
	rewrite = 3,
	progress = 6,
	delete = 7,
	move = 8,
	create = 9,
	copy = 10,
}

export type RewriteMessage = Readonly<{
	k: MessageKind.rewrite; // kind
	i: string; // (input) file path
	o: string; // output file path (newDataPath)
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

export type CreateMessage = Readonly<{
	k: MessageKind.create;
	newFilePath: string;
	newContentPath: string;
	modId: string;
}>;

export type CopyMessage = Readonly<{
	k: MessageKind.copy;
	oldFilePath: string;
	newFilePath: string;
	modId: string;
}>;

export type Message =
	| RewriteMessage
	| FinishMessage
	| ProgressMessage
	| DeleteMessage
	| MoveMessage
	| CreateMessage
	| CopyMessage;
