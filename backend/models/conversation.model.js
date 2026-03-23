import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    members: {
      type: [String], // [userA_id, userB_id]
    },
    // lastReadAt[userId] = date when that user last read this conversation
    lastReadAt: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);
