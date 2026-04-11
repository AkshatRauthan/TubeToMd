import {
  createYouTubeSessionSchema,
  initUploadSessionSchema,
} from '../session.validator';
import { generateNotesSchema } from '../notes.validator';
import { sendChatMessageSchema } from '../chat.validator';

describe('Zod Validators', () => {
  describe('Session Validators', () => {
    it('validates a correct youtube URL', () => {
      const result = createYouTubeSessionSchema.safeParse({
        videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid youtube URL', () => {
      const result = createYouTubeSessionSchema.safeParse({
        videoUrl: 'https://not-youtube.com/watch?v=dQw4w9WgXcQ'
      });
      expect(result.success).toBe(false);
    });

    it('validates a correct init file upload body', () => {
      const result = initUploadSessionSchema.safeParse({
        filename: 'lecture.mp4',
        totalChunks: 10
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Notes Validators', () => {
    it('validates a correct generate notes payload', () => {
      const result = generateNotesSchema.safeParse({
        type: 'summary',
        persona: 'academic',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid noteType', () => {
      const result = generateNotesSchema.safeParse({
        type: 'invalid_type',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Chat Validators', () => {
    it('validates a proper user message', () => {
      const result = sendChatMessageSchema.safeParse({
        message: 'What was the main topic?',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an empty message', () => {
      const result = sendChatMessageSchema.safeParse({
        message: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
