import { getQuickJS } from 'quickjs-emscripten';
import jscodeshift from '../dist/jscodeshift.txt';

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

const getQuickJsContext = async (
	codemodSource: string,
	getData: (path: string) => string,
	callback: (path: string, data: string) => void,
) => {
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

	const getDataFunction = context.newFunction('getData', (pathHandle) => {
		const path = context.getString(pathHandle);
		const data = getData(path);
		return context.newString(data);
	});

	const callbackHandle = context.newFunction(
		'__intuita_callback__',
		(pathHandle, sourceHandle) => {
			if (context.typeof(sourceHandle) !== 'string') {
				return;
			}

			const path = context.getString(pathHandle);
			const source = context.getString(sourceHandle);

			callback(path, source);
		},
	);

	context.setProp(context.global, '__intuita_get_data__', getDataFunction);
	context.setProp(context.global, '__intuita_callback__', callbackHandle);

	const execute = (path: string, data: string) => {
		context.setProp(
			context.global,
			'__INTUITA__PATH__',
			context.newString(path),
		);

		const result = context.evalCode(`
            import { buildApi } from '__intuita__jscodeshift__';
            import transform from '__intuita_codemod__';
        
            const source = __intuita_get_data__(__INTUITA__PATH__);
        
            const file = {
                path: __INTUITA__PATH__,
                source,
            }
        
            const api = buildApi('tsx');
        
            const result = transform(file, api);
        
            __intuita_callback__(__INTUITA__PATH__, result);
        `);
	};

	return {
		execute,
	};
};
