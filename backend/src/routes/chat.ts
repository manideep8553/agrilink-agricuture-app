import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Get user's conversations
 *     security: [{ bearerAuth: [] }]
 */
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
        receiver: { select: { id: true, name: true, avatar: true, role: true } },
        listing: { select: { id: true, cropName: true, images: true, price: true } },
      },
    });
    
    // Group by conversation partner
    const conversationMap = new Map<string, any>();
    
    for (const msg of messages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0,
          messages: [],
        });
      }
    }
    
    const conversations = Array.from(conversationMap.values());
    res.json({ conversations });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /chat/messages/{userId}:
 *   get:
 *     tags: [Chat]
 *     summary: Get messages with a specific user
 *     security: [{ bearerAuth: [] }]
 */
router.get('/messages/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const otherUserId = req.params.userId;
    
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
    
    // Mark as read
    await prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      data: { isRead: true },
    });
    
    res.json({ messages });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /chat/send:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message
 *     security: [{ bearerAuth: [] }]
 */
router.post('/send', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId, content, listingId } = req.body;
    
    const message = await prisma.message.create({
      data: {
        content,
        senderId: req.user!.id,
        receiverId,
        listingId: listingId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
    
    // Socket emission will be handled via the socket service
    res.status(201).json({ message });
  } catch (err) { next(err); }
});

export default router;
