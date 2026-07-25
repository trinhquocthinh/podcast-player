import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const targetUrl = url.searchParams.get('url');

	if (!targetUrl) {
		throw error(400, 'Missing url parameter');
	}

	try {
		// Dùng fetch nội bộ của SvelteKit (chạy trên server) để bỏ qua CORS của trình duyệt
		const response = await fetch(targetUrl, {
			headers: {
				// Giả mạo User-Agent để tránh bị một số CDN block (nếu cần)
				'User-Agent': 'FocusCast-Server/1.0',
				Accept: '*/*'
			}
		});

		if (!response.ok) {
			throw error(response.status, `Lỗi khi tải từ nguồn: ${response.statusText}`);
		}

		// Tạo Headers mới để trả về client
		const responseHeaders = new Headers();

		// Giữ nguyên Content-Type
		const contentType = response.headers.get('Content-Type');
		if (contentType) responseHeaders.set('Content-Type', contentType);

		// Giữ nguyên Content-Length để client tính % tiến trình
		const contentLength = response.headers.get('Content-Length');
		if (contentLength) responseHeaders.set('Content-Length', contentLength);

		// Trả stream thẳng về client
		return new Response(response.body, {
			status: response.status,
			headers: responseHeaders
		});
	} catch (err) {
		const parsedErr = err as Error;
		console.error('Proxy download error:', parsedErr);
		throw error(500, parsedErr.message || 'Lỗi hệ thống khi tải file');
	}
};
