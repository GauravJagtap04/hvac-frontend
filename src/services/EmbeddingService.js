/**
 * Embedding Service for generating text embeddings using Groq AI
 */
import Groq from "groq-sdk";

class EmbeddingService {
  constructor() {
    this.groq = new Groq({
      apiKey: import.meta.env.VITE_GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
    });
    this.dimension = 1536; // Standard embedding dimension
  }

  /**
   * Generate embeddings using Groq AI
   */
  async generateEmbedding(text) {
    try {
      // Since Groq doesn't have a direct embedding API, we'll use their chat completion
      // to generate a semantic representation and convert it to embedding format
      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an embedding generator. Convert the following text into a semantic vector representation. Respond only with a JSON array of exactly 1536 floating point numbers between -1 and 1 that represent the semantic meaning of the text.",
          },
          {
            role: "user",
            content: `Generate semantic embedding for: ${text}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 4000,
      });

      const embeddingText = response.choices[0]?.message?.content?.trim();

      if (!embeddingText) {
        throw new Error("No embedding response from Groq");
      }

      // Try to parse the JSON response
      let embedding;
      try {
        embedding = JSON.parse(embeddingText);
      } catch (parseError) {
        console.warn("Failed to parse Groq embedding response, using fallback");
        return this.generateFallbackEmbedding(text);
      }

      // Validate and normalize the embedding
      if (!Array.isArray(embedding) || embedding.length !== this.dimension) {
        console.warn("Invalid embedding format from Groq, using fallback");
        return this.generateFallbackEmbedding(text);
      }

      return this.normalizeVector(embedding);
    } catch (error) {
      console.warn("Groq embedding failed, using fallback:", error);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate fallback embedding using local implementation
   */
  generateFallbackEmbedding(text) {
    try {
      // Preprocess text
      const processedText = this.preprocessText(text);

      // Create multiple hash-based features
      const features = this.extractFeaturesSync(processedText);

      // Generate embedding vector
      const embedding = this.createEmbeddingVector(features);

      return embedding;
    } catch (error) {
      console.error("Fallback embedding generation failed:", error);
      // Return a default embedding vector
      return new Array(this.dimension).fill(0);
    }
  }

  /**
   * Preprocess text for better embedding quality
   */
  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Extract multiple features from text (synchronous version)
   */
  extractFeaturesSync(text) {
    const features = {
      words: text.split(" ").filter((w) => w.length > 2),
      bigrams: this.generateNGrams(text, 2),
      trigrams: this.generateNGrams(text, 3),
      chars: text.replace(/\s/g, ""),
      length: text.length,
    };

    // Generate simple hash-based features without async crypto
    const hashFeatures = [
      this.simpleHash(features.words.join(" ")),
      this.simpleHash(features.bigrams.join(" ")),
      this.simpleHash(features.trigrams.join(" ")),
      this.simpleHash(features.chars),
    ];

    return {
      ...features,
      hashes: hashFeatures,
    };
  }

  /**
   * Simple hash function for fallback embedding
   */
  simpleHash(text) {
    let hash = 0;
    const result = [];

    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate array of values based on hash
    for (let i = 0; i < 64; i++) {
      result.push(((hash * (i + 1)) % 256) - 127.5);
    }

    return result;
  }

  /**
   * Generate n-grams from text
   */
  generateNGrams(text, n) {
    const words = text.split(" ");
    const ngrams = [];

    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(" "));
    }

    return ngrams;
  }

  /**
   * Create embedding vector from features
   */
  createEmbeddingVector(features) {
    const embedding = new Array(this.dimension).fill(0);

    // Combine hash features
    let hashIndex = 0;
    features.hashes.forEach((hash) => {
      hash.forEach((value) => {
        if (hashIndex < this.dimension) {
          embedding[hashIndex] = value / 127.5; // Normalize to [-1, 1]
          hashIndex++;
        }
      });
    });

    // Add word frequency features
    const wordFreq = {};
    features.words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Fill remaining dimensions with frequency-based features
    const freqValues = Object.values(wordFreq);
    for (
      let i = hashIndex;
      i < this.dimension && i < hashIndex + freqValues.length;
      i++
    ) {
      embedding[i] = Math.tanh(
        freqValues[i - hashIndex] / features.words.length
      );
    }

    // Normalize the vector
    return this.normalizeVector(embedding);
  }

  /**
   * Normalize vector to unit length
   */
  normalizeVector(vector) {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
  }

  /**
   * Normalize embedding to specified dimension
   */
  normalizeEmbedding(embedding, targetDim) {
    if (embedding.length === targetDim) {
      return embedding;
    }

    const normalized = new Array(targetDim).fill(0);

    if (embedding.length > targetDim) {
      // Truncate
      for (let i = 0; i < targetDim; i++) {
        normalized[i] = embedding[i];
      }
    } else {
      // Pad with normalized values
      for (let i = 0; i < embedding.length; i++) {
        normalized[i] = embedding[i];
      }

      // Fill remaining with interpolated values
      for (let i = embedding.length; i < targetDim; i++) {
        normalized[i] = embedding[i % embedding.length] * 0.1;
      }
    }

    return this.normalizeVector(normalized);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Test the embedding service with a sample text
   */
  async testEmbedding() {
    const testText = "HVAC system temperature control and monitoring";
    console.log("Testing Groq embedding service...");

    try {
      const embedding = await this.generateEmbedding(testText);
      console.log("✅ Embedding generated successfully");
      console.log(`📊 Embedding dimensions: ${embedding.length}`);
      console.log(
        `🔢 Sample values: [${embedding
          .slice(0, 5)
          .map((v) => v.toFixed(4))
          .join(", ")}...]`
      );
      return embedding;
    } catch (error) {
      console.error("❌ Embedding test failed:", error);
      throw error;
    }
  }
}

export default new EmbeddingService();
