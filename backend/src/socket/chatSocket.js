const prisma = require('../prisma');
const { verifyToken } = require('../utils/jwt');

/**
 * Initialize Socket.io with the HTTP server and attach chat event handlers
 * @param {import('http').Server} httpServer - The HTTP server instance
 */
function initChatSocket(httpServer) {
  const { Server } = require('socket.io');

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // --- JWT Authentication Middleware for Socket.io ---
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);

      const user = await prisma.users.findFirst({
        where: { id: decoded.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          roleId: true,
          role: { select: { id: true, roleName: true } },
        },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      // Attach user to the socket
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: ' + err.message));
    }
  });

  // --- Connection Handler ---
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🟢 Socket connected: User "${user.name}" (ID: ${user.id})`);
    
    // Join a global room for this specific user to receive notifications
    socket.join(`user_${user.id}`);

    // --- Join Conversation Room ---
    // Client emits: { conversationId: 1 }
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        const convId = parseInt(conversationId, 10);
        if (isNaN(convId)) {
          return socket.emit('error', { message: 'Invalid conversation ID' });
        }

        // Verify conversation exists and user is a participant
        const conversation = await prisma.chatConversation.findUnique({
          where: { id: convId },
          select: {
            id: true,
            customerId: true,
            store: { select: { id: true, userId: true, name: true } },
          },
        });

        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const isCustomer = conversation.customerId === user.id;
        const isStoreOwner = conversation.store.userId === user.id;
        const isAdmin = user.role.roleName.toLowerCase() === 'admin';

        if (!isCustomer && !isStoreOwner && !isAdmin) {
          return socket.emit('error', {
            message: 'Access denied: You are not a participant in this conversation',
          });
        }

        const roomName = `conversation_${convId}`;
        socket.join(roomName);
        console.log(`👤 User "${user.name}" joined room: ${roomName}`);

        socket.emit('joined_conversation', {
          success: true,
          conversationId: convId,
          store: conversation.store,
          room: roomName,
        });

        // Mark unread messages as read
        await prisma.chatMessage.updateMany({
          where: {
            conversationId: convId,
            senderId: { not: user.id },
            isRead: false,
          },
          data: { isRead: true },
        });
      } catch (err) {
        console.error('join_conversation error:', err);
        socket.emit('error', { message: 'Failed to join conversation: ' + err.message });
      }
    });

    // --- Send Message ---
    // Client emits: { conversationId: 1, message: "Hello!" }
    socket.on('send_message', async ({ conversationId, message }) => {
      try {
        const convId = parseInt(conversationId, 10);

        if (!message || !message.trim()) {
          return socket.emit('error', { message: 'Message text is required' });
        }

        // Verify conversation and participation
        const conversation = await prisma.chatConversation.findUnique({
          where: { id: convId },
          select: {
            id: true,
            customerId: true,
            store: { select: { id: true, userId: true } },
          },
        });

        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const isCustomer = conversation.customerId === user.id;
        const isStoreOwner = conversation.store.userId === user.id;

        if (!isCustomer && !isStoreOwner) {
          return socket.emit('error', {
            message: 'You are not a participant in this conversation',
          });
        }

        // Persist the message to the database
        const savedMessage = await prisma.chatMessage.create({
          data: {
            conversationId: convId,
            senderId: user.id,
            message: message.trim(),
          },
          select: {
            id: true,
            conversationId: true,
            senderId: true,
            message: true,
            isRead: true,
            createdAt: true,
            sender: { select: { id: true, name: true } },
          },
        });

        // Update conversation updatedAt so it bubbles to top in conversation list
        await prisma.chatConversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });

        // Broadcast the message to all clients in the room (including sender)
        const roomName = `conversation_${convId}`;
        io.to(roomName).emit('new_message', savedMessage);

        // Also emit to the recipient's global user room for notifications
        const recipientId = isCustomer ? conversation.store.userId : conversation.customerId;
        io.to(`user_${recipientId}`).emit('new_message', savedMessage);

        console.log(
          `💬 Message in room ${roomName} from "${user.name}": "${message.trim().substring(0, 40)}"`
        );
      } catch (err) {
        console.error('send_message error:', err);
        socket.emit('error', { message: 'Failed to send message: ' + err.message });
      }
    });

    // --- Typing Indicator ---
    // Client emits: { conversationId: 1 }
    socket.on('typing', ({ conversationId }) => {
      const roomName = `conversation_${conversationId}`;
      socket.to(roomName).emit('user_typing', {
        userId: user.id,
        name: user.name,
        conversationId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      const roomName = `conversation_${conversationId}`;
      socket.to(roomName).emit('user_stopped_typing', {
        userId: user.id,
        conversationId,
      });
    });

    // --- Leave Room ---
    socket.on('leave_conversation', ({ conversationId }) => {
      const roomName = `conversation_${conversationId}`;
      socket.leave(roomName);
      console.log(`👤 User "${user.name}" left room: ${roomName}`);
      socket.emit('left_conversation', { conversationId });
    });

    // --- Disconnect ---
    socket.on('disconnect', (reason) => {
      console.log(`🔴 Socket disconnected: User "${user.name}" (ID: ${user.id}), reason: ${reason}`);
    });
  });

  console.log('💬 Socket.io chat server initialized');
  return io;
}

module.exports = { initChatSocket };
