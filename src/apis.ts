import Axios from 'axios';
import { type Input, parse, object, string, nullable } from 'valibot';

const X_INTUITA_ACCESS_TOKEN = 'X-Intuita-Access-Token'.toLocaleLowerCase();

const dataSchema = object({
	username: nullable(string()),
});

type Data = Input<typeof dataSchema>;

export const validateAccessToken = async (
	accessToken: string,
): Promise<Data> => {
	const response = await Axios.post(
		'https://telemetry.intuita.io/validateAccessToken',
		{},
		{
			headers: {
				[X_INTUITA_ACCESS_TOKEN]: accessToken,
			},
			timeout: 5000,
		},
	);

	return parse(dataSchema, response.data);
};