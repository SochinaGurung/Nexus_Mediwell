import Symptom from "../models/departmentSuggestion.model.js";

export const getBestDepartment = async (embedding) => {
  if (!Array.isArray(embedding) || embedding.length === 0) return null;

  const allSymptoms = await Symptom.find().lean();
  if (!allSymptoms.length) return null;

  const firstEmb = allSymptoms.find((s) => Array.isArray(s.embedding) && s.embedding.length)?.embedding;
  if (firstEmb?.length && firstEmb.length !== embedding.length) {
    const err = new Error(
      `EMBEDDING_DIM_MISMATCH: query vector length ${embedding.length} does not match stored vectors (${firstEmb.length}). Re-embed RAG data with the same model (text-embedding-3-small) and dimensions.`
    );
    err.code = "EMBEDDING_DIM_MISMATCH";
    throw err;
  }

  let bestMatch = null;
  let highestScore = -1;

  for (const symptom of allSymptoms) {
    const score = cosineSimilarity(embedding, symptom.embedding);
    if (Number.isFinite(score) && score > highestScore) {
      highestScore = score;
      bestMatch = symptom;
    }
  }

  return bestMatch;
};

const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  const n = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < n; i++) {
    const a = Number(vecA[i]);
    const b = Number(vecB[i]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  const da = Math.sqrt(magA);
  const db = Math.sqrt(magB);
  if (da === 0 || db === 0) return 0;
  return dot / (da * db);
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "i",
  "my",
  "me",
  "we",
  "our",
  "you",
  "your",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "am",
  "not",
  "no",
  "so",
  "as",
  "if",
  "when",
  "how",
  "what",
  "which",
  "who",
  "can",
  "could",
  "would",
  "will",
  "just",
  "very",
  "some",
  "any",
  "all",
  "also",
  "too",
  "about",
  "into",
  "over",
  "after",
  "before",
  "during",
  "feel",
  "feeling",
  "felt",
  "get",
  "got",
  "getting",
]);

function normTokens(s) {
  const raw = String(s || "")
    .toLowerCase()
    .match(/[a-z0-9']+/g);
  if (!raw) return [];
  return raw.filter((w) => w.length > 1 && !STOPWORDS.has(w));
}


export const getBestDepartmentByText = async (query) => {
  const allSymptoms = await Symptom.find().lean();
  if (!allSymptoms.length) return null;

  const qTokens = normTokens(query);
  const qSet = new Set(qTokens);
  if (qSet.size === 0) return null;

  let bestMatch = null;
  let bestScore = -1;

  for (const row of allSymptoms) {
    const doc = `${row.text || ""} ${row.disease || ""} ${row.department || ""}`;
    const dTokens = normTokens(doc);
    const dSet = new Set(dTokens);

    let inter = 0;
    for (const t of qSet) {
      if (dSet.has(t)) inter += 2;
      else if (t.length >= 4 && doc.toLowerCase().includes(t)) inter += 1;
    }

    const ql = String(query).toLowerCase().replace(/\s+/g, " ").trim();
    const docLower = doc.toLowerCase();
    let phraseBonus = 0;
    if (ql.length >= 5) {
      const prefix = ql.slice(0, Math.min(48, ql.length));
      if (docLower.includes(prefix)) phraseBonus += 6;
    }

    const score = inter + phraseBonus;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  if (bestScore < 1) return null;
  return bestMatch;
};