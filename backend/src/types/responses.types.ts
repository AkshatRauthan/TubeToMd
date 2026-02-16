export interface ISuccessResponse {
    success: boolean;
    message: string;
    data?: any;
    error?: {};
}

export interface IErrorResponse {
    success: boolean;
    message: string;
    data?: {};
    error?: any;
}
