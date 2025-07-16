import { supabase } from "../components/SupabaseClient.js";
import * as pdfjsLib from "pdfjs-dist";
import Groq from "groq-sdk";
import EmbeddingService from "./EmbeddingService.js";
import { createWorker } from "tesseract.js";

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
   * Initialize OCR worker
   */
  async initializeOCR() {
    if (!this.ocrWorker) {
      console.log("Creating new OCR worker...");
      try {
        // Create worker with proper browser configuration
        this.ocrWorker = await createWorker("eng", 1, {
          logger: (m) => console.log("Tesseract:", m),
          errorHandler: (err) => console.error("Tesseract error:", err),
        });

        // Additional setup for better OCR performance
        await this.ocrWorker.setParameters({
          tessedit_pageseg_mode: "1", // Automatic page segmentation with OSD
          tessedit_char_whitelist:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?-()[]{}:;/\\@#$%^&*+=<>|`~\"'",
        });

        console.log("OCR worker created and configured successfully");
      } catch (error) {
        console.error("Failed to create OCR worker:", error);
        throw new Error(`OCR initialization failed: ${error.message}`);
      }
    }
    return this.ocrWorker;
  }

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageData) {
    try {
      console.log("Starting OCR text extraction from image...");
      const worker = await this.initializeOCR();
      const result = await worker.recognize(imageData);
      console.log(
        "OCR extraction completed, confidence:",
        result.data.confidence
      );
      console.log("Extracted text length:", result.data.text.length);
      return result.data.text;
    } catch (error) {
      console.error("OCR extraction failed:", error);
      return "";
    }
  }

  /**
   * Convert PDF page to image and extract text using OCR
   */
  async extractTextFromPDFPageWithOCR(page) {
    try {
      console.log("Converting PDF page to image for OCR...");
      // Get page dimensions
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      console.log(
        "Page viewport dimensions:",
        viewport.width,
        "x",
        viewport.height
      );

      // Create canvas
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      console.log("Rendering PDF page to canvas...");
      await page.render(renderContext).promise;
      console.log("PDF page rendered successfully");

      // Convert canvas to image data
      const imageData = canvas.toDataURL("image/png");
      console.log("Canvas converted to image data, size:", imageData.length);

      // Extract text using OCR
      const text = await this.extractTextFromImage(imageData);

      // Clean up canvas
      canvas.remove();

      console.log(
        "OCR page processing completed, extracted text length:",
        text.length
      );
      return text;
    } catch (error) {
      console.error("Error extracting text from PDF page with OCR:", error);
      return "";
    }
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(file, forceOCR = false) {
    console.log(
      "extractTextFromPDF started for:",
      file.name,
      "forceOCR:",
      forceOCR
    );

    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log(
        "File converted to array buffer, size:",
        arrayBuffer.byteLength
      );

      // Configure PDF.js with better error handling
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
      });

      console.log("PDF loading task created, awaiting PDF document...");
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully with ${pdf.numPages} pages`);

      let fullText = "";
      let extractedPages = 0;
      let totalTextLength = 0;

      console.log(`Processing PDF with ${pdf.numPages} pages...`);

      // First pass: Try normal text extraction
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages}`);
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
          });

          if (textContent.items && textContent.items.length > 0) {
            console.log(`Page ${i} has ${textContent.items.length} text items`);
            const pageText = textContent.items
              .map((item) => {
                // Handle different item types
                if (typeof item.str === "string") {
                  return item.str;
                }
                return "";
              })
              .filter((text) => text.trim().length > 0)
              .join(" ");

            if (pageText.trim().length > 0) {
              fullText += pageText + "\n\n";
              extractedPages++;
              totalTextLength += pageText.length;
              console.log(`Page ${i} extracted ${pageText.length} characters`);
            } else {
              console.log(`Page ${i} has no readable text`);
            }
          } else {
            console.log(`Page ${i} has no text items`);
          }

          // Progress callback for UI
          if (this.progressCallback) {
            this.progressCallback({
              step: 1,
              progress: Math.round((i / pdf.numPages) * 30) + 10, // 10-40% for text extraction
              message: `Extracting text from page ${i}/${pdf.numPages}...`,
            });
          }
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }

      // Clean up the text
      fullText = this.cleanExtractedText(fullText);
      console.log(
        `Total text extracted: ${fullText.length} characters from ${extractedPages} pages`
      );

      // Check if we extracted meaningful text (be more aggressive about triggering OCR)
      const avgTextPerPage = totalTextLength / pdf.numPages;
      const hasMinimalText =
        avgTextPerPage < 100 || fullText.trim().length < 200;

      console.log(
        `Average text per page: ${avgTextPerPage} chars, total text: ${fullText.length}, hasMinimalText: ${hasMinimalText}, forceOCR: ${forceOCR}`
      );

      if (hasMinimalText || forceOCR) {
        console.log(
          `${
            forceOCR
              ? "Forcing OCR processing"
              : `Minimal text extracted (avg ${Math.round(
                  avgTextPerPage
                )} chars/page, total ${fullText.length} chars)`
          }. Trying OCR...`
        );

        try {
          // Initialize OCR worker
          console.log("Initializing OCR worker...");
          await this.initializeOCR();
          console.log("OCR worker initialized successfully");

          // Second pass: Use OCR for pages with minimal or no text
          let ocrText = "";
          let ocrPages = 0;

          for (let i = 1; i <= pdf.numPages; i++) {
            try {
              console.log(`Starting OCR for page ${i}/${pdf.numPages}`);
              const page = await pdf.getPage(i);

              if (this.progressCallback) {
                this.progressCallback({
                  step: 2,
                  progress: 40 + Math.round((i / pdf.numPages) * 40), // 40-80% for OCR
                  message: `Processing page ${i}/${pdf.numPages} with OCR...`,
                });
              }

              const pageText = await this.extractTextFromPDFPageWithOCR(page);
              console.log(
                `OCR for page ${i} extracted ${pageText.length} characters`
              );

              if (pageText.trim().length > 0) {
                ocrText += pageText + "\n\n";
                ocrPages++;
              }
            } catch (pageError) {
              console.warn(`OCR failed for page ${i}:`, pageError);
            }
          }

          // Clean up OCR worker
          console.log("Cleaning up OCR worker...");
          await this.cleanupOCR();

          if (ocrText.trim().length > 0) {
            console.log(
              `OCR extracted text from ${ocrPages}/${pdf.numPages} pages (${ocrText.length} characters)`
            );
            return this.cleanExtractedText(ocrText);
          } else if (fullText.trim().length > 0) {
            // Return whatever text we did extract
            console.log(
              `OCR failed, using limited text extraction from ${extractedPages}/${pdf.numPages} pages`
            );
            return fullText;
          } else {
            throw new Error(
              "No readable text found in PDF after trying both text extraction and OCR. This might be a corrupted file or contain only images without text."
            );
          }
        } catch (ocrError) {
          console.error("OCR processing failed:", ocrError);

          // Clean up OCR worker on error
          await this.cleanupOCR();

          if (fullText.trim().length > 0) {
            console.log(
              "OCR failed, but some text was extracted via normal method"
            );
            return fullText;
          } else {
            throw new Error(
              `PDF processing failed. Normal text extraction found minimal content and OCR processing failed: ${ocrError.message}`
            );
          }
        }
      }

      console.log(
        `Successfully extracted text from ${extractedPages}/${pdf.numPages} pages (${fullText.length} characters)`
      );
      return fullText;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);

      // Clean up OCR worker if it was initialized
      await this.cleanupOCR();

      // Try fallback method if primary method fails
      if (!error.message.includes("fallback")) {
        try {
          console.log(
            "Primary PDF extraction failed, trying fallback method..."
          );
          return await this.extractTextFromPDFFallback(file);
        } catch (fallbackError) {
          console.error("Both PDF extraction methods failed:", fallbackError);
          throw fallbackError;
        }
      }

      if (error.message.includes("No readable text found")) {
        throw error; // Re-throw our custom error
      }

      // Handle specific PDF.js errors
      if (error.name === "PasswordException") {
        throw new Error(
          "PDF is password protected. Please provide an unlocked PDF."
        );
      } else if (error.name === "InvalidPDFException") {
        throw new Error(
          "Invalid or corrupted PDF file. Please try a different file."
        );
      } else if (error.name === "MissingPDFException") {
        throw new Error("PDF file appears to be empty or corrupted.");
      } else if (error.name === "UnexpectedResponseException") {
        throw new Error(
          "Network error while processing PDF. Please try again."
        );
      } else {
        throw new Error(
          `PDF processing failed: ${error.message}. This may be a scanned PDF that requires OCR processing.`
        );
      }
    }
  }

  /**
   * Fallback PDF processing using different approach
   */
  async extractTextFromPDFFallback(file) {
    try {
      console.log("Trying fallback PDF processing method...");

      const arrayBuffer = await file.arrayBuffer();

      // Try with different PDF.js settings
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
        // Disable font loading that might cause issues
        disableFontFace: true,
        // Use legacy build mode
        isEvalSupported: false,
      }).promise;

      let fullText = "";
      let successfulPages = 0;

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);

          // Try different text extraction approaches
          const textContent = await page.getTextContent({
            normalizeWhitespace: false,
            disableCombineTextItems: true,
          });

          if (textContent.items && textContent.items.length > 0) {
            // Extract text with positioning info
            let pageText = "";
            let lastY = null;

            textContent.items.forEach((item) => {
              if (item.str && item.str.trim()) {
                // Add line breaks based on vertical position
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                  pageText += "\n";
                }
                pageText += item.str + " ";
                lastY = item.transform[5];
              }
            });

            if (pageText.trim()) {
              fullText += pageText.trim() + "\n\n";
              successfulPages++;
            }
          }
        } catch (pageError) {
          console.warn(`Fallback: Could not process page ${i}:`, pageError);
        }
      }

      // Always try OCR if fallback text extraction yields little content
      console.log(
        `Fallback extracted ${fullText.length} chars from ${successfulPages} pages`
      );

      if (fullText.trim().length < 200) {
        // If fallback text extraction also fails, try OCR as last resort
        console.log(
          "Fallback text extraction also yielded minimal content, trying OCR as final attempt..."
        );

        try {
          await this.initializeOCR();
          let ocrText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            try {
              const page = await pdf.getPage(i);
              console.log(`Fallback OCR: processing page ${i}/${pdf.numPages}`);
              const pageText = await this.extractTextFromPDFPageWithOCR(page);

              if (pageText.trim().length > 0) {
                ocrText += pageText + "\n\n";
                successfulPages++;
              }
            } catch (ocrError) {
              console.warn(`OCR failed for page ${i} in fallback:`, ocrError);
            }
          }

          // Clean up OCR worker
          await this.cleanupOCR();

          if (ocrText.trim().length > 0) {
            console.log(
              `Fallback OCR processed ${successfulPages}/${pdf.numPages} pages, extracted ${ocrText.length} chars`
            );
            return this.cleanExtractedText(ocrText);
          }
        } catch (ocrError) {
          console.error("Fallback OCR also failed:", ocrError);
        }
      }

      if (fullText.trim().length > 0) {
        console.log(
          `Fallback method: Processed ${successfulPages}/${pdf.numPages} pages`
        );
        return this.cleanExtractedText(fullText);
      }

      throw new Error("Could not extract readable text from any pages");
    } catch (error) {
      console.error("Fallback PDF processing also failed:", error);
      throw new Error(
        "This PDF cannot be processed automatically. It may be a scanned document with poor image quality, password-protected, or corrupted. Please try:\n\n1. Converting to a text-based PDF\n2. Using OCR software to extract text\n3. Saving as a plain text file\n4. Checking if the PDF is password-protected\n5. Ensuring the scanned images are clear and readable"
      );
    }
  }
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
   * Extract text from text file
   */
  async extractTextFromFile(file, forceOCR = false) {
    console.log("extractTextFromFile called with:", {
      name: file.name,
      type: file.type,
      size: file.size,
      forceOCR,
    });

    if (file.type === "application/pdf") {
      console.log("Processing as PDF file");
      return this.extractTextFromPDF(file, forceOCR);
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

      // Extract text from file (this will handle OCR internally if needed)
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
      // Clean up OCR worker if there was an error
      await this.cleanupOCR();
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
   * Test method to force OCR processing - can be called from browser console
   */
  async testOCRUpload(file, userId, onProgress = () => {}) {
    console.log("Testing OCR upload with forced OCR processing...");

    try {
      onProgress({
        step: 0,
        progress: 10,
        message: "Starting OCR test upload...",
      });

      // Store the progress callback for PDF processing
      this.progressCallback = onProgress;

      // Extract text from file with forced OCR
      onProgress({
        step: 1,
        progress: 20,
        message: "Extracting text with OCR...",
      });
      console.log("About to call extractTextFromFile with forceOCR=true...");
      const text = await this.extractTextFromFile(file, true); // Force OCR
      console.log("Text extraction completed, length:", text.length);

      // Clear the progress callback
      this.progressCallback = null;

      console.log(
        "OCR test completed successfully. Extracted text:",
        text.substring(0, 500) + "..."
      );
      return text;
    } catch (error) {
      console.error("Error in OCR test:", error);
      await this.cleanupOCR();
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
