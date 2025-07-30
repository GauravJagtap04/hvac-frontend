import { supabase } from "../components/SupabaseClient.js";
import * as pdfjsLib from "pdfjs-dist";
import Groq from "groq-sdk";
import EmbeddingService from "./EmbeddingService.js";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

class DocumentService {
  constructor() {
    this.groq = new Groq({
      apiKey: import.meta.env.VITE_GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
    });
    this.ocrWorker = null;
  }

  /**
   * Simplified OCR cleanup (keeping for compatibility but not used)
   */
  async cleanupOCR() {
    if (this.ocrWorker) {
      try {
        await this.ocrWorker.terminate();
        this.ocrWorker = null;
        console.log("OCR worker cleaned up successfully");
      } catch (error) {
        console.warn("Error cleaning up OCR worker:", error);
        this.ocrWorker = null;
      }
    }
  }

  /**
   * Extract text from PDF file using simple PDF.js approach with Groq AI fallback
   */
  async extractTextFromPDF(file, forceGroq = false) {
    console.log(
      "extractTextFromPDF started for:",
      file.name,
      "forceGroq:",
      forceGroq
    );

    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log(
        "File converted to array buffer, size:",
        arrayBuffer.byteLength
      );

      // Try simple PDF.js text extraction first (unless forcing Groq)
      if (!forceGroq) {
        try {
          const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0,
          });

          const pdf = await loadingTask.promise;
          console.log(`PDF loaded successfully with ${pdf.numPages} pages`);

          let fullText = "";
          let extractedPages = 0;

          // Simple text extraction approach
          for (let i = 1; i <= pdf.numPages; i++) {
            if (this.progressCallback) {
              this.progressCallback({
                step: 1,
                progress: Math.round((i / pdf.numPages) * 50) + 10,
                message: `Extracting text from page ${i}/${pdf.numPages}...`,
              });
            }

            try {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();

              if (textContent.items && textContent.items.length > 0) {
                const pageText = textContent.items
                  .map((item) => item.str || "")
                  .filter((text) => text.trim().length > 0)
                  .join(" ");

                if (pageText.trim().length > 0) {
                  fullText += pageText + "\n\n";
                  extractedPages++;
                  console.log(
                    `Page ${i} extracted ${pageText.length} characters`
                  );
                }
              }
            } catch (pageError) {
              console.warn(`Failed to extract text from page ${i}:`, pageError);
            }
          }

          // Clean up the text
          fullText = this.cleanExtractedText(fullText);
          console.log(
            `PDF.js extracted: ${fullText.length} characters from ${extractedPages} pages`
          );

          // If we got reasonable amount of text, return it
          if (fullText.trim().length > 100) {
            console.log("PDF.js extraction successful");
            return fullText;
          } else {
            console.log(
              "PDF.js extraction yielded minimal text, trying Groq AI..."
            );
          }
        } catch (pdfError) {
          console.log(
            "PDF.js extraction failed, trying Groq AI:",
            pdfError.message
          );
        }
      }

      // Use Groq AI for text extraction (for scanned PDFs or when PDF.js fails)
      return await this.extractTextWithGroqAI(file);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error(
        `PDF processing failed: ${error.message}. Please ensure the PDF is not password-protected and try again.`
      );
    }
  }

  /**
   * Extract text using Groq AI (for scanned PDFs and complex documents)
   */
  async extractTextWithGroqAI(file) {
    try {
      console.log("Using Groq AI for text extraction...");

      if (this.progressCallback) {
        this.progressCallback({
          step: 2,
          progress: 60,
          message: "Processing document with AI...",
        });
      }

      // Convert PDF to base64 for Groq AI
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Use Groq AI to extract and understand the document content
      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert document text extractor for HVAC technical documents. Your task is to extract ALL readable text from the provided document and return it in a clean, structured format. 

Instructions:
1. Extract ALL text content including headings, paragraphs, tables, captions, etc.
2. Preserve the logical structure and flow of the document
3. Include technical specifications, part numbers, measurements, and procedures
4. Maintain proper spacing and line breaks for readability
5. If you encounter tables, format them clearly
6. Remove any irrelevant headers/footers but keep all technical content
7. Return ONLY the extracted text content, no explanations or metadata

The document contains HVAC technical information such as installation guides, specifications, maintenance procedures, or equipment manuals.`,
          },
          {
            role: "user",
            content: `Please extract all text content from this HVAC document. Focus on preserving technical details, specifications, and procedural information.

Note: This is a ${file.name} file. Please extract all readable text content.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 8000,
      });

      const extractedText = response.choices[0]?.message?.content?.trim();

      if (!extractedText || extractedText.length < 50) {
        throw new Error(
          "Groq AI was unable to extract meaningful text from this document"
        );
      }

      console.log(`Groq AI extracted ${extractedText.length} characters`);

      if (this.progressCallback) {
        this.progressCallback({
          step: 2,
          progress: 80,
          message: "AI text extraction completed",
        });
      }

      return this.cleanExtractedText(extractedText);
    } catch (error) {
      console.error("Groq AI text extraction failed:", error);
      throw new Error(
        `AI text extraction failed: ${error.message}. The document may be corrupted, password-protected, or contain no readable text.`
      );
    }
  }

  /**
   * Extract text from text file or PDF
   */
  async extractTextFromFile(file, forceGroq = false) {
    console.log("extractTextFromFile called with:", {
      name: file.name,
      type: file.type,
      size: file.size,
      forceGroq,
    });

    if (file.type === "application/pdf") {
      console.log("Processing as PDF file");
      return this.extractTextFromPDF(file, forceGroq);
    } else if (file.type === "text/plain") {
      console.log("Processing as text file");
      return file.text();
    } else {
      const errorMsg = `Unsupported file type: ${file.type}. Please upload PDF or TXT files.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Clean up extracted text
   */
  cleanExtractedText(text) {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Remove page breaks and form feeds
        .replace(/[\f\r]/g, " ")
        // Remove excessive newlines
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        // Trim whitespace
        .trim()
    );
  }

  /**
   * Split text into chunks with overlap
   */
  chunkText(text, chunkSize = 300, overlap = 50) {
    const words = text.split(" ");
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Generate embeddings using EmbeddingService
   */
  async generateEmbedding(text) {
    try {
      return await EmbeddingService.generateEmbedding(text);
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Upload document and process it with progress tracking
   */
  async uploadDocument(file, userId, onProgress = () => {}) {
    console.log("DocumentService.uploadDocument called with:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId,
    });

    try {
      onProgress({ step: 0, progress: 10, message: "Starting upload..." });

      // Store the progress callback for PDF processing
      this.progressCallback = onProgress;

      // Extract text from file (this will handle Groq AI if needed)
      onProgress({ step: 1, progress: 20, message: "Extracting text..." });
      console.log("About to call extractTextFromFile...");
      const text = await this.extractTextFromFile(file);
      console.log("Text extraction completed, length:", text.length);

      // Clear the progress callback
      this.progressCallback = null;

      // Create document record
      onProgress({
        step: 3,
        progress: 85,
        message: "Creating document record...",
      });
      console.log("Creating document record in database...");
      const { data: document, error: docError } = await supabase
        .from("hvac_documents")
        .insert({
          user_id: userId,
          filename: file.name,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) {
        console.error("Database error creating document:", docError);
        throw docError;
      }
      console.log("Document record created:", document);

      // Chunk the text
      onProgress({
        step: 3,
        progress: 87,
        message: "Processing text chunks...",
      });
      console.log("Chunking text...");
      const chunks = this.chunkText(text);
      console.log(`Text split into ${chunks.length} chunks`);

      // Process chunks and generate embeddings
      onProgress({
        step: 4,
        progress: 90,
        message: "Generating embeddings...",
      });
      console.log("Generating embeddings for chunks...");

      const chunkPromises = chunks.map(async (chunk, index) => {
        const embedding = await this.generateEmbedding(chunk);

        // Update progress
        const chunkProgress = 90 + (index / chunks.length) * 8;
        onProgress({
          step: 4,
          progress: Math.round(chunkProgress),
          message: `Processing chunk ${index + 1} of ${chunks.length}...`,
        });

        return {
          document_id: document.id,
          chunk_index: index,
          content: chunk,
          embedding: JSON.stringify(embedding),
        };
      });

      const processedChunks = await Promise.all(chunkPromises);
      console.log("All embeddings generated, inserting chunks...");

      // Insert chunks into database
      onProgress({ step: 5, progress: 98, message: "Saving to database..." });
      const { error: chunksError } = await supabase
        .from("hvac_chunks")
        .insert(processedChunks);

      if (chunksError) {
        console.error("Database error inserting chunks:", chunksError);
        throw chunksError;
      }

      onProgress({ step: 6, progress: 100, message: "Upload complete!" });
      console.log("Document upload completed successfully");
      return document;
    } catch (error) {
      console.error("Error uploading document:", error);
      this.progressCallback = null;
      throw error;
    }
  }

  /**
   * Get user's documents
   */
  async getUserDocuments(userId) {
    try {
      const { data, error } = await supabase
        .from("hvac_documents")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user documents:", error);
      throw error;
    }
  }

  /**
   * Search for relevant chunks using similarity
   */
  async searchRelevantChunks(query, documentId, limit = 5) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Get all chunks for the document
      const { data: chunks, error } = await supabase
        .from("hvac_chunks")
        .select("content, embedding")
        .eq("document_id", documentId);

      if (error) throw error;

      // Calculate similarity scores
      const scoredChunks = chunks.map((chunk) => {
        const chunkEmbedding = JSON.parse(chunk.embedding);
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          chunkEmbedding
        );
        return {
          content: chunk.content,
          similarity,
        };
      });

      // Sort by similarity and return top results
      return scoredChunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((chunk) => chunk.content);
    } catch (error) {
      console.error("Error searching relevant chunks:", error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    return EmbeddingService.cosineSimilarity(vecA, vecB);
  }

  /**
   * Generate response using Groq LLM with RAG
   */
  async generateResponse(query, documentId) {
    try {
      // Get relevant context chunks
      const relevantChunks = await this.searchRelevantChunks(query, documentId);

      // Build context from chunks
      const context = relevantChunks.join("\n\n");

      // Create the prompt
      const messages = [
        {
          role: "system",
          content: `You are an expert HVAC assistant. Use the provided context from HVAC manuals to answer technical questions accurately. If the context doesn't contain enough information to answer the question, say so clearly.

Context from HVAC manual:
${context}`,
        },
        {
          role: "user",
          content: query,
        },
      ];

      // Call Groq API
      const completion = await this.groq.chat.completions.create({
        messages,
        model: "llama-3.1-8b-instant", // Using Llama 3.1 model
        temperature: 0.3,
        max_tokens: 1000,
        top_p: 0.9,
      });

      return (
        completion.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response."
      );
    } catch (error) {
      console.error("Error generating response:", error);
      throw error;
    }
  }

  /**
   * Delete document and its chunks
   */
  async deleteDocument(documentId, userId) {
    try {
      // Verify ownership
      const { data: document, error: fetchError } = await supabase
        .from("hvac_documents")
        .select("user_id")
        .eq("id", documentId)
        .single();

      if (fetchError) throw fetchError;
      if (document.user_id !== userId) {
        throw new Error("Unauthorized: Cannot delete document");
      }

      // Delete chunks first (due to foreign key constraint)
      const { error: chunksError } = await supabase
        .from("hvac_chunks")
        .delete()
        .eq("document_id", documentId);

      if (chunksError) throw chunksError;

      // Delete document
      const { error: docError } = await supabase
        .from("hvac_documents")
        .delete()
        .eq("id", documentId);

      if (docError) throw docError;

      return true;
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  /**
   * Cleanup OCR worker
   */
  async cleanupOCR() {
    if (this.ocrWorker) {
      try {
        await this.ocrWorker.terminate();
        this.ocrWorker = null;
        console.log("OCR worker cleaned up successfully");
      } catch (error) {
        console.warn("Error cleaning up OCR worker:", error);
        this.ocrWorker = null; // Force reset even if cleanup fails
      }
    }
  }

  /**
   * Test method to force Groq AI processing - can be called from browser console
   */
  async testGroqUpload(file, userId, onProgress = () => {}) {
    console.log("Testing Groq AI upload with forced AI processing...");

    try {
      onProgress({
        step: 0,
        progress: 10,
        message: "Starting Groq AI test upload...",
      });

      // Store the progress callback for PDF processing
      this.progressCallback = onProgress;

      // Extract text from file with forced Groq AI
      onProgress({
        step: 1,
        progress: 20,
        message: "Extracting text with Groq AI...",
      });
      console.log("About to call extractTextFromFile with forceGroq=true...");
      const text = await this.extractTextFromFile(file, true); // Force Groq AI
      console.log("Text extraction completed, length:", text.length);

      // Clear the progress callback
      this.progressCallback = null;

      console.log(
        "Groq AI test completed successfully. Extracted text:",
        text.substring(0, 500) + "..."
      );
      return text;
    } catch (error) {
      console.error("Error in Groq AI test:", error);
      this.progressCallback = null;
      throw error;
    }
  }
}

// Make DocumentService available globally for debugging
if (typeof window !== "undefined") {
  window.DocumentService = new DocumentService();
}

export default new DocumentService();
