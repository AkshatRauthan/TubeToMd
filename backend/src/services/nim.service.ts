import nimKeyManager from '@services/nimKeyManager.service';
import llmCache from '@services/llmCache.service';
import serverConfig from '@config/server.config';
import { ITranscriptSegment } from '@models/session.model';
import { NoteType } from '@models/note.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

type ErrorClass = 'rate-limit' | 'credit-exhausted' | 'auth' | 'network' | 'other';

function classifyError(error: any): ErrorClass {
    const msg = String(error?.message || error);
    const status = error?.status ?? error?.response?.status;

    if (status === 402 || /insufficient.*credit|out of credit|credit.*exhaust|payment required/i.test(msg)) {
        return 'credit-exhausted';
    }
    if (status === 429 || /429|rate.?limit|too many requests|RESOURCE_EXHAUSTED/i.test(msg)) {
        return 'rate-limit';
    }
    if (status === 401 || status === 403 || /401|403|api key|authentication|unauthor/i.test(msg)) {
        return 'auth';
    }
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network|fetch failed/i.test(msg)) {
        return 'network';
    }
    return 'other';
}

function userFacingError(error: any, operation: string): never {
    const cls = classifyError(error);
    const msg = String(error?.message || error);
    console.error(`[NimService] ${operation} failed (${cls}):`, msg);

    if (cls === 'rate-limit') {
        throw new CustomError(
            'AI service rate limit reached. Please wait a moment and try again.',
            StatusCodes.TOO_MANY_REQUESTS
        );
    }
    if (cls === 'credit-exhausted') {
        throw new CustomError(
            'AI service credits exhausted. Please contact the administrator.',
            StatusCodes.SERVICE_UNAVAILABLE
        );
    }
    if (cls === 'auth') {
        throw new CustomError(
            'AI service authentication error. Please check the NVIDIA NIM API key.',
            StatusCodes.SERVICE_UNAVAILABLE
        );
    }
    if (cls === 'network') {
        throw new CustomError(
            'Unable to reach AI service. Please check your connection and try again.',
            StatusCodes.SERVICE_UNAVAILABLE
        );
    }
    throw new CustomError(
        `Failed to ${operation}. Please try again later.`,
        StatusCodes.INTERNAL_SERVER_ERROR
    );
}

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
    custom: '',
};

interface CallOptions {
    primaryModel: string;
    fallbackModel?: string;
    maxTokens: number;
    temperature?: number;
    cache?: boolean;
}

const MAX_TOKENS_BY_OP: Record<string, number> = {
    'generate notes': 6000,
    'generate mindmap': 1500,
    'answer question': 1024,
    'translate transcript': 2048,
    default: 4096,
};

class NimService {
    /**
     * Call NVIDIA NIM with smart fallback:
     *   1. Try primary model on current key.
     *   2. On rate-limit → try fallback model on same key.
     *   3. On second failure → mark key cooled, rotate to next key, retry primary.
     *   4. Repeat until all keys exhausted.
     */
    private async callNim(
        prompt: string,
        operation: string,
        opts: CallOptions
    ): Promise<string> {
        if (opts.cache !== false) {
            const cached = await llmCache.get(opts.primaryModel, prompt, operation);
            if (cached) {
                console.log(`[NimService] cache hit (${operation})`);
                return cached;
            }
        }

        const totalKeys = Math.max(nimKeyManager.getStatus().total, 1);
        let lastError: any;

        for (let attempt = 0; attempt < totalKeys; attempt++) {
            const { client, keyRef } = nimKeyManager.getClient();

            const modelChain = [opts.primaryModel];
            if (opts.fallbackModel && opts.fallbackModel !== opts.primaryModel) {
                modelChain.push(opts.fallbackModel);
            }

            let keyExhausted = false;

            for (const model of modelChain) {
                try {
                    const completion = await client.chat.completions.create({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: opts.temperature ?? 0.7,
                        max_tokens: opts.maxTokens,
                    });

                    const text = completion.choices[0]?.message?.content || '';

                    if (opts.cache !== false && text) {
                        await llmCache.set(opts.primaryModel, prompt, operation, text);
                    }
                    return text;
                } catch (error: any) {
                    lastError = error;
                    const cls = classifyError(error);

                    if (cls === 'credit-exhausted') {
                        nimKeyManager.markCreditExhausted(keyRef, error);
                        keyExhausted = true;
                        break;
                    }

                    if (cls === 'rate-limit') {
                        console.warn(
                            `[NimService] Key "${keyRef.label}" rate-limited on ${model}, trying fallback model...`
                        );
                        continue;
                    }

                    if (cls === 'auth' || cls === 'network') {
                        userFacingError(error, operation);
                    }

                    // Other errors — try fallback model on same key
                    console.warn(`[NimService] ${model} failed, trying fallback. Error:`, String(error?.message || error));
                    continue;
                }
            }

            if (!keyExhausted) {
                // All models on this key failed with rate-limit / other — mark cooldown and rotate
                nimKeyManager.markRateLimited(keyRef, lastError);
            }
        }

        userFacingError(lastError, operation);
    }

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
        let filteredTranscript = transcript;
        if (options.startTimestamp !== undefined || options.endTimestamp !== undefined) {
            filteredTranscript = transcript.filter((seg) => {
                const start = options.startTimestamp ?? 0;
                const end = options.endTimestamp ?? Infinity;
                return seg.start >= start && seg.start <= end;
            });
        }

