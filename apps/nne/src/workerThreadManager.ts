import * as readline from 'node:readline';
import { Worker } from 'node:worker_threads';
import { FinishMessage, MessageKind } from './messages';

export class WorkerThreadManager {
	private __finished = false;
	private __idleWorkerIds: number[] = [];
	private __workers: Worker[] = [];

	private __interface = readline.createInterface(process.stdin);

	private __lineHandler = (line: string): void => {
		if (line !== 'shutdown') {
			return;
		}

		process.exit(0);
	};

	public constructor(
		private readonly __workerCount: number,
		private readonly __filePaths: string[],
		private readonly __codemodFilePath: string | undefined,
		private readonly __newGroups: any[],
		private readonly __outputDirectoryPath: string,
	) {}

	public work(): void {
		if (this.__finished) {
			return;
		}

		const filePath = this.__filePaths.pop();

		if (filePath === undefined) {
			if (this.__idleWorkerIds.length === this.__workerCount) {
				this.__finished = true;

				this.__finish();
			}

			return;
		}

		const id = this.__idleWorkerIds.pop();

		if (id === undefined) {
			return;
		}

		this.__workers[id]?.postMessage({
			codemodFilePath: this.__codemodFilePath,
			filePath,
			newGroups: this.__newGroups,
			outputDirectoryPath: this.__outputDirectoryPath,
		});

		this.work();
	}

	private __finish(): void {
		for (const worker of this.__workers) {
			worker.postMessage('exit');
		}

		this.__interface.off('line', this.__lineHandler);

		const finishMessage: FinishMessage = {
			k: MessageKind.finish,
		};
		console.log(JSON.stringify(finishMessage));
	}
}
