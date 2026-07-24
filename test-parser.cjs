const Parser = require('rss-parser');
const parser = new Parser({
	customFields: {
		item: [
			['itunes:image', 'itunesImage']
		]
	}
});
parser.parseURL('https://anchor.fm/s/326d676c/podcast/rss').then(feed => {
	console.log('Episode image candidates:');
	const item = feed.items[0];
	console.log('item.itunesImage:', item.itunesImage);
	console.log('item.itunes:', item.itunes);
});
