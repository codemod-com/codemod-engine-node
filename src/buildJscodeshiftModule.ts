import jscodeshift, { type API } from 'jscodeshift';

export const buildApi = (parser: string): API => ({
	j: jscodeshift.withParser(parser),
	jscodeshift: jscodeshift.withParser(parser),
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	stats: () => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	report: () => {},
});
