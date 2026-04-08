import { vi, beforeEach } from 'vitest';

vi.spyOn(console, 'log').mockImplementation(() => {});

beforeEach(() => {
  vi.clearAllMocks();
});
