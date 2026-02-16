export default class CustomError extends Error {
    public statusCode: number | undefined;
    public explanation: string | undefined;

    constructor(message: string, statusCode: number){
        super(message);
        this.statusCode = statusCode;
        this.explanation = message;
    }
}