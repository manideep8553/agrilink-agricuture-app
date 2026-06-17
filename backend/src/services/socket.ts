import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Auth middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('Authentication required'));
    
    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { id: string; role: string };
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Price updates room
    socket.on('join:priceUpdates', (cropName?: string) => {
      if (cropName) {
        socket.join(`price:${cropName}`);
      } else {
        socket.join('price:all');
      }
    });

    // Chat
    socket.on('chat:send', async (data: { receiverId: string; content: string; listingId?: string }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: socket.userId!,
            receiverId: data.receiverId,
            listingId: data.listingId || null,
          },
          include: {
            sender: { select: { id: true, name: true, avatar: true, role: true } },
          },
        });

        // Send to receiver
        io.to(`user:${data.receiverId}`).emit('chat:receive', message);
        // Confirm to sender
        socket.emit('chat:sent', message);
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { receiverId: string; isTyping: boolean }) => {
      io.to(`user:${data.receiverId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    // Mark messages as read
    socket.on('chat:read', async (data: { senderId: string }) => {
      await prisma.message.updateMany({
        where: { senderId: data.senderId, receiverId: socket.userId!, isRead: false },
        data: { isRead: true },
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  // Function to emit price updates
  const emitPriceUpdate = (data: { cropName: string; price: number; state: string; district: string }) => {
    io.to(`price:${data.cropName}`).emit('price:update', data);
    io.to('price:all').emit('price:update', data);
  };

  return { emitPriceUpdate };
};
