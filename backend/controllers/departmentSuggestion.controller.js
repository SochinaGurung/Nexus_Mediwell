import { getBestDepartment, getBestDepartmentByText } from "../services/departmentSuggestion.service.js";
import OpenAI from "openai";

/** maxRetries: 0 — SDK default (2) stacks fast retries on 429 and burns TPM; we backoff ourselves. */
const openaiClient =
  process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim()
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 })
    : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openaiErrCode(err) {
  return err?.code || err?.error?.code || err?.error?.type;
}

function isInsufficientQuota(err) {
  const code = String(openaiErrCode(err) || "");
  const msg = String(err?.message || err?.error?.message || "");
  return (
    code === "insufficient_quota" ||
    /insufficient_quota|exceeded your current quota|Please check your plan and billing/i.test(msg)
  );
}

/** Local/demo only: skip OpenAI and return a safe generic suggestion. Set MEDWELL_SYMPTOM_CHATBOT_STUB=1 in backend .env — do not use in production. */
function isSymptomChatbotStub() {
  const v = String(process.env.MEDWELL_SYMPTOM_CHATBOT_STUB || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Same symptom text → same answer without calling OpenAI again (dev + repeat users). */
const SYMPTOM_CACHE_TTL_MS = 20 * 60 * 1000;
const SYMPTOM_CACHE_MAX = 400;
const symptomResultCache = new Map();

function normalizeSymptomKey(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 2000);
}

function cacheGet(key) {
  const row = symptomResultCache.get(key);
  if (!row) return null;
  if (row.expires <= Date.now()) {
    symptomResultCache.delete(key);
    return null;
  }
  return row.body;
}

function cacheSet(key, body) {
  symptomResultCache.set(key, { expires: Date.now() + SYMPTOM_CACHE_TTL_MS, body });
  while (symptomResultCache.size > SYMPTOM_CACHE_MAX) {
    const oldest = symptomResultCache.keys().next().value;
    symptomResultCache.delete(oldest);
  }
}

/** OpenAI often returns 429 under burst traffic; retry with backoff + optional Retry-After. */
async function createEmbeddingForSymptoms(symptomText) {
  const input = `A patient reports these symptoms: ${symptomText}`;
  let lastErr;
  const maxAttempts = 7;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input,
      });
    } catch (e) {
      lastErr = e;
      if (isInsufficientQuota(e)) throw e;

      const status = e?.status ?? e?.statusCode;
      const msg = String(e?.message || "");
      const is429 = status === 429 || /rate limit|429/i.test(msg);
      if (!is429 || attempt === maxAttempts - 1) throw e;

      const ra =
        (typeof e?.headers?.get === "function" && e.headers.get("retry-after")) ||
        e?.response?.headers?.["retry-after"];
      const retryAfterSec = ra != null ? Number(ra) : NaN;
      const fromHeader = Number.isFinite(retryAfterSec) ? Math.min(retryAfterSec * 1000, 120_000) : null;
      const backoff = Math.min(4000 * 2 ** attempt, 45_000);
      const waitMs = fromHeader ?? backoff;
      console.warn(`OpenAI embeddings rate-limited (429), waiting ${waitMs}ms before retry ${attempt + 2}/${maxAttempts}`);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

export const findDepartment = async (req, res) => {
  try {
    const { embedding } = req.body;
    if (!embedding) return res.status(400).json({ error: "embedding is required" });

    let bestMatch;
    try {
      bestMatch = await getBestDepartment(embedding);
    } catch (inner) {
      if (inner?.code === "EMBEDDING_DIM_MISMATCH") {
        return res.status(400).json({ error: inner.message });
      }
      throw inner;
    }
    if (!bestMatch) return res.status(404).json({ error: "No matching department found" });

    return res.json({
      disease: bestMatch.disease,
      department: bestMatch.department
    });
  } catch (err) {
    console.error("findDepartment:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/** Public-friendly: symptom text → embedding → best department (for landing chatbot). */
export const findDepartmentBySymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
      return res.status(400).json({ error: "symptoms text is required" });
    }

    const symptomText = symptoms.trim();
    const cacheKey = normalizeSymptomKey(symptomText);
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    if (isSymptomChatbotStub()) {
      console.warn(
        "MEDWELL_SYMPTOM_CHATBOT_STUB is enabled: symptom chatbot returns a demo answer without calling OpenAI."
      );
      const payload = {
        symptoms: symptomText,
        disease: "General evaluation (demo mode — not from AI)",
        department: "General Medicine",
      };
      cacheSet(cacheKey, payload);
      return res.json(payload);
    }

    /**
     * SYMPTOM_MATCH_MODE:
     * - text — no OpenAI; match user text to MongoDB RAG rows (word overlap).
     * - embedding — OpenAI embeddings only (needs quota).
     * - auto (default) — embeddings if OPENAI_API_KEY is set; otherwise text-only; on insufficient quota, one-time text fallback.
     */
    const modeRaw = String(process.env.SYMPTOM_MATCH_MODE || "auto").trim().toLowerCase();
    const mode = ["auto", "text", "embedding"].includes(modeRaw) ? modeRaw : "auto";
    const useTextOnly = mode === "text" || (mode === "auto" && !openaiClient);

    if (useTextOnly) {
      const textMatch = await getBestDepartmentByText(symptomText);
      if (!textMatch) {
        return res.status(404).json({
          error:
            "No close match in the symptom knowledge base. Try different wording, or use SYMPTOM_MATCH_MODE=embedding with OpenAI for smarter matching.",
        });
      }
      const payload = {
        symptoms: symptomText,
        disease: textMatch.disease,
        department: textMatch.department,
      };
      cacheSet(cacheKey, payload);
      return res.json(payload);
    }

    if (!openaiClient) {
      return res.status(503).json({
        error:
          "SYMPTOM_MATCH_MODE is embedding but OPENAI_API_KEY is not set. Use SYMPTOM_MATCH_MODE=text or auto, or add OPENAI_API_KEY.",
      });
    }

    try {
      const embeddingResponse = await createEmbeddingForSymptoms(symptomText);

      const embedding = embeddingResponse.data?.[0]?.embedding;
      if (!embedding) {
        return res.status(500).json({ error: "Failed to generate embedding" });
      }

      let bestMatch;
      try {
        bestMatch = await getBestDepartment(embedding);
      } catch (inner) {
        if (inner?.code === "EMBEDDING_DIM_MISMATCH") {
          return res.status(400).json({ error: inner.message });
        }
        throw inner;
      }
      if (!bestMatch) {
        return res.status(404).json({ error: "No matching department found" });
      }

      const payload = {
        symptoms: symptomText,
        disease: bestMatch.disease,
        department: bestMatch.department,
      };
      cacheSet(cacheKey, payload);
      return res.json(payload);
    } catch (inner) {
      if (isInsufficientQuota(inner) && mode === "auto") {
        const fallback = await getBestDepartmentByText(symptomText);
        if (fallback) {
          console.warn("findDepartmentBySymptoms: OpenAI quota exhausted; using text-only fallback");
          const payload = {
            symptoms: symptomText,
            disease: fallback.disease,
            department: fallback.department,
          };
          cacheSet(cacheKey, payload);
          return res.json(payload);
        }
      }
      throw inner;
    }
  } catch (err) {
    console.error("findDepartmentBySymptoms:", err);
    const status = err?.status ?? err?.statusCode;
    const msg = String(err?.message || err?.error?.message || "");

    if (status === 401 || /incorrect api key|invalid api key|authentication/i.test(msg)) {
      return res.status(502).json({
        error: "OpenAI rejected the API key. Check OPENAI_API_KEY in backend .env (no extra quotes or spaces).",
      });
    }
    if (isInsufficientQuota(err)) {
      return res.status(402).json({
        error:
          "This API key has no OpenAI usage left (quota / billing). Options: (1) Add credits at https://platform.openai.com/account/billing (2) Set SYMPTOM_MATCH_MODE=text in backend .env to match symptoms locally without OpenAI (3) MEDWELL_SYMPTOM_CHATBOT_STUB=1 for a fixed demo reply.",
      });
    }
    if (status === 429 || /rate limit/i.test(msg)) {
      return res.status(429).json({
        error:
          "The AI service is rate-limited right now. Wait 1–2 minutes and try again, or add billing on your OpenAI account for higher limits.",
      });
    }
    if (/quota|billing/i.test(msg)) {
      return res.status(402).json({ error: "OpenAI quota or billing issue. Check your OpenAI account billing." });
    }

    return res.status(500).json({
      error: "Server error",
      detail: process.env.NODE_ENV === "development" ? msg.slice(0, 500) : undefined,
    });
  }
};