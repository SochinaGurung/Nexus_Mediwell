import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from './models/conversation.model.js';
import Message from './models/message.model.js';


export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    socket.on('join_conversation', async (conversationId, callback) => {
      if (!conversationId) {
        callback?.({ ok: false, message: 'conversationId required' });
        return;
      }
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          callback?.({ ok: false, message: 'Conversation not found' });
          return;
        }
        const memberIds = conversation.members.map((m) => m.toString());
        if (!memberIds.includes(userId)) {
          callback?.({ ok: false, message: 'Not a member of this conversation' });
          return;
        }
        socket.join(`conv:${conversationId}`);
        callback?.({ ok: true });
      } catch (err) {
        callback?.({ ok: false, message: 'Server error' });
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    socket.on('send_message', async (payload, callback) => {
      const { conversationId, text } = payload || {};
      if (!conversationId || !text || typeof text !== 'string' || !text.trim()) {
        callback?.({ ok: false, message: 'conversationId and text required' });
        return;
      }
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          callback?.({ ok: false, message: 'Conversation not found' });
          return;
        }
        const memberIds = conversation.members.map((m) => m.toString());
        if (!memberIds.includes(userId)) {
          callback?.({ ok: false, message: 'Not allowed to send in this conversation' });
          return;
        }

        const message = await Message.create({
          conversationId: conversationId.toString(),
          sender: userId,
          text: text.trim()
        });

        await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

        const messagePayload = {
          id: message._id.toString(),
          conversationId: conversationId.toString(),
          sender: message.sender,
          text: message.text,
          createdAt: message.createdAt,
          isOwn: false
        };

        // Do not echo to sender: they already get the message from the send ack (avoids duplicate UI)
        socket.broadcast.to(`conv:${conversationId}`).emit('new_message', messagePayload);
        callback?.({ ok: true, message: { ...messagePayload, isOwn: true } });
      } catch (err) {
        console.error('Socket send_message error:', err);
        callback?.({ ok: false, message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}
