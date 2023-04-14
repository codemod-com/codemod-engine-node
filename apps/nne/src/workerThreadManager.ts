import * as readline from 'node:readline';
import { Interface } from 'node:readline';
import { Worker } from 'node:worker_threads';
import { NewGroup } from './groups.js';
import { MainThreadMessage } from './mainThreadMessages.js';
import { FinishMessage, MessageKind, ProgressMessage } from './messages.js';
import { decodeWorkerThreadMessage } from './workerThreadMessages.js';

export class WorkerThreadManager {
	private __finished = false;
	private __idleWorkerIds: number[] = [];
	private __workers: Worker[] = [];
	private __totalFileCount: number;
	private readonly __interface: Interface;
	private readonly __lineHandler: (line: string) => void;

	public constructor(
		private readonly __workerCount: number,
		private readonly __filePaths: string[],
		private readonly __codemodFilePath: string | null,
		private readonly __newGroups: ReadonlyArray<NewGroup>,
		private readonly __outputDirectoryPath: string,
	) {
		this.__lineHandler = (line: string): void => {
			if (line === 'shutdown') {
				process.exit(0);
			}
		};

		process.stdin.unref();
		this.__interface = readline.createInterface(process.stdin);
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
			this.__filePaths.push(filePath);

			return;
		}

		this.__workers[id]?.postMessage({
			kind: 'recipe',
			codemodFilePath: this.__codemodFilePath,
			filePath,
			newGroups: this.__newGroups,
			outputDirectoryPath: this.__outputDirectoryPath,
		} satisfies MainThreadMessage);

		this.__work();
	}

	private __finish(): void {
		for (const worker of this.__workers) {
			worker.postMessage({ kind: 'exit' } satisfies MainThreadMessage);
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