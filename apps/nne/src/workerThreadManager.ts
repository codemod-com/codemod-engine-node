import * as readline from 'node:readline';
import { Worker } from 'node:worker_threads';
import { FinishMessage, MessageKind, ProgressMessage } from './messages';
import { decodeWorkerThreadMessage } from './workerThreadMessages';

export class WorkerThreadManager {
	private __finished = false;
	private __idleWorkerIds: number[] = [];
	private __workers: Worker[] = [];
	private __totalFileCount: number;

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
		private readonly __newGroups: ReadonlyArray<any>,
		private readonly __outputDirectoryPath: string | undefined,
	) {
		this.__interface.on('line', this.__lineHandler);

		this.__totalFileCount = __filePaths.length;

		for (let i = 0; i < __workerCount; ++i) {
			this.__idleWorkerIds.push(i);

			const worker = new Worker(__filename);

			worker.on('message', this.__buildOnWorkerMessage(i));

			this.__workers.push(worker);
		}

		const progressMessage: ProgressMessage = {
			k: MessageKind.progress,
			p: 0,
			t: this.__totalFileCount,
		};

		console.log(JSON.stringify(progressMessage));

		this.__work();
	}

	private __work(): void {
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

		this.__work();
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

	private __buildOnWorkerMessage(i: number) {
		return (m: unknown): void => {
			const workerThreadMessage = decodeWorkerThreadMessage(m);

			if (workerThreadMessage.kind === 'idleness') {
				const progressMessage: ProgressMessage = {
					k: MessageKind.progress,
					p: this.__totalFileCount - this.__filePaths.length,
					t: this.__totalFileCount,
				};

				console.log(JSON.stringify(progressMessage));

				this.__idleWorkerIds.push(i);
				this.__work();
			}

			if (workerThreadMessage.kind === 'message') {
				console.log(JSON.stringify(workerThreadMessage.message));
			}
		};
	}
}