        const transcriptText = filteredTranscript
            .map((seg) => {
                const mins = Math.floor(seg.start / 60);
                const secs = Math.floor(seg.start % 60);
                return `[${mins}:${secs.toString().padStart(2, '0')}] ${seg.text}`;
            })
            .join('\n');

        const prompt = this.buildPrompt(type, transcriptText, options);

        const isStructured = type === 'mindmap' || type === 'flowchart';
        const operation = isStructured ? 'generate mindmap' : 'generate notes';
        const primaryModel = isStructured ? serverConfig.NVIDIA_MODEL_FAST : serverConfig.NVIDIA_MODEL_QUALITY;
        const fallbackModel = isStructured
            ? serverConfig.NVIDIA_MODEL_FAST_FALLBACK
            : serverConfig.NVIDIA_MODEL_QUALITY_FALLBACK;

        let text: string;
        try {
            text = await this.callNim(prompt, operation, {
                primaryModel,
                fallbackModel,
                maxTokens: MAX_TOKENS_BY_OP[operation] ?? MAX_TOKENS_BY_OP.default,
            });
        } catch (error) {
            userFacingError(error, 'generate notes');
        }

        let mermaidCode: string | undefined;
        if (isStructured) {
            const mermaidMatch = text.match(/```mermaid\n([\s\S]*?)```/);
            if (mermaidMatch) {
                mermaidCode = mermaidMatch[1].trim();
            }
        }

        const title = this.generateTitle(type, options);
        return { content: text, mermaidCode, title };
    }

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
        const videoContext = options.videoTitle ? `Video Title: "${options.videoTitle}"\n` : '';
        const topicContext = options.topic ? `Focus specifically on the topic: "${options.topic}"\n` : '';
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
        if (options.topic) title += ` — ${options.topic}`;
        if (options.persona && options.persona !== 'detailed') title += ` (${options.persona})`;
        return title;
    }

    async answerQuestion(
        question: string,
        relevantChunks: { text: string; startTimestamp: number; endTimestamp: number }[],
        chatHistory: { role: string; content: string }[] = [],
        videoTitle?: string
    ): Promise<{
        answer: string;
        sources: { text: string; startTimestamp: number; endTimestamp: number }[];
    }> {
        const context = relevantChunks
            .map((chunk) => {
                const mins = Math.floor(chunk.startTimestamp / 60);
                const secs = Math.floor(chunk.startTimestamp % 60);
                return `[${mins}:${secs.toString().padStart(2, '0')}] ${chunk.text}`;
            })
            .join('\n\n');

        const historyText = chatHistory
            .slice(-6)
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

        // Chat answers are not cached — they're inherently context-dependent on history
        let answer: string;
        try {
            answer = await this.callNim(prompt, 'answer question', {
                primaryModel: serverConfig.NVIDIA_MODEL_QUALITY,
                fallbackModel: serverConfig.NVIDIA_MODEL_QUALITY_FALLBACK,
                maxTokens: MAX_TOKENS_BY_OP['answer question'],
                cache: false,
            });
        } catch (error) {
            userFacingError(error, 'answer question');
        }

        return { answer, sources: relevantChunks };
    }

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
                responseText = await this.callNim(prompt, 'translate transcript', {
                    primaryModel: serverConfig.NVIDIA_MODEL_FAST,
                    fallbackModel: serverConfig.NVIDIA_MODEL_FAST_FALLBACK,
                    maxTokens: MAX_TOKENS_BY_OP['translate transcript'],
                    temperature: 0.3,
                });
                responseText = responseText.trim();
            } catch (error) {
                userFacingError(error, 'translate transcript');
            }
            const lines = responseText.split('\n').filter((l) => l.trim());

            for (let j = 0; j < batch.length; j++) {
                let translatedText = batch[j].text;
                if (j < lines.length) {
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

export default new NimService();
