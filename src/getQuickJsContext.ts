import { getQuickJS } from 'quickjs-emscripten';
import jscodeshift from '../dist/jscodeshift.txt';
import EventEmitter from 'node:events';

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
import transform from '__intuita_codemod__';
    
const file = {
    path: __INTUITA__PATH__,
    source: __INTUITA__DATA__,
}

const api = buildApi('tsx');

const result = transform(file, api);

__intuita_callback__(result);
`;

const getQuickJsContext = async (codemodSource: string) => {
	const qjs = await getQuickJS();

	const runtime = qjs.newRuntime();

	runtime.setMaxStackSize(1024 * 320);

	runtime.setModuleLoader((moduleName) => {
		if (moduleName === '__intuita__jscodeshift__') {
			return (
				`const require = ${requireFunction.toString()}\n` + jscodeshift
			);
		}

		if (moduleName === '__intuita_codemod__') {
			return codemodSource;
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

	const execute = (path: string, data: string) => {
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

		return new Promise((resolve, reject) => {
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
