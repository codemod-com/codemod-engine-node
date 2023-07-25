import Axios from 'axios';
import { readFile, writeFile } from 'fs/promises';

export const downloadFile = async (
	url: string,
	path: string,
	cache: boolean,
): Promise<Buffer> => {
	if (cache) {
		return readFile(path);
	}

	const getResponse = await Axios.get(url, {
		responseType: 'arraybuffer',
	});

	const buffer = Buffer.from(getResponse.data);

	await writeFile(path, buffer);

	return buffer;
};
