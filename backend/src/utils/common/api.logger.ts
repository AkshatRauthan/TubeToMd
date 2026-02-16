import { Request, Response, NextFunction } from 'express';

const apiLogger = (req: Request, res: Response, next: NextFunction): void => {
    if (req.path.includes('/health') || req.path.includes('/favicon.ico')) {
        return next();
    }

    // Log request start with params
    const method = req.method;
    const path = req.path;
    const params = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : 'none';

    console.log(`\n\n🚀 ${method} ${path}`);
    console.log(`📥 Params: ${params}`);

    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;

        const icon = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
        console.log(`${icon} ${method} ${path} [${status}] ${duration}ms`);

        // Log error details for error responses
        if (status >= 400) {
            console.log(`   └─ Error occurred with params: ${params}`);
        }

        console.log("─".repeat(80));
        console.log("\n");
    });

    // Catch any errors during request processing
    const originalJson = res.json;
    res.json = function (body: any) {
        if (body && body.success === false && body.error) {
            console.log(`\n   └─ ${body.error}`);
        }
        return originalJson.call(this, body);
    };
    next();
};

export default apiLogger;