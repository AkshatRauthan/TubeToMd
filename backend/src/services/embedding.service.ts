import Session, { ISession, ITranscriptSegment } from '@models/session.model';
import Embedding from '@models/embedding.model';
import geminiService from '@services/gemini.service';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

const CHUNK_SIZE = 5; // Number of transcript segments per chunk

class EmbeddingService {
    /**
     * Generate and store embeddings for a session's transcript
     */
    async generateSessionEmbeddings(sessionId: string): Promise<void> {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        if (session.transcription.length === 0) {
            return;
        }

        // Delete existing embeddings for this session
        await Embedding.deleteMany({ sessionId: session._id });

        // Chunk the transcript
        const chunks = this.chunkTranscript(session.transcription);

        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const embedding = await geminiService.generateEmbedding(chunk.text);

                await Embedding.create({
                    sessionId: session._id,
                    chunkText: chunk.text,
                    chunkIndex: i,
                    startTimestamp: chunk.startTimestamp,
                    endTimestamp: chunk.endTimestamp,
                    embedding,
                });
            } catch (error) {
                console.error(`Failed to generate embedding for chunk ${i}:`, error);
            }
        }
    }

    /**
     * Find relevant transcript chunks using vector similarity
     * Falls back to text-based search if vector search is not available
     */
    async findRelevantChunks(
        sessionId: string,
        query: string,
        topK: number = 5
    ): Promise<{ text: string; startTimestamp: number; endTimestamp: number }[]> {
        try {
            // Generate query embedding
            const queryEmbedding = await geminiService.generateEmbedding(query);

            // Try MongoDB Atlas Vector Search
            const results = await Embedding.aggregate([
                {
                    $vectorSearch: {
                        index: 'embedding_vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: topK * 10,
                        limit: topK,
                        filter: { sessionId: { $eq: sessionId } },
                    },
                },
                {
                    $project: {
                        chunkText: 1,
                        startTimestamp: 1,
                        endTimestamp: 1,
                        score: { $meta: 'vectorSearchScore' },
                    },
                },
            ]);

            if (results.length > 0) {
                return results.map((r: any) => ({
                    text: r.chunkText,
                    startTimestamp: r.startTimestamp,
                    endTimestamp: r.endTimestamp,
                }));
            }
        } catch (error) {
            // Vector search not available — fall back to text search
            console.warn('Vector search not available, falling back to text search');
        }

        // Fallback: Simple text search
        return this.textSearch(sessionId, query, topK);
    }

    /**
     * Fallback text-based search
     */
    private async textSearch(
        sessionId: string,
        query: string,
        topK: number
    ): Promise<{ text: string; startTimestamp: number; endTimestamp: number }[]> {
        const queryWords = query.toLowerCase().split(/\s+/);

        const embeddings = await Embedding.find({ sessionId });

        // Score each chunk by keyword overlap
        const scored = embeddings.map((emb) => {
            const text = emb.chunkText.toLowerCase();
            const score = queryWords.reduce(
                (acc, word) => acc + (text.includes(word) ? 1 : 0),
                0
            );
            return { ...emb.toObject(), score };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, topK).map((r) => ({
            text: r.chunkText,
            startTimestamp: r.startTimestamp,
            endTimestamp: r.endTimestamp,
        }));
    }

    /**
     * Chunk transcript into overlapping segments
     */
    private chunkTranscript(
        transcript: ITranscriptSegment[]
    ): { text: string; startTimestamp: number; endTimestamp: number }[] {
        const chunks: { text: string; startTimestamp: number; endTimestamp: number }[] = [];

        for (let i = 0; i < transcript.length; i += CHUNK_SIZE) {
            const segmentGroup = transcript.slice(i, i + CHUNK_SIZE);
            const text = segmentGroup.map((s) => s.text).join(' ');
            const startTimestamp = segmentGroup[0].start;
            const lastSeg = segmentGroup[segmentGroup.length - 1];
            const endTimestamp = lastSeg.start + lastSeg.duration;

            chunks.push({ text, startTimestamp, endTimestamp });
        }

        return chunks;
    }
}

export default new EmbeddingService();
