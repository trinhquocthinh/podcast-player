import { http, HttpResponse } from 'msw';

export const handlers = [
	// Mock RSS feed fetch endpoint directly from external source
	http.get('https://example.com/rss', () => {
		return HttpResponse.xml(`
				<?xml version="1.0" encoding="UTF-8"?>
				<rss version="2.0">
					<channel>
						<title>Test Podcast</title>
						<description>This is a test podcast</description>
						<item>
							<title>Episode 1</title>
							<enclosure url="https://example.com/ep1.mp3" length="1024" type="audio/mpeg"/>
							<pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
						</item>
					</channel>
				</rss>
			`);
	})
];
