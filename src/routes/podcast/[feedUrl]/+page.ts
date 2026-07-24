export const ssr = false;

export const load = ({ params }) => {
	return {
		feedUrl: params.feedUrl
	};
};
