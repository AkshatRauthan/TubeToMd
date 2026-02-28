import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

class SuccessResponse {
    public success: boolean;
    public message: string;
    public data: any;
    public statusCode: number;

    constructor(
        message: string = 'Request Successful',
        data: any = {},
        statusCode: number = StatusCodes.OK
    ) {
        this.success = true;
        this.message = message;
        this.data = data;
        this.statusCode = statusCode;
    }

    send(res: Response): Response {
        return res.status(this.statusCode).json({
            success: this.success,
            message: this.message,
            data: this.data,
        });
    }
}

export default SuccessResponse;
