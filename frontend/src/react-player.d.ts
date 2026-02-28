declare module 'react-player' {
    import { Component } from 'react';

    interface ReactPlayerProps {
        url?: string;
        playing?: boolean;
        loop?: boolean;
        controls?: boolean;
        light?: boolean | string;
        volume?: number;
        muted?: boolean;
        playbackRate?: number;
        width?: string | number;
        height?: string | number;
        progressInterval?: number;
        pip?: boolean;
        stopOnUnmount?: boolean;
        onReady?: (player: ReactPlayer) => void;
        onStart?: () => void;
        onPlay?: () => void;
        onPause?: () => void;
        onBuffer?: () => void;
        onEnded?: () => void;
        onError?: (error: any) => void;
        onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
        onDuration?: (duration: number) => void;
        onSeek?: (seconds: number) => void;
        ref?: any;
        [key: string]: any;
    }

    class ReactPlayer extends Component<ReactPlayerProps> {
        seekTo(amount: number, type?: 'seconds' | 'fraction'): void;
        getCurrentTime(): number;
        getDuration(): number;
        getInternalPlayer(key?: string): any;
    }

    export default ReactPlayer;
}
