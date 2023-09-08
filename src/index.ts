#!/usr/bin/env node
import { isMainThread } from 'worker_threads';
import { executeMainThread } from './executeMainThread.js';
import { executeWorkerThread } from './executeWorkerThread.js';

if (isMainThread) {
	executeMainThread().catch((error) => {
		if (error instanceof Error) {
			console.error(JSON.stringify({ message: error.message }));
		}
	});
} else {
	executeWorkerThread();
}
