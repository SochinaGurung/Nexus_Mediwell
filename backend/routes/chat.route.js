import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/auth.middleware.js';
import {
  getChatableUsers,
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadCount
} from '../controllers/chat.controller.js';

const router = Router();

router.use(protect);
router.use(allowRoles('patient', 'doctor'));

router.get('/chatable-users', getChatableUsers);
router.get('/unread-count', getUnreadCount);
router.post('/conversations', createOrGetConversation);
router.get('/conversations', getConversations);
router.put('/conversations/:conversationId/read', markConversationRead);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

export default router;
