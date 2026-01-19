

import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Enhanced console logging for validation errors
        console.error('\n========================================');
        console.error('❌ VALIDATION ERRORS');
        console.error('========================================');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Method:', req.method);
        console.error('Path:', req.originalUrl);
        console.error('Request Body:', JSON.stringify(req.body, null, 2));
        console.error('Validation Errors:');
        errors.array().forEach((error, index) => {
            console.error(`  ${index + 1}. Field: "${error.path}" - ${error.msg}`);
            console.error(`     Value: ${JSON.stringify(error.value)}`);
        });
        console.error('========================================\n');

        // FIX: Returns a 400 Bad Request with a clear list of error messages.
        return res.status(400).json({
            errors: errors.array().map(e => e.msg)
        });
    }

    next();
};