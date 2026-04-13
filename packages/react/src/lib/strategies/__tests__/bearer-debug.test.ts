import { describe, it, expect } from 'vitest';
import { BearerStrategy } from '../BearerStrategy';

describe('Debug Bearer Strategy', () => {
  it('should work with token "!"', async () => {
    const strategy = new BearerStrategy();
    const token = '!';
    
    console.log('Token:', token);
    console.log('Token trim:', token.trim());
    console.log('Token trim !== "":', token.trim() !== '');
    
    const authResult = await strategy.authenticate({ token });
    console.log('Auth result:', authResult);
    
    expect(authResult.success).toBe(true);
    
    const serialized = strategy.serialize();
    console.log('Serialized:', serialized);
    
    const newStrategy = new BearerStrategy();
    newStrategy.deserialize(serialized);
    
    console.log('New strategy isAuthenticated:', newStrategy.isAuthenticated());
    console.log('New strategy getHeaders:', newStrategy.getHeaders());
    
    expect(newStrategy.isAuthenticated()).toBe(strategy.isAuthenticated());
    expect(newStrategy.getHeaders()).toEqual(strategy.getHeaders());
  });
});
