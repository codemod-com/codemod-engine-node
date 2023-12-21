import Axios from 'axios';

const X_INTUITA_ACCESS_TOKEN = 'X-Intuita-Access-Token'.toLocaleLowerCase();

export const validateAccessToken = async (
	accessToken: string,
): Promise<boolean> => {
	try {
		const response = await Axios.post(
			'https://telemetry.intuita.io/validateAccessToken',
			{ requestFrom: 'VSCE' },
			{
				headers: {
					[X_INTUITA_ACCESS_TOKEN]: accessToken,
				},
				timeout: 5000,
			},
		);

		return response.status === 200;
	} catch (error) {
		if (!Axios.isAxiosError(error)) {
			console.error(error);
		}

		return false;
	}
};
