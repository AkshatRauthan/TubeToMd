import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Session } from '@/types';

interface UseSessionPollingProps {
    session: Session | null;
    fetchSession: () => Promise<Session>;
    fetchNotes: () => Promise<void>;
    pollInterval?: number;
}

export function useSessionPolling({
    session,
    fetchSession,
    fetchNotes,
    pollInterval = 5000,
}: UseSessionPollingProps) {
    useEffect(() => {
        if (!session || (session.status !== 'processing' && session.status !== 'transcribing')) return;
        
        console.log(`[Session] Status=${session.status}, starting poll (${pollInterval}ms)`);
        
        const interval = setInterval(async () => {
            console.log('[Session] Polling...');
            try {
                const updated = await fetchSession();
                if (updated.status === 'ready') {
                    console.log('[Session] Transcription complete!');
                    toast.success('Transcription complete!');
                    fetchNotes();
                } else if (updated.status === 'failed') {
                    console.error('[Session] Transcription failed:', updated.errorMessage);
                    toast.error('Transcription failed');
                }
            } catch (err) {
                console.error('[Session] Error during polling:', err);
            }
        }, pollInterval);
        
        return () => clearInterval(interval);
    }, [session?.status, fetchSession, fetchNotes, pollInterval]);
}
