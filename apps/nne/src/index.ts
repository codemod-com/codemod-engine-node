import { isMainThread } from 'node:worker_threads';
import { executeMainThread } from './executeMainThread.js';
import { executeWorkerThread } from './executeWorkerThread.js';

if (!isMainThread) {
	executeWorkerThread();
} else {
	executeMainThread()
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		.then(() => {})
		.catch((error) => {
			if (error instanceof Error) {
				console.error(JSON.stringify({ message: error.message }));
			}
		});
}
