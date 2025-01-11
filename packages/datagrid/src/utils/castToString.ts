/**
 * Converts a value to string
 * @param value
 */
export const castToString = (value: any): string | undefined => {
    if (value === null || value === void 0) return void 0;
    return typeof value !== 'string' ? '' + value : value;
};
