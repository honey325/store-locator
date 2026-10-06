const prisma = require('../prisma');

/**
 * Get or create a conversation between a customer and a store
 */
async function getOrCreateConversation(req, res) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    // Verify the store exists and is not deleted
    const store = await prisma.store.findFirst({
      where: { id: storeId, deletedAt: null },
      select: { id: true, name: true, userId: true },
    });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Customers and shop owners can both initiate conversations
    const customerId = req.user.id;

    // If the shop owner is trying to chat with their own store, reject
    if (store.userId === customerId) {
      return res.status(400).json({
        success: false,
        message: 'Shop owners cannot initiate a chat with their own store',
      });
    }

    // Get or create the conversation (upsert by unique constraint: customerId + storeId)
    const conversation = await prisma.chatConversation.upsert({
      where: {
        customerId_storeId: {
          customerId,
          storeId,
        },
      },
      update: {}, // No update needed, just return existing
      create: {
        customerId,
        storeId,
      },
      select: {
        id: true,
        customerId: true,
        storeId: true,
        store: {
          select: { id: true, name: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Get/Create Conversation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get or create conversation',
      error: error.message,
    });
  }
}

/**
 * Get all conversations for the authenticated user
 * - Customers see their own conversations
 * - Shop owners see conversations for their stores
 */
async function getMyConversations(req, res) {
  try {
    const userId = req.user.id;
    const roleName = req.user.role.roleName.toLowerCase();

    let conversations;

    if (roleName === 'customer') {
      // Customer: fetch conversations they started
      conversations = await prisma.chatConversation.findMany({
        where: { customerId: userId },
        select: {
          id: true,
          customerId: true,
          storeId: true,
          store: {
            select: { id: true, name: true },
          },
          customer: {
            select: { id: true, name: true, email: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Only the last message as preview
            select: {
              id: true,
              message: true,
              isRead: true,
              createdAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else if (roleName === 'owner' || roleName === 'admin') {
      // Shop owner: fetch conversations for their stores
      const storeWhere = roleName === 'admin' ? {} : { userId };
      conversations = await prisma.chatConversation.findMany({
        where: {
          store: { ...storeWhere, deletedAt: null },
        },
        select: {
          id: true,
          customerId: true,
          storeId: true,
          store: {
            select: { id: true, name: true },
          },
          customer: {
            select: { id: true, name: true, email: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              isRead: true,
              createdAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Get My Conversations Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations',
      error: error.message,
    });
  }
}

/**
 * Get message history for a specific conversation (with pagination)
 */
async function getMessages(req, res) {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    if (isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const { page = 1, limit = 50 } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    // Verify the conversation exists and the user is a participant
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        store: { select: { id: true, userId: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userId = req.user.id;
    const roleName = req.user.role.roleName.toLowerCase();
    const isCustomer = conversation.customerId === userId;
    const isStoreOwner = conversation.store.userId === userId;
    const isAdmin = roleName === 'admin';

    if (!isCustomer && !isStoreOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation',
      });
    }

    const [total, messages] = await Promise.all([
      prisma.chatMessage.count({ where: { conversationId } }),
      prisma.chatMessage.findMany({
        where: { conversationId },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          message: true,
          isRead: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    // Mark unread messages as read (only messages NOT sent by the current user)
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation.id,
        store: conversation.store,
        customer: conversation.customer,
      },
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      messages,
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error.message,
    });
  }
}

/**
 * Send a message in a conversation (REST fallback — Socket.io is preferred for real-time)
 */
async function sendMessage(req, res) {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    if (isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const userId = req.user.id;

    // Verify conversation exists and user is a participant
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        store: { select: { id: true, userId: true } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isCustomer = conversation.customerId === userId;
    const isStoreOwner = conversation.store.userId === userId;

    if (!isCustomer && !isStoreOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation',
      });
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
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

    // Update conversation's updatedAt so it bubbles to top in conversation list
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Send Message Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
}

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
};
