/**
 * Embedding Service for generating text embeddings
 * Supports multiple providers: OpenAI, HuggingFace, local models
 */

class EmbeddingService {
  constructor() {
    this.provider = "local"; // Default to local implementation
    this.dimension = 1536; // Standard embedding dimension
  }

  /**
   * Generate embeddings using the configured provider
   */
  async generateEmbedding(text) {
    switch (this.provider) {
      case "openai":
        return this.generateOpenAIEmbedding(text);
      case "huggingface":
        return this.generateHuggingFaceEmbedding(text);
      case "local":
      default:
        return this.generateLocalEmbedding(text);
    }
  }

  /**
   * Generate embedding using OpenAI API (requires API key)
   */
  async generateOpenAIEmbedding(text) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        throw new Error("OpenAI API request failed");
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.warn("OpenAI embedding failed, falling back to local:", error);
      return this.generateLocalEmbedding(text);
    }
  }

  /**
   * Generate embedding using HuggingFace Inference API
   */
  async generateHuggingFaceEmbedding(text) {
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("HuggingFace API request failed");
      }

      const embedding = await response.json();

      // Pad or truncate to match expected dimension
      return this.normalizeEmbedding(embedding, this.dimension);
    } catch (error) {
      console.warn(
        "HuggingFace embedding failed, falling back to local:",
        error
      );
      return this.generateLocalEmbedding(text);
    }
  }

  /**
   * Generate embedding using local implementation (deterministic hash-based)
   */
  async generateLocalEmbedding(text) {
    try {
      // Preprocess text
      const processedText = this.preprocessText(text);

      // Create multiple hash-based features
      const features = await this.extractFeatures(processedText);

      // Generate embedding vector
      const embedding = this.createEmbeddingVector(features);

      return embedding;
    } catch (error) {
      console.error("Local embedding generation failed:", error);
      throw error;
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
   * Extract multiple features from text
   */
  async extractFeatures(text) {
    const features = {
      words: text.split(" ").filter((w) => w.length > 2),
      bigrams: this.generateNGrams(text, 2),
      trigrams: this.generateNGrams(text, 3),
      chars: text.replace(/\s/g, ""),
      length: text.length,
    };

    // Generate hash-based features
    const hashFeatures = await Promise.all([
      this.hashText(features.words.join(" ")),
      this.hashText(features.bigrams.join(" ")),
      this.hashText(features.trigrams.join(" ")),
      this.hashText(features.chars),
    ]);

    return {
      ...features,
      hashes: hashFeatures,
    };
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
   * Hash text to create consistent numeric features
   */
  async hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer));
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
          embedding[hashIndex] = (value - 127.5) / 127.5; // Normalize to [-1, 1]
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
}

export default new EmbeddingService();
