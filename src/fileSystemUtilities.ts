import Axios from 'axios';
import { readFile, stat, writeFile } from 'fs/promises';

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
): Promise<Buffer> => {
	console.log(url, path);

	const localModificationTime = await getModificationTime(path);

	const headResponse = await Axios.head(url, { timeout: 5000 });

	const lastModified = headResponse?.headers['last-modified'] ?? null;

	const remoteModificationTime = lastModified
		? Date.parse(lastModified)
		: localModificationTime;

	if (localModificationTime >= remoteModificationTime) {
		return readFile(path);
	}

	const getResponse = await Axios.get(url, {
		responseType: 'arraybuffer',
	});

	const buffer = Buffer.from(getResponse.data);

	await writeFile(path, buffer);

	return buffer;
};
