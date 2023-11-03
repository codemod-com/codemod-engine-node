import type { IFs } from 'memfs';
import type { TDataOut } from 'memfs/lib/encoding.js';

const CACHE_EVICTION_THRESHOLD = 24 * 60 * 60 * 1000;

const toBuffer = (tDataOut: TDataOut): Buffer => {
	if (typeof tDataOut === 'string') {
		return Buffer.from(tDataOut);
	}
	return tDataOut;
};

export type FileDownloadServiceBlueprint = Readonly<{
	download(url: string, path: string): Promise<Buffer>;
}>;

export class FileDownloadService implements FileDownloadServiceBlueprint {
	public constructor(
		protected readonly _cacheUsed: boolean,
		protected readonly _fetchBuffer: (url: string) => Promise<Buffer>,
		protected readonly _getNow: () => number,
		protected readonly _ifs: IFs,
	) {}

	public async download(url: string, path: string): Promise<Buffer> {
		if (this._cacheUsed) {
			try {
				const stats = await this._ifs.promises.stat(path);

				const mtime = stats.mtime.getTime();

				const now = this._getNow();

				console.log(now, mtime);

				if (now - mtime < CACHE_EVICTION_THRESHOLD) {
					const tDataOut = await this._ifs.promises.readFile(path);

					return toBuffer(tDataOut);
				}
			} catch (error) {
				/* empty */
			}
		}

		const buffer = await this._fetchBuffer(url);

		await this._ifs.promises.writeFile(path, buffer);

		return buffer;
	}
}
