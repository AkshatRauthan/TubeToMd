import Session, { ISession, ITranscriptSegment } from '@models/session.model';
import Embedding from '@models/embedding.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

const CHUNK_SIZE = 5; // Number of transcript segments per chunk

/**
 * Simple local embedding using TF-IDF-like word vectors.
 * Generates 384-dimension vectors without any external API calls.
 * This avoids API rate limits entirely while still supporting
 * MongoDB Atlas Vector Search for RAG.
 */
function generateLocalEmbedding(text: string): number[] {
    const DIMS = 384;
    const vector = new Array(DIMS).fill(0);

    // Normalize and tokenize
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1);

    if (words.length === 0) return vector;

    // Generate deterministic hash-based embedding for each word
    for (const word of words) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
        }

        // Use hash to set multiple dimensions (spreading each word's influence)
        for (let d = 0; d < 8; d++) {
            const idx = Math.abs((hash * (d + 1) * 2654435761) | 0) % DIMS;
            const val = ((hash >> d) & 1) === 0 ? 1.0 : -1.0;
            vector[idx] += val / words.length;
        }
    }

    // L2-normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
        for (let i = 0; i < DIMS; i++) {
            vector[i] /= magnitude;
        }
    }

    return vector;
}

class EmbeddingService {
    /**
     * Generate and store embeddings for a session's transcript.
     * Uses local embedding generation — zero API calls, zero rate limits.
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

        // Generate embeddings for each chunk (locally — no API calls)
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const embedding = generateLocalEmbedding(chunk.text);

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
     * Generate embedding for a query text (for similarity search).
     */
    async generateEmbedding(text: string): Promise<number[]> {
        return generateLocalEmbedding(text);
    }

    /**
     * Find relevant transcript chunks using vector similarity.
     * Falls back to text-based search if vector search is not available.
     */
    async findRelevantChunks(
        sessionId: string,
        query: string,
        topK: number = 5
    ): Promise<{ text: string; startTimestamp: number; endTimestamp: number }[]> {
        try {
            // Generate query embedding
            const queryEmbedding = generateLocalEmbedding(query);

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
