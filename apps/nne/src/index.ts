import { isMainThread } from 'node:worker_threads';
import { executeMainThread } from './executeMainThread';
import { executeWorkerThread } from './executeWorkerThread';

if (!isMainThread) {
	executeWorkerThread();
} else {
	executeMainThread()
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		.then(() => {})
		.catch((error) => {
			console.error(error);
		});
}
