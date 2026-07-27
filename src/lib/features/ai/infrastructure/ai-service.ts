import { settingsService } from '../../settings/infrastructure/settings-service';
import AiWorker from './ai.worker?worker';

export type ProgressCallback = (progress: unknown) => void;

class AiService {
	private worker: Worker | null = null;
	private pendingPromises: Map<
		string,
		{ resolve: (value?: unknown) => void; reject: (reason?: Error) => void }
	> = new Map();
	private messageId = 0;

	private getWorker(): Worker {
		if (!this.worker) {
			this.worker = new AiWorker();
			this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
		}
		return this.worker;
	}

	private handleWorkerMessage(event: MessageEvent) {
		const { type, id, result, error } = event.data;

		if (type === 'complete' && id !== undefined) {
			const promise = this.pendingPromises.get(id);
			if (promise) {
				promise.resolve(result);
				this.pendingPromises.delete(id);
			}
		} else if (type === 'error' && id !== undefined) {
			const promise = this.pendingPromises.get(id);
			if (promise) {
				promise.reject(new Error(error));
				this.pendingPromises.delete(id);
			}
		}
	}

	private async executeTask(type: string, data: Record<string, unknown>): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const id = String(this.messageId++);
			this.pendingPromises.set(id, { resolve, reject });
			this.getWorker().postMessage({ type, id, ...data });
		});
	}

	async transcribeSegment(audioUrl: string, startSec: number, endSec: number): Promise<string> {
		const isEnabled = await settingsService.isAiAssistEnabled();
		if (!isEnabled) throw new Error('AI Assist is disabled');

		const useCloud = await settingsService.isAiUseCloud();

		// 1. Fetch and decode audio segment
		const audioData = await this.extractAudioSegment(audioUrl, startSec, endSec);

		if (useCloud) {
			return this.transcribeCloud(audioData);
		} else {
			return this.executeTask('transcribe', { audioData }) as Promise<string>;
		}
	}

	async summarizeNotes(notes: string[]): Promise<string> {
		const isEnabled = await settingsService.isAiAssistEnabled();
		if (!isEnabled) throw new Error('AI Assist is disabled');

		const text = notes.join('\n\n');
		if (!text.trim()) return '';

		const useCloud = await settingsService.isAiUseCloud();

		if (useCloud) {
			return this.summarizeCloud(text);
		} else {
			return this.executeTask('summarize', { text }) as Promise<string>;
		}
	}

	private async extractAudioSegment(
		url: string,
		startSec: number,
		endSec: number
	): Promise<Float32Array> {
		// Note: decoding the whole audio file can use significant memory.
		// For MVP, we decode the whole file, then slice the Float32Array.
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();

		const audioCtx = new window.AudioContext({ sampleRate: 16000 }); // Whisper expects 16kHz
		const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

		const channelData = audioBuffer.getChannelData(0); // get mono channel

		const startSample = Math.floor(startSec * 16000);
		const endSample = Math.floor(endSec * 16000);

		// Ensure bounds
		const safeStart = Math.max(0, startSample);
		const safeEnd = Math.min(channelData.length, endSample);

		return channelData.slice(safeStart, safeEnd);
	}

	// Cloud Fallbacks using OpenAI
	private async transcribeCloud(pcmData: Float32Array): Promise<string> {
		const apiKey = await settingsService.getAiCloudApiKey();
		if (!apiKey) throw new Error('OpenAI API Key is missing');

		// Convert PCM to WAV Blob for OpenAI API
		const wavBlob = this.float32ToWav(pcmData, 16000);
		const formData = new FormData();
		formData.append('file', wavBlob, 'audio.wav');
		formData.append('model', 'whisper-1');

		const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}` },
			body: formData
		});

		if (!res.ok) {
			const error = await res.json();
			throw new Error(error.error?.message || 'Failed to transcribe via Cloud');
		}

		const data = await res.json();
		return data.text;
	}

	private async summarizeCloud(text: string): Promise<string> {
		const apiKey = await settingsService.getAiCloudApiKey();
		if (!apiKey) throw new Error('OpenAI API Key is missing');

		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant that summarizes podcast notes.' },
					{
						role: 'user',
						content: `Vui lòng tóm tắt các ghi chú sau một cách ngắn gọn, mạch lạc:\n\n${text}`
					}
				]
			})
		});

		if (!res.ok) {
			const error = await res.json();
			throw new Error(error.error?.message || 'Failed to summarize via Cloud');
		}

		const data = await res.json();
		return data.choices[0].message.content.trim();
	}

	private float32ToWav(pcmData: Float32Array, sampleRate: number): Blob {
		const buffer = new ArrayBuffer(44 + pcmData.length * 2);
		const view = new DataView(buffer);

		// RIFF chunk descriptor
		this.writeString(view, 0, 'RIFF');
		view.setUint32(4, 36 + pcmData.length * 2, true);
		this.writeString(view, 8, 'WAVE');
		// fmt sub-chunk
		this.writeString(view, 12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true); // PCM format
		view.setUint16(22, 1, true); // Mono channel
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, sampleRate * 2, true); // Byte rate
		view.setUint16(32, 2, true); // Block align
		view.setUint16(34, 16, true); // Bits per sample
		// data sub-chunk
		this.writeString(view, 36, 'data');
		view.setUint32(40, pcmData.length * 2, true);

		// Write PCM data
		let offset = 44;
		for (let i = 0; i < pcmData.length; i++, offset += 2) {
			const s = Math.max(-1, Math.min(1, pcmData[i]));
			view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
		}

		return new Blob([view], { type: 'audio/wav' });
	}

	private writeString(view: DataView, offset: number, string: string) {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}
}

export const aiService = new AiService();
