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

    describe('addCoordinates', () => {
        it('should add coordinates when both are provided', () => {
            const builder = new URLParamsBuilder();
            builder.addCoordinates(45.815, 15.9819);
            const params = builder.toString();
            expect(params).toBe('latitude=45.815&longitude=15.9819');
        });

        it('should not add coordinates when only latitude is provided', () => {
            const builder = new URLParamsBuilder();
            builder.addCoordinates(45.815, undefined);
            const params = builder.toString();
            expect(params).toBe('');
        });

        it('should not add coordinates when only longitude is provided', () => {
            const builder = new URLParamsBuilder();
            builder.addCoordinates(undefined, 15.9819);
            const params = builder.toString();
            expect(params).toBe('');
        });

        it('should not add coordinates when neither are provided', () => {
            const builder = new URLParamsBuilder();
            builder.addCoordinates();
            const params = builder.toString();
            expect(params).toBe('');
        });

        it('should handle 0 values as valid coordinates', () => {
            const builder = new URLParamsBuilder();
            builder.addCoordinates(0, 0);
            const params = builder.toString();
            expect(params).toBe('latitude=0&longitude=0');
        });
    });
});
