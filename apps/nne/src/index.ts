import { isMainThread } from 'node:worker_threads';
import { executeMainThread } from './executeMainThread';
import { executeWorkerThread } from './executeWorkerThread';

if (!isMainThread) {
	executeWorkerThread();
} else {
	executeMainThread();
}
