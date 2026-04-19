import mongoose from "mongoose";

const SymptomSchema = new mongoose.Schema({
  text: { type: String, required: true },
  disease: { type: String, required: true },
  department: { type: String, required: true },
  embedding: { type: [Number], required: true },
});

const ragDb = process.env.MONGODB_RAG_DATABASE?.trim();

const Symptom =
  ragDb
    ? mongoose
        .createConnection(process.env.MONGO_URI, { dbName: ragDb })
        .model("Symptom", SymptomSchema)
    : mongoose.models.Symptom || mongoose.model("Symptom", SymptomSchema);

export default Symptom;
