export type RunSettings =
	| Readonly<{
			dryRun: false;
	  }>
	| Readonly<{
			dryRun: true;
			outputDirectoryPath: string;
	  }>;
