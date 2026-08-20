"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issueDetails = error.errors.map((e) => ({
                    field: e.path.join('.').replace(/^(body|query|params)\./, ''),
                    message: e.message,
                }));
                return res.status(400).json({
                    status: 'fail',
                    message: 'Validation failed',
                    errors: issueDetails,
                });
            }
            return next(error);
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map