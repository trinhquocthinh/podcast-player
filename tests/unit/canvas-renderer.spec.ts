import { describe, it, expect, vi } from 'vitest';
import { wrapText } from '../../src/lib/features/bookmark/utils/canvas-renderer';

describe('canvas-renderer', () => {
	describe('wrapText', () => {
		it('should wrap text and return new Y position', () => {
			const mockFillText = vi.fn();

			const mockMeasureText = vi.fn().mockImplementation((text: string) => {
				// Each character is roughly 10px wide for our mock
				return { width: text.length * 10 };
			});

			const mockContext = {
				fillText: mockFillText,
				measureText: mockMeasureText
			} as unknown as CanvasRenderingContext2D;

			// "Hello World! This is a test." length is 28 chars = 280px.
			// If max width is 150px, it should wrap.
			// "Hello " (60) + "World! " (70) = 130
			// "This " (50) + "is " (30) + "a " (20) + "test. " (60)

			const newY = wrapText(
				mockContext,
				'Hello World! This is a test.',
				0, // x
				0, // y
				150, // max width
				30, // line height
				true
			);

			expect(mockFillText).toHaveBeenCalled();
			expect(newY).toBeGreaterThan(0);
		});

		it('should handle manual line breaks', () => {
			const mockFillText = vi.fn();
			const mockMeasureText = vi.fn().mockReturnValue({ width: 50 });

			const mockContext = {
				fillText: mockFillText,
				measureText: mockMeasureText
			} as unknown as CanvasRenderingContext2D;

			const newY = wrapText(mockContext, 'Line 1\nLine 2', 0, 0, 1000, 30, true);

			expect(mockFillText).toHaveBeenCalledTimes(2);
			expect(newY).toBe(60);
		});

		it('should not throw if text is empty', () => {
			const mockFillText = vi.fn();
			const mockContext = {
				fillText: mockFillText
			} as unknown as CanvasRenderingContext2D;

			const newY = wrapText(mockContext, '', 0, 0, 1000, 30, true);
			expect(newY).toBe(0);
			expect(mockFillText).not.toHaveBeenCalled();
		});
	});
});
