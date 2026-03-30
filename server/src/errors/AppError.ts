import type { ErrorCode } from './errorCodes.js'

export class AppError extends Error {
    code: ErrorCode

    constructor(code: ErrorCode, message: string) {
        super(message)
        this.code = code
    }
}
