import { newQuickJSWASMModule } from 'quickjs-emscripten';
import jscodeshift from '../dist/jscodeshift.txt';
import EventEmitter from 'node:events';
import { SafeArgumentRecord } from './safeArgumentRecord.js';

const requireFunction = (module: unknown) => {
	if (typeof module !== 'string') {
		throw new Error('Module name must be a string');
	}

	if (module === 'assert') {
		return {
			ok: () => true,
			strictEqual: () => true,
			deepEqual: () => true,
		};
	}

	if (module === 'os') {
		return {
			EOL: '\n',
		};
	}

	if (module === 'fs') {
		return {};
	}

	throw new Error('Requested ' + module);
};

const CODE = `
import { buildApi } from '__intuita__jscodeshift__';
import { __intuita_transform__ } from '__intuita_codemod__';
    
const file = {
    path: __INTUITA__PATH__,
    source: __INTUITA__DATA__,
}

const api = buildApi('tsx');

const options = JSON.parse(__INTUITA_ARGUMENTS__);

const result = __intuita_transform__(file, api, options);

__intuita_callback__(result);
`;

export const getQuickJsContext = async (
	codemodSource: string,
	safeArgumentRecord: SafeArgumentRecord,
) => {
	const qjs = await newQuickJSWASMModule();

	const runtime = qjs.newRuntime();

	runtime.setMaxStackSize(1024 * 320);

	runtime.setModuleLoader((moduleName) => {
		if (moduleName === '__intuita__jscodeshift__') {
			return (
				`const require = ${requireFunction.toString()}\n` + jscodeshift
			);
		}

		if (moduleName === '__intuita_codemod__') {
			return `
                const exports = {};
                const module = {
                    exports,
                };

                ${codemodSource}

                const __intuita_transform__ = typeof module.exports === 'function'
                    ? module.exports
                    : module.exports.__esModule &&
                    typeof module.exports.default === 'function'
                    ? module.exports.default
                    : null;

                export { __intuita_transform__ };
                `;
		}

		throw new Error('Requested ' + module);
	});

	const context = runtime.newContext();

	const eventEmitter = new EventEmitter();

	const callbackHandle = context.newFunction(
		'__intuita_callback__',
		(dataHandle) => {
			if (context.typeof(dataHandle) !== 'string') {
				eventEmitter.emit('callback', null);
				return;
			}

			const data = context.getString(dataHandle);

			eventEmitter.emit('callback', data);
		},
	);

	context.setProp(context.global, '__intuita_callback__', callbackHandle);
	context.setProp(
		context.global,
		'__INTUITA_ARGUMENTS__',
		context.newString(JSON.stringify(safeArgumentRecord[0])),
	);

	const execute = (path: string, data: string): Promise<string | null> => {
		// TODO ensure no one else runs it
		context.setProp(
			context.global,
			'__INTUITA__PATH__',
			context.newString(path),
		);

		context.setProp(
			context.global,
			'__INTUITA__DATA__',
			context.newString(data),
		);

		return new Promise<string | null>((resolve, reject) => {
			// TODO timeout
			eventEmitter.once('callback', (data) => {
				resolve(data);
			});

			try {
				const result = context.evalCode(CODE);

				context.unwrapResult(result).dispose();
			} catch (error) {
				reject(error);
			}
		});
	};

	return {
		execute,
	};
};
