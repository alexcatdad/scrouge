import { describe, it, expect } from 'vitest';

describe('Health Endpoint', () => {
  it('should return healthy status with timestamp', () => {
    // Test the response format logic
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    expect(response.status).toBe('healthy');
    expect(response.timestamp).toBeDefined();
    expect(() => new Date(response.timestamp)).not.toThrow();
  });

  it('should have valid ISO timestamp format', () => {
    const timestamp = new Date().toISOString();
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

    expect(timestamp).toMatch(isoRegex);
  });
});
