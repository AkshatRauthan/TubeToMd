export interface ChatMessageRequest {
    message: string;
}

export interface ChatSourceResponse {
    text: string;
    startTimestamp: number;
    endTimestamp: number;
}

export interface ChatResponse {
    role: 'assistant';
    content: string;
    sources: ChatSourceResponse[];
}
