// Simple OCR test to verify Tesseract.js is working
import { createWorker } from "tesseract.js";

export async function testOCR() {
  console.log("Testing OCR functionality...");

  try {
    // Create a simple test image (white background with black text)
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 300, 100);

    // Black text
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Hello World", 50, 50);

    const imageData = canvas.toDataURL("image/png");
    console.log("Test image created");

    // Test OCR
    const worker = await createWorker("eng");
    console.log("OCR worker created");

    const result = await worker.recognize(imageData);
    console.log("OCR result:", result.data.text);
    console.log("OCR confidence:", result.data.confidence);

    await worker.terminate();

    // Clean up
    canvas.remove();

    return result.data.text.trim();
  } catch (error) {
    console.error("OCR test failed:", error);
    throw error;
  }
}

// Auto-run test when loaded
if (typeof window !== "undefined") {
  window.testOCR = testOCR;
  console.log("OCR test function available as window.testOCR()");
}
