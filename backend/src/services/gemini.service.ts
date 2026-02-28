import geminiKeyManager from '@services/geminiKeyManager.service';
import { ITranscriptSegment } from '@models/session.model';
import { NoteType } from '@models/note.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

/**
 * Helper to parse and handle Gemini API errors with user-friendly messages
 */
function handleGeminiError(error: any, operation: string): never {
    const errMsg = error?.message || String(error);
    console.error(`[GeminiService] ${operation} failed:`, errMsg);

    // Quota/rate limit errors — propagate with special flag for key manager
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate limit') || errMsg.includes('Too Many Requests')) {
        throw new CustomError(
            'AI service rate limit reached. Please wait a moment and try again.',
            StatusCodes.TOO_MANY_REQUESTS
        );
    }

    // Auth errors
    if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API key')) {
        throw new CustomError(
            'AI service authentication error. Please contact support.',
            StatusCodes.SERVICE_UNAVAILABLE
        );
    }

    // Network errors
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT') || errMsg.includes('network')) {
        throw new CustomError(
            'Unable to reach AI service. Please check your connection and try again.',
            StatusCodes.SERVICE_UNAVAILABLE
        );
    }

    // Generic fallback
    throw new CustomError(
        `Failed to ${operation}. Please try again later.`,
        StatusCodes.INTERNAL_SERVER_ERROR
    );
}

// Persona prompt modifiers
const PERSONA_PROMPTS: Record<string, string> = {
    detailed:
        'Create comprehensive, detailed notes covering every key point, example, code block, and concept discussed. Use headers, sub-headers, bullet points, and code blocks.',
    executive:
        'Create a high-level executive summary. Focus on key takeaways, main themes, and actionable insights. Keep it concise but informative.',
    eli5:
        'Explain everything as if talking to a 5-year-old. Use simple language, analogies, and relatable examples. Avoid jargon.',
    'code-heavy':
        'Focus heavily on code examples, technical implementations, and programming concepts. Include code blocks with syntax highlighting.',
    actionable:
        'Focus on actionable steps, to-do items, and practical takeaways. Format as a checklist or step-by-step guide.',
    academic:
        'Create academic-style notes with formal language, structured arguments, and references to concepts. Use proper academic formatting.',
    custom: '', // Will use user's custom prompt
};

