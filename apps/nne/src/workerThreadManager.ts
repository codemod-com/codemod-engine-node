import { Worker } from 'node:worker_threads';

export class WorkerThreadManager {
	private __finished = false;
	private __idleWorkerIds: number[] = [];
	private __workers: Worker[] = [];

	public constructor(
		private readonly __workerCount: number,
		private readonly __filePaths: string[],
		private readonly __codemodFilePath: string | undefined,
		private readonly __newGroups: any[],
		private readonly __outputDirectoryPath: string,
	) {}

	public work() {
		if (this.__finished) {
			return;
		}

		const filePath = this.__filePaths.pop();

		if (filePath === undefined) {
			if (this.__idleWorkerIds.length === this.__workerCount) {
				this.__finished = true;
				finish();
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
}
