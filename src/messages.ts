export type RewriteMessage = Readonly<{
	kind: 'rewrite';
	oldPath: string;
	newDataPath: string;
}>;

export type FinishMessage = Readonly<{
	kind: 'finish';
}>;

export type ProgressMessage = Readonly<{
	kind: 'progress';
	processedFileNumber: number;
	totalFileNumber: number;
}>;

export type DeleteMessage = Readonly<{
	kind: 'delete';
	oldFilePath: string;
}>;

export type MoveMessage = Readonly<{
	kind: 'move';
	oldFilePath: string;
	newFilePath: string;
}>;

export type CreateMessage = Readonly<{
	kind: 'create';
	newFilePath: string;
	newContentPath: string;
}>;

export type CopyMessage = Readonly<{
	kind: 'copy';
	oldFilePath: string;
	newFilePath: string;
}>;

export type Message =
	| RewriteMessage
	| FinishMessage
	| ProgressMessage
	| DeleteMessage
	| MoveMessage
	| CreateMessage
	| CopyMessage;
