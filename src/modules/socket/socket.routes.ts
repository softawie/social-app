import { Router, Request, Response } from 'express';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';

const socketRouter = Router();

// Get socket connection status
socketRouter.get('/status', authenticationMiddleware, (req: Request, res: Response) => {
  try {
    // This would typically get the socket gateway instance
    // For now, just return a basic status
    res.json({
      status: 'active',
      message: 'Socket.IO server is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get socket status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test socket connection endpoint
socketRouter.post('/test', authenticationMiddleware, (req: Request, res: Response) => {
  try {
    res.json({
      message: 'Socket test endpoint',
      user: {
        id: req.user?._id,
        name: `${req.user?.firstName} ${req.user?.lastName}`.trim()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Socket test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default socketRouter;
