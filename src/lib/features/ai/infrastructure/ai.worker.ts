import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we use the CDN for transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
	static whisperTask = 'automatic-speech-recognition';
	static whisperModel = 'Xenova/whisper-tiny';
	static whisperInstance: unknown = null;

	static summaryTask = 'summarization';
	static summaryModel = 'Xenova/distilbart-cnn-6-6';
	static summaryInstance: unknown = null;

	static async getWhisperInstance(progress_callback: (progress: unknown) => void) {
		if (this.whisperInstance === null) {
			this.whisperInstance = pipeline(
				this.whisperTask as unknown as Parameters<typeof pipeline>[0],
				this.whisperModel,
				{ progress_callback }
			);
		}
		return this.whisperInstance;
	}

	static async getSummaryInstance(progress_callback: (progress: unknown) => void) {
		if (this.summaryInstance === null) {
			this.summaryInstance = pipeline(
				this.summaryTask as unknown as Parameters<typeof pipeline>[0],
				this.summaryModel,
				{ progress_callback }
			);
		}
		return this.summaryInstance;
	}
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
	const { type, id, ...data } = event.data;

	try {
		if (type === 'init_whisper') {
			await PipelineSingleton.getWhisperInstance((x: unknown) => {
				self.postMessage({ type: 'progress', task: 'whisper', progress: x });
			});
			self.postMessage({ type: 'ready', task: 'whisper' });
		} else if (type === 'init_summary') {
			await PipelineSingleton.getSummaryInstance((x: unknown) => {
				self.postMessage({ type: 'progress', task: 'summary', progress: x });
			});
			self.postMessage({ type: 'ready', task: 'summary' });
		} else if (type === 'transcribe') {
			const { audioData } = data; // Float32Array
			const transcriber = (await PipelineSingleton.getWhisperInstance(() => {})) as (
				audio: Float32Array,
				opts: unknown
			) => Promise<{ text: string }>;
			const output = await transcriber(audioData, {
				chunk_length_s: 30,
				stride_length_s: 5,
				language: 'vietnamese',
				task: 'transcribe'
			});
			self.postMessage({ type: 'complete', id, result: output.text });
		} else if (type === 'summarize') {
			const { text } = data;
			const summarizer = (await PipelineSingleton.getSummaryInstance(() => {})) as (
				text: string,
				opts: unknown
			) => Promise<Array<{ summary_text: string }>>;
			const output = await summarizer(text, {
				max_new_tokens: 150,
				min_new_tokens: 30
			});
			self.postMessage({ type: 'complete', id, result: output[0].summary_text });
		}
	} catch (error: unknown) {
		self.postMessage({ type: 'error', id, error: (error as Error).message });
	}
});
