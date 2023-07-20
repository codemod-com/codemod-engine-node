import { executeMainThread } from './executeMainThread.js';

executeMainThread().catch((error) => {
	if (error instanceof Error) {
		console.error(JSON.stringify({ message: error.message }));
	}
});
