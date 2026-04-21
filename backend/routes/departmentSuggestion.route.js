import express from "express";
import { MongoClient } from "mongodb";
import { featureExtraction } from "@huggingface/inference";

const router = express.Router();

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const EXPECTED_DIM = 384;

/** HF can return a single vector or one row per token; MiniLM needs mean pooling in the latter case. */
function normalizeEmbedding(raw) {
  if (!raw) throw new Error("Empty embedding response from Hugging Face");
  if (typeof raw[0] === "number") return raw;
  if (Array.isArray(raw[0]) && typeof raw[0][0] === "number") {
    const rows = raw;
    const dim = rows[0].length;
    const sum = new Array(dim).fill(0);
    for (const row of rows) {
      for (let i = 0; i < dim; i++) sum[i] += row[i];
    }
    return sum.map((s) => s / rows.length);
  }
  throw new Error("Unexpected embedding shape from Hugging Face");
}

async function getEmbedding(text) {
  const token = process.env.HF_API_KEY?.trim();
  if (!token) {
    const err = new Error("HF_API_KEY is missing in backend .env");
    err.code = "HF_CONFIG";
    throw err;
  }

  try {
    const out = await featureExtraction({
      accessToken: token,
      model: HF_MODEL,
      inputs: text,
    });
    const vector = normalizeEmbedding(out);
    if (vector.length !== EXPECTED_DIM) {
      throw new Error(
        `Embedding dimension is ${vector.length}, expected ${EXPECTED_DIM} for ${HF_MODEL}. Check Atlas index dimensions.`
      );
    }
    return vector;
  } catch (e) {
    const msg = String(e?.message || e);
    if (/permission|inference providers|insufficient permissions|403/i.test(msg)) {
      const err = new Error(
        "Hugging Face: this token cannot call Inference Providers. Create a fine-grained token at https://huggingface.co/settings/tokens with permission “Make calls to Inference Providers”, then set HF_API_KEY in backend .env."
      );
      err.code = "HF_INFERENCE_PERMISSION";
      throw err;
    }
    if (e?.code === "HF_CONFIG") throw e;
    const err = new Error(`Hugging Face embedding failed: ${msg}`);
    err.code = "HF_EMBED";
    err.cause = e;
    throw err;
  }
}

async function getAISuggestion(context, symptoms) {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    const err = new Error("GROQ_API_KEY is missing in backend .env");
    err.code = "GROQ_CONFIG";
    throw err;
  }

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: `You are a helpful hospital assistant.
Based on the retrieved records below, suggest the most appropriate department.

Retrieved records:
${context}

Patient symptoms: ${symptoms}

Respond with:
1. Recommended Department
2. Likely Condition
3. Brief Reason (1-2 sentences)`,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || JSON.stringify(data).slice(0, 300);
    const err = new Error(`Groq API error (${response.status}): ${detail}`);
    err.code = "GROQ_API";
    throw err;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error("Groq returned no message content");
    err.code = "GROQ_API";
    throw err;
  }
  return content;
}

router.post("/suggest", async (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
    return res.status(400).json({ error: "symptoms is required (non-empty string)" });
  }

  const symptomText = symptoms.trim();
  let client;

  try {
    const queryEmbedding = await getEmbedding(symptomText);

    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const dbName = process.env.MONGODB_RAG_DATABASE?.trim() || "hospital";
    const collection = client.db(dbName).collection("symptoms");
    const searchIndex = process.env.ATLAS_VECTOR_SEARCH_INDEX?.trim() || "default";

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: searchIndex,
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 50,
            limit: 3,
          },
        },
        {
          $project: {
            text: 1,
            disease: 1,
            department: 1,
            score: { $meta: "vectorSearchScore" },
            _id: 0,
          },
        },
      ])
      .toArray();

    const context = results.length
      ? results.map((r) => `- ${r.text} → Department: ${r.department}`).join("\n")
      : "(No similar records retrieved — knowledge base may be empty or vector index not matching this collection.)";

    const suggestion = await getAISuggestion(context, symptomText);

    res.json({ suggestion, matches: results });
  } catch (err) {
    console.error("departmentSuggestion /suggest:", err);

    const code = err?.code;
    if (code === "HF_INFERENCE_PERMISSION" || code === "HF_CONFIG" || code === "HF_EMBED") {
      return res.status(502).json({ error: err.message, code });
    }
    if (code === "GROQ_CONFIG" || code === "GROQ_API") {
      return res.status(502).json({ error: err.message, code });
    }

    const msg = String(err?.message || err);
    if (/Cannot execute \$search over vectorSearch index|not indexed as knnVector|Search index.*not found|index.*does not exist|knnBeta|\$vectorSearch/i.test(msg)) {
      return res.status(500).json({
        error:
          "MongoDB Atlas vector search failed. Ensure this API uses $vectorSearch with the same database/collection/index as Atlas, and the index maps `embedding` as a vector with 384 dimensions. If your index name is not `default`, set ATLAS_VECTOR_SEARCH_INDEX in backend .env.",
        detail: process.env.NODE_ENV === "development" ? msg.slice(0, 500) : undefined,
      });
    }

    res.status(500).json({
      error: "Something went wrong",
      detail: process.env.NODE_ENV === "development" ? msg.slice(0, 500) : undefined,
    });
  } finally {
    if (client) await client.close().catch(() => {});
  }
});

export default router;
