import { isMainThread } from 'node:worker_threads';
import { executeMainThread } from './executeMainThread.js';
import { executeWorkerThread } from './executeWorkerThread.js';

if (!isMainThread) {
	executeWorkerThread();
} else {
	try {
		await executeMainThread();
	} catch (error) {
		if (error instanceof Error) {
			console.error(JSON.stringify({ message: error.message }));
		}
	}
}
