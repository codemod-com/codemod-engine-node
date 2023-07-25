import { Worker } from 'node:worker_threads';
import { MainThreadMessage } from './mainThreadMessages.js';
import { ProgressMessage } from './messages.js';
import { decodeWorkerThreadMessage } from './workerThreadMessages.js';
import { Printer } from './printer.js';

const WORKER_THREAD_TIME_LIMIT = 10000;

export class WorkerThreadManager {
	private __finished = false;
	private __idleWorkerIds: number[] = [];
	private __workers: Worker[] = [];
	private __workerTimestamps: number[] = [];
	private __totalFileCount: number;
	private readonly __interval: NodeJS.Timeout;

	public constructor(
		private readonly __printer: Printer,
		private readonly __workerCount: number,
		private readonly __filePaths: string[],
		private readonly __codemodFilePath: string | null,
		private readonly __outputDirectoryPath: string,
		private readonly __codemodHashDigests: ReadonlyArray<string>,
		private readonly __executionId: string,
		private readonly __formatWithPrettier: boolean,
	) {
		this.__totalFileCount = __filePaths.length;

		for (let i = 0; i < __workerCount; ++i) {
			this.__idleWorkerIds.push(i);
			this.__workerTimestamps.push(Date.now());

			const worker = new Worker(__filename);

			worker.on('message', this.__buildOnWorkerMessage(i));

			this.__workers.push(worker);
		}

		const progressMessage: ProgressMessage = {
			kind: 'progress',
			processedFileNumber: 0,
			totalFileNumber: this.__totalFileCount,
		};

		console.log(JSON.stringify(progressMessage));

		this.__work();

		this.__interval = setInterval(() => {
			const now = Date.now();

			for (let i = 0; i < __workerCount; ++i) {
				const timestamp = this.__workerTimestamps[i] ?? Date.now();

				if (now > timestamp + WORKER_THREAD_TIME_LIMIT) {
					// hanging promise on purpose
					this.__workers[i].terminate();

					const worker = new Worker(__filename);
					worker.on('message', this.__buildOnWorkerMessage(i));

					this.__workers[i] = worker;

					this.__idleWorkerIds.push(i);

					this.__workerTimestamps[i] = Date.now();
				}
			}
		}, 1000);
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
			codemodHashDigests: this.__codemodHashDigests,
			outputDirectoryPath: this.__outputDirectoryPath,
			executionId: this.__executionId,
			formatWithPrettier: this.__formatWithPrettier,
		} satisfies MainThreadMessage);

		this.__workerTimestamps[id] = Date.now();

		this.__work();
	}

	private __finish(): void {
		clearInterval(this.__interval);

		for (const worker of this.__workers) {
			worker.postMessage({ kind: 'exit' } satisfies MainThreadMessage);
		}

		this.__printer.log({
			kind: 'finish',
		});
	}

	private __buildOnWorkerMessage(i: number) {
		return (m: unknown): void => {
			const workerThreadMessage = decodeWorkerThreadMessage(m);

			if (workerThreadMessage.kind === 'idleness') {
				const progressMessage: ProgressMessage = {
					kind: 'progress',
					processedFileNumber:
						this.__totalFileCount - this.__filePaths.length,
					totalFileNumber: this.__totalFileCount,
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
