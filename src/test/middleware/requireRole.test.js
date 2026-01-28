import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireRole } from '../../middleware/requireRole';
import { Request, Response } from 'express';

describe('requireRole Middleware', () => {
  let mockReq, mockRes, next;

  beforeEach(() => {
    mockReq = {
      user: null
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call next if user has allowed role', () => {
    mockReq.user = { id: 1, role: 'admin' };
    
    const middleware = requireRole(['admin']);
    middleware(mockReq, mockRes, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 if user does not have allowed role', () => {
    mockReq.user = { id: 1, role: 'user' };
    
    const middleware = requireRole(['admin']);
    middleware(mockReq, mockRes, next);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ 
      error: 'Access denied. Insufficient permissions.' 
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if user is not authenticated', () => {
    const middleware = requireRole(['admin']);
    middleware(mockReq, mockRes, next);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ 
      error: 'Authentication required' 
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow multiple roles', () => {
    mockReq.user = { id: 1, role: 'manager' };
    
    const middleware = requireRole(['admin', 'manager', 'editor']);
    middleware(mockReq, mockRes, next);
    
    expect(next).toHaveBeenCalled();
  });
});