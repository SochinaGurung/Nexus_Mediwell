import { MongoClient } from "mongodb";
import OpenAI from "openai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Loading the RAG data
const rawData = fs.readFileSync("./rag_data.json", "utf-8");
const data = JSON.parse(rawData);

async function run() {
  try {
    await client.connect();

    const ragDb = process.env.MONGODB_RAG_DATABASE?.trim();
    const db = ragDb ? client.db(ragDb) : client.db();
    const collection = db.collection("symptoms");

    //Clearing old data
    await collection.deleteMany({});

    for (let item of data.slice(0,5)) {
      console.log("Embedding:", item.disease);

      // Create embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: item.text,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Storing in MongoDB
      await collection.insertOne({
        text: item.text,
        disease: item.disease,
        department: item.department,
        embedding: embedding,
      });
    }

    console.log("All data have been embedded and stored!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();