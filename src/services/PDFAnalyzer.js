/**
 * PDF Analysis and Troubleshooting Helper
 */

class PDFAnalyzer {
  /**
   * Analyze PDF file and provide insights
   */
  static async analyzePDF(file) {
    const analysis = {
      fileName: file.name,
      fileSize: file.size,
      fileSizeFormatted: this.formatFileSize(file.size),
      isLikelyScanned: false,
      isPasswordProtected: false,
      hasText: false,
      pageCount: 0,
      recommendations: [],
    };

    try {
      // Check file name patterns
      if (this.hasScannedIndicators(file.name)) {
        analysis.isLikelyScanned = true;
        analysis.recommendations.push(
          "File name suggests this might be a scanned document"
        );
      }

      // Check file size patterns
      if (file.size > 10 * 1024 * 1024) {
        // > 10MB
        analysis.recommendations.push(
          "Large file size may indicate scanned images"
        );
      }

      return analysis;
    } catch (error) {
      console.error("Error analyzing PDF:", error);
      return analysis;
    }
  }

  /**
   * Check if filename suggests scanned document
   */
  static hasScannedIndicators(filename) {
    const scannedIndicators = [
      "scan",
      "scanned",
      "copy",
      "image",
      "photo",
      "jpeg",
      "jpg",
      "png",
      "tiff",
      "ocr",
    ];

    const lowerName = filename.toLowerCase();
    return scannedIndicators.some((indicator) => lowerName.includes(indicator));
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Get troubleshooting suggestions based on error
   */
  static getTroubleshootingSuggestions(error, analysis = null) {
    const suggestions = [];

    if (error.includes("scanned") || error.includes("image")) {
      suggestions.push({
        icon: "🔍",
        title: "Scanned Document Detected",
        description:
          "This PDF appears to contain scanned images rather than selectable text.",
        solutions: [
          "Use OCR software (Adobe Acrobat, Google Docs) to convert to text",
          "Try online OCR tools like SmallPDF or ILovePDF",
          "Manually copy any visible text into a .txt file",
          "Check if the original document has a text-based version",
        ],
      });
    }

    if (error.includes("password")) {
      suggestions.push({
        icon: "🔐",
        title: "Password Protected",
        description: "This PDF is password protected and cannot be processed.",
        solutions: [
          "Enter the password to unlock the PDF",
          "Ask the document owner for an unlocked version",
          "Use PDF password removal tools if you have permission",
          "Copy text manually if you can view the content",
        ],
      });
    }

    if (error.includes("corrupted") || error.includes("invalid")) {
      suggestions.push({
        icon: "⚠️",
        title: "File Corruption",
        description: "The PDF file appears to be corrupted or invalid.",
        solutions: [
          "Download the file again from the original source",
          "Try opening the PDF in different viewers (Adobe Reader, browser)",
          "Check if the file was completely downloaded",
          "Request a new copy of the document",
        ],
      });
    }

    if (error.includes("No readable text")) {
      suggestions.push({
        icon: "📄",
        title: "No Text Content",
        description: "No readable text was found in this PDF.",
        solutions: [
          "This might be an image-only PDF requiring OCR",
          "Try selecting text in a PDF viewer to confirm",
          "Convert to text using online OCR services",
          "Check if this is actually a collection of images",
        ],
      });
    }

    // General suggestions if no specific error type detected
    if (suggestions.length === 0) {
      suggestions.push({
        icon: "🛠️",
        title: "General Troubleshooting",
        description: "Try these common solutions for PDF processing issues.",
        solutions: [
          "Ensure the PDF is not password protected",
          "Try a smaller file size (under 10MB)",
          "Use a text-based PDF rather than scanned images",
          "Convert to .txt format if possible",
          "Check file integrity by opening in a PDF viewer",
        ],
      });
    }

    return suggestions;
  }

  /**
   * Get file type recommendations
   */
  static getFileTypeRecommendations() {
    return {
      preferred: [
        {
          type: "Text Files (.txt)",
          description: "Plain text files work best and process fastest",
          pros: ["Instant processing", "No conversion needed", "Lightweight"],
          icon: "📝",
        },
        {
          type: "Text-based PDFs",
          description: "PDFs with selectable text (not scanned images)",
          pros: [
            "Maintains formatting",
            "Reliable extraction",
            "Professional appearance",
          ],
          icon: "📄",
        },
      ],
      avoid: [
        {
          type: "Scanned PDFs",
          description: "PDFs created from scanned documents or images",
          issues: [
            "Requires OCR processing",
            "Text extraction may fail",
            "Large file sizes",
          ],
          alternative: "Use OCR software to convert to text first",
          icon: "🚫",
        },
        {
          type: "Password Protected PDFs",
          description: "PDFs with security restrictions",
          issues: ["Cannot be processed automatically", "Access denied"],
          alternative: "Remove password protection or manually extract text",
          icon: "🔒",
        },
      ],
    };
  }
}

export default PDFAnalyzer;
