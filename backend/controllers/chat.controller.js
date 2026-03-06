import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import Appointment from '../models/appointment.model.js';

//Getting the list of users the current user can chat with 
export async function getChatableUsers(req, res) {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const role = currentUser.role;
    if (role !== 'patient' && role !== 'doctor') {
      return res.status(400).json({ message: 'Only patients and doctors can chat' });
    }

    const completed = await Appointment.find({ status: 'completed' })
      .populate('patient', 'firstName lastName username')
      .populate('doctor', 'firstName lastName username')
      .lean();

    const otherIds = new Set();
    if (role === 'doctor') {
      completed.filter((a) => a.doctor?._id?.toString() === userId).forEach((a) => otherIds.add(a.patient?._id?.toString()));
    } else {
      completed.filter((a) => a.patient?._id?.toString() === userId).forEach((a) => otherIds.add(a.doctor?._id?.toString()));
    }

    const ids = [...otherIds].filter(Boolean);
    if (ids.length === 0) {
      return res.status(200).json({ message: 'Chatable users', users: [] });
    }

    const users = await User.find({ _id: { $in: ids } }).select('firstName lastName username role').lean();
    const list = users.map((u) => ({
      id: u._id.toString(),
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
      username: u.username,
      role: u.role
    }));

    return res.status(200).json({ message: 'Chatable users', users: list });
  } catch (err) {
    console.error('Get chatable users error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}


//Create a conversation between the doctor and patient.
//Only Patient who have completed the appointments can chat with othe respective doctors.
export async function createOrGetConversation(req, res) {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: 'otherUserId is required' });
    }

    const currentUser = await User.findById(userId);
    const otherUser = await User.findById(otherUserId);
    if (!currentUser || !otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = currentUser.role;
    const otherRole = otherUser.role;
    if (role === 'patient' && otherRole !== 'doctor') {
      return res.status(400).json({ message: 'Patients can only chat with doctors' });
    }
    if (role === 'doctor' && otherRole !== 'patient') {
      return res.status(400).json({ message: 'Doctors can only chat with patients' });
    }
    if (role === 'admin') {
      return res.status(400).json({ message: 'Chat is for patients and doctors only' });
    }

    const patientId = role === 'patient' ? userId : otherUserId;
    const doctorId = role === 'doctor' ? userId : otherUserId;
    const hasCompletedAppointment = await Appointment.exists({
      patient: patientId,
      doctor: doctorId,
      status: 'completed'
    });
    if (!hasCompletedAppointment) {
      return res.status(403).json({
        message: 'You can only chat with a doctor after at least one appointment has been completed with them.'
      });
    }

    let conversation = await Conversation.findOne({
      members: { $all: [userId, otherUserId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        members: [userId, otherUserId]
      });
    }

    const other = {
      id: otherUser._id,
      name: [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ') || otherUser.username,
      username: otherUser.username,
      role: otherUser.role
    };

    return res.status(200).json({
      message: 'Conversation ready',
      conversation: {
        id: conversation._id,
        members: conversation.members,
        otherUser: other,
        createdAt: conversation.createdAt
      }
    });
  } catch (err) {
    console.error('Create/get conversation error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}


//To recieve messages for a conversation
export async function getMessages(req, res) {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const memberIds = conversation.members.map((m) => m.toString());
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ message: 'Not allowed to view this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    const userIdStr = String(userId);
    const formatted = messages.map((msg) => {
      const senderStr = msg.sender != null ? String(msg.sender) : '';
      return {
        id: msg._id,
        conversationId: msg.conversationId,
        sender: senderStr,
        text: msg.text,
        createdAt: msg.createdAt,
        isOwn: senderStr === userIdStr
      };
    });

    return res.status(200).json({
      message: 'Messages retrieved',
      messages: formatted,
      currentUserId: userIdStr
    });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

//Sending a message in a conversation
export async function sendMessage(req, res) {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const memberIds = conversation.members.map((m) => m.toString());
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ message: 'Not allowed to send in this conversation' });
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      text: text.trim()
    });

    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    return res.status(201).json({
      message: 'Message sent',
      message: {
        id: message._id,
        conversationId: message.conversationId,
        sender: message.sender,
        text: message.text,
        createdAt: message.createdAt,
        isOwn: true
      }
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Mark conversation as read by the current user
export async function markConversationRead(req, res) {
  try {
    const userId = String(req.user.userId);
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const memberIds = conversation.members.map((m) => m.toString());
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const lastReadAt = conversation.lastReadAt ? { ...conversation.lastReadAt } : {};
    lastReadAt[userId] = new Date();
    conversation.lastReadAt = lastReadAt;
    conversation.markModified('lastReadAt');
    await conversation.save();

    return res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
