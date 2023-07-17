import Axios from 'axios';
import { stat, writeFile } from 'fs/promises';

const getModificationTime = async (path: string): Promise<number> => {
	try {
		const { mtimeMs } = await stat(path);

		return mtimeMs;
	} catch (error) {
		return 0;
	}
};

export const downloadFile = async (
	url: string,
	path: string,
): Promise<void> => {
	const localModificationTime = await getModificationTime(path);

	try {
		const headResponse = await Axios.head(url, { timeout: 5000 });

		const lastModified = headResponse?.headers['last-modified'] ?? null;

		const remoteModificationTime = lastModified
			? Date.parse(lastModified)
			: localModificationTime;

		if (localModificationTime >= remoteModificationTime) {
			return;
		}

		const getResponse = await Axios.get(url, {
			responseType: 'arraybuffer',
		});

		await writeFile(path, new Uint8Array(getResponse.data));
	} catch (error) {
		if (localModificationTime > 0) {
			return;
		}

		throw error;
	}
};
