import { describe, it, expect } from 'vitest';
import { URLParamsBuilder } from '../utils/urlParams';

describe('URLParamsBuilder', () => {
    it('should format array parameters correctly', () => {
        const builder = new URLParamsBuilder();
        builder.addArray('chains', ['KONZUM', 'LIDL']);
        const params = builder.toString();

        // Expect repeated keys for array parameters
        expect(params).toBe('chains=KONZUM&chains=LIDL');
    });

    it('should handle single item array', () => {
        const builder = new URLParamsBuilder();
        builder.addArray('chains', ['KONZUM']);
        const params = builder.toString();
        expect(params).toBe('chains=KONZUM');
    });
});
