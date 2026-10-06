const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// All chat routes require authentication
router.use(authenticateToken);

// Conversation management
router.post('/conversations/:storeId', chatController.getOrCreateConversation);   // Start/get conversation with a store
router.get('/conversations', chatController.getMyConversations);                   // List all my conversations

// Messages
router.get('/conversations/:conversationId/messages', chatController.getMessages); // Get message history
router.post('/conversations/:conversationId/messages', chatController.sendMessage); // Send message (REST fallback)

module.exports = router;
