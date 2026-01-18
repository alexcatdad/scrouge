import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify({
		status: 'healthy',
		timestamp: new Date().toISOString()
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