class GeminiService {
    /**
     * Call Gemini with automatic key rotation.
     * If the current key hits rate-limit, it marks it exhausted
     * and retries with the next available key.
     */
    private async callGemini(prompt: string, operation: string): Promise<string> {
        const maxRetries = geminiKeyManager.getStatus().total;
        let lastError: any;

        for (let attempt = 0; attempt < Math.max(maxRetries, 1); attempt++) {
            const { model, keyRef } = geminiKeyManager.getFlashModel();
            try {
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (error: any) {
                lastError = error;
                const errMsg = String(error?.message || error);

                // Rate limit / quota error — mark key as exhausted and try next
                if (
                    errMsg.includes('429') ||
                    errMsg.includes('quota') ||
                    errMsg.includes('rate limit') ||
                    errMsg.includes('Too Many Requests') ||
                    errMsg.includes('RESOURCE_EXHAUSTED')
                ) {
                    console.warn(`[GeminiService] Key "${keyRef.label}" hit rate limit on attempt ${attempt + 1}, rotating...`);
                    geminiKeyManager.markExhausted(keyRef, error);
                    continue; // try next key
                }

                // Non-retryable error — throw immediately
                handleGeminiError(error, operation);
            }
        }

        // All keys exhausted
        handleGeminiError(lastError, operation);
    }

    /**
     * Call Gemini embeddings with automatic key rotation.
     */
    private async callEmbedding(text: string): Promise<number[]> {
        const maxRetries = geminiKeyManager.getStatus().total;
        let lastError: any;

        for (let attempt = 0; attempt < Math.max(maxRetries, 1); attempt++) {
            const { model, keyRef } = geminiKeyManager.getEmbeddingModel();
            try {
                const result = await model.embedContent(text);
                return result.embedding.values;
            } catch (error: any) {
                lastError = error;
                const errMsg = String(error?.message || error);

                if (
                    errMsg.includes('429') ||
                    errMsg.includes('quota') ||
                    errMsg.includes('rate limit') ||
                    errMsg.includes('Too Many Requests') ||
                    errMsg.includes('RESOURCE_EXHAUSTED')
                ) {
                    console.warn(`[GeminiService] Embedding key "${keyRef.label}" hit rate limit, rotating...`);
                    geminiKeyManager.markExhausted(keyRef, error);
                    continue;
                }

                handleGeminiError(error, 'generate embedding');
            }
        }

        handleGeminiError(lastError, 'generate embedding');
    }

    /**
     * Generate notes/summary based on type and persona
     */
    async generateNotes(
        transcript: ITranscriptSegment[],
        type: NoteType,
        options: {
            persona?: string;
            topic?: string;
            startTimestamp?: number;
            endTimestamp?: number;
            customPrompt?: string;
            videoTitle?: string;
        } = {}
    ): Promise<{ content: string; mermaidCode?: string; title: string }> {
        // Filter transcript by time range if specified
        let filteredTranscript = transcript;
        if (options.startTimestamp !== undefined || options.endTimestamp !== undefined) {
            filteredTranscript = transcript.filter((seg) => {
                const start = options.startTimestamp ?? 0;
                const end = options.endTimestamp ?? Infinity;
                return seg.start >= start && seg.start <= end;
            });
        }

        // Build transcript text with timestamps
        const transcriptText = filteredTranscript
            .map((seg) => {
                const mins = Math.floor(seg.start / 60);
                const secs = Math.floor(seg.start % 60);
                return `[${mins}:${secs.toString().padStart(2, '0')}] ${seg.text}`;
            })
            .join('\n');

        const prompt = this.buildPrompt(type, transcriptText, options);

        let text: string;
        try {
            text = await this.callGemini(prompt, 'generate notes');
        } catch (error) {
            handleGeminiError(error, 'generate notes');
        }

        // Extract mermaid code if present
        let mermaidCode: string | undefined;
        if (type === 'mindmap' || type === 'flowchart') {
            const mermaidMatch = text.match(/```mermaid\n([\s\S]*?)```/);
            if (mermaidMatch) {
                mermaidCode = mermaidMatch[1].trim();
            }
        }

        // Generate title
        const title = this.generateTitle(type, options);

        return { content: text, mermaidCode, title };
    }

    /**
     * Build prompt based on note type
     */
    private buildPrompt(
        type: NoteType,
        transcriptText: string,
        options: {
            persona?: string;
            topic?: string;
            customPrompt?: string;
            videoTitle?: string;
        }
    ): string {
        const videoContext = options.videoTitle
            ? `Video Title: "${options.videoTitle}"\n`
            : '';
        const topicContext = options.topic
            ? `Focus specifically on the topic: "${options.topic}"\n`
            : '';
        const personaPrompt =
            options.persona && options.persona !== 'custom'
                ? PERSONA_PROMPTS[options.persona] || PERSONA_PROMPTS.detailed
                : options.customPrompt || PERSONA_PROMPTS.detailed;

        const baseContext = `You are an expert knowledge extraction assistant. You are analyzing a video transcript to generate structured study materials.\n${videoContext}${topicContext}\n`;

        switch (type) {
            case 'summary':
                return `${baseContext}${personaPrompt}\n\nGenerate a well-structured Markdown summary from the following video transcript. Include relevant timestamps in [MM:SS] format.\n\nTranscript:\n${transcriptText}`;

            case 'detailed_notes':
                return `${baseContext}${personaPrompt}\n\nGenerate comprehensive, detailed study notes in Markdown format from the following transcript. Include:\n- Main topics and subtopics with proper headers\n- Key concepts explained\n- Important examples and code blocks\n- Timestamps [MM:SS] for reference\n- Bullet points for key takeaways\n\nTranscript:\n${transcriptText}`;

            case 'mindmap':
                return `${baseContext}Generate a mind map in Mermaid.js syntax from the following transcript. The mind map should show the hierarchical relationship between topics.\n\nUse this Mermaid syntax:\n\`\`\`mermaid\nmindmap\n  root((Main Topic))\n    Topic A\n      Subtopic A1\n      Subtopic A2\n    Topic B\n      Subtopic B1\n\`\`\`\n\nAlso provide a brief text explanation of the mind map structure.\n\nTranscript:\n${transcriptText}`;

            case 'flowchart':
                return `${baseContext}Generate a flowchart in Mermaid.js syntax from the following transcript. The flowchart should show the logical flow or process described.\n\nUse this Mermaid syntax:\n\`\`\`mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n\`\`\`\n\nAlso provide a brief text explanation.\n\nTranscript:\n${transcriptText}`;

            case 'flashcards':
                return `${baseContext}Generate flashcards from the following transcript in Markdown format. Format each card as:\n\n## Card N\n**Q:** [Question]\n**A:** [Answer]\n\nCreate at least 10-15 flashcards covering the key concepts. Make questions varied: definitions, explanations, comparisons, and applications.\n\nTranscript:\n${transcriptText}`;

            case 'resources':
                return `${baseContext}Based on the following transcript, generate a list of additional follow-up resources. Include:\n- Related topics the viewer should explore next\n- Suggested search terms\n- Conceptual prerequisites\n- Related frameworks/tools mentioned\n- Potential practice exercises\n\nFormat in Markdown with proper sections.\n\nTranscript:\n${transcriptText}`;

            case 'diagram':
                return `${baseContext}Generate a visual diagram description and Mermaid.js code that best represents the key concepts from this transcript. Choose the most appropriate diagram type (sequence, class, state, ER, etc.).\n\nTranscript:\n${transcriptText}`;

            case 'custom':
                return `${baseContext}${options.customPrompt || personaPrompt}\n\nTranscript:\n${transcriptText}`;

            default:
                return `${baseContext}${personaPrompt}\n\nGenerate structured Markdown notes from the following transcript.\n\nTranscript:\n${transcriptText}`;
        }
    }

    /**
     * Generate a title for the note
     */
    private generateTitle(
        type: NoteType,
        options: { topic?: string; persona?: string; videoTitle?: string }
    ): string {
        const typeLabels: Record<NoteType, string> = {
            summary: 'Summary',
            detailed_notes: 'Detailed Notes',
            mindmap: 'Mind Map',
            flowchart: 'Flowchart',
            diagram: 'Diagram',
            flashcards: 'Flashcards',
            resources: 'Follow-up Resources',
            custom: 'Custom Notes',
        };

        let title = typeLabels[type] || 'Notes';
        if (options.topic) {
            title += ` — ${options.topic}`;
        }
        if (options.persona && options.persona !== 'detailed') {
            title += ` (${options.persona})`;
        }
        return title;
    }

    /**
     * RAG-based Q&A: Generate answer from relevant transcript chunks
     */
    async answerQuestion(
        question: string,
        relevantChunks: { text: string; startTimestamp: number; endTimestamp: number }[],
        chatHistory: { role: string; content: string }[] = [],
        videoTitle?: string
    ): Promise<{ answer: string; sources: typeof relevantChunks }> {
        const context = relevantChunks
            .map((chunk) => {
                const mins = Math.floor(chunk.startTimestamp / 60);
                const secs = Math.floor(chunk.startTimestamp % 60);
                return `[${mins}:${secs.toString().padStart(2, '0')}] ${chunk.text}`;
            })
            .join('\n\n');

        const historyText = chatHistory
            .slice(-6) // Last 6 messages for context
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const prompt = `You are a helpful AI assistant that answers questions strictly based on the provided video transcript context. ${videoTitle ? `The video is titled: "${videoTitle}".` : ''}

RULES:
1. Only answer based on the provided context below
2. If the answer is not in the context, say "I couldn't find information about that in the video"
3. Reference specific timestamps [MM:SS] when citing information
4. Be concise but thorough

RELEVANT TRANSCRIPT SECTIONS:
${context}

${historyText ? `PREVIOUS CONVERSATION:\n${historyText}\n` : ''}
USER QUESTION: ${question}

Provide a clear, well-formatted answer:`;

        let answer: string;
        try {
            answer = await this.callGemini(prompt, 'answer question');
        } catch (error) {
            handleGeminiError(error, 'answer question');
        }

        return { answer, sources: relevantChunks };
    }

    /**
     * Generate embeddings for text using Gemini
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            return await this.callEmbedding(text);
        } catch (error) {
            handleGeminiError(error, 'generate embedding');
        }
    }

    /**
     * Translate transcript segments to a target language using Gemini.
     * Processes in batches to stay within token limits.
     * Returns translated segments with original timestamps preserved.
     */
    async translateTranscription(
        segments: ITranscriptSegment[],
        targetLanguage: string
    ): Promise<ITranscriptSegment[]> {
        const BATCH_SIZE = 80;
        const translated: ITranscriptSegment[] = [];

        for (let i = 0; i < segments.length; i += BATCH_SIZE) {
            const batch = segments.slice(i, i + BATCH_SIZE);
            const numberedLines = batch
                .map((seg, idx) => `[${idx}] ${seg.text}`)
                .join('\n');

            const prompt = `Translate EVERY line below into ${targetLanguage}. Keep the exact same number of lines and the [N] prefix on each line. Output ONLY the translated lines, nothing else.

${numberedLines}`;

            let responseText: string;
            try {
                responseText = await this.callGemini(prompt, 'translate transcript');
                responseText = responseText.trim();
            } catch (error) {
                handleGeminiError(error, 'translate transcript');
            }
            const lines = responseText.split('\n').filter((l) => l.trim());

            for (let j = 0; j < batch.length; j++) {
                let translatedText = batch[j].text; // fallback to original
                if (j < lines.length) {
                    // Strip the [N] prefix if present
                    translatedText = lines[j].replace(/^\[\d+\]\s*/, '').trim();
                }
                translated.push({
                    start: batch[j].start,
                    duration: batch[j].duration,
                    text: translatedText,
                });
            }
        }

        return translated;
    }
}

export default new GeminiService();
