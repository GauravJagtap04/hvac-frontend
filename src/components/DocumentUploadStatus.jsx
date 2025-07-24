import React from "react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Loader2, FileText, CheckCircle, AlertCircle, X } from "lucide-react";

const DocumentUploadStatus = ({
  isUploading,
  progress,
  currentStep,
  error,
  fileName,
  onDismissError,
}) => {
  if (!isUploading && !error) return null;

  const steps = [
    "Uploading file...",
    "Extracting text...",
    "Processing with OCR (if needed)...",
    "Processing chunks...",
    "Generating embeddings...",
    "Saving to database...",
    "Complete!",
  ];

  const getStepIcon = (index) => {
    if (error) {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }

    if (index < currentStep) {
      return <CheckCircle className="h-3 w-3 text-emerald-500" />;
    }

    if (index === currentStep) {
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    }

    return (
      <div className="h-3 w-3 rounded-full bg-muted border border-muted-foreground/20" />
    );
  };

  return (
    <div className="p-4">
      <div
        className={`rounded-lg border p-4 space-y-4 ${
          error
            ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
            : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30"
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              error
                ? "bg-red-100 dark:bg-red-950/30"
                : "bg-blue-100 dark:bg-blue-950/30"
            }`}
          >
            <FileText
              className={`h-4 w-4 ${
                error
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4
                className={`font-medium text-sm ${
                  error
                    ? "text-red-900 dark:text-red-100"
                    : "text-blue-900 dark:text-blue-100"
                }`}
              >
                {error ? "Upload Failed" : "Processing"}
              </h4>
              {error && onDismissError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismissError}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-200/50 dark:text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p
              className={`text-xs mt-1 truncate ${
                error
                  ? "text-red-700 dark:text-red-300"
                  : "text-blue-700 dark:text-blue-300"
              }`}
            >
              {fileName}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {!error && (
          <div className="space-y-2">
            <Progress
              value={progress}
              className="h-2 bg-blue-100/60 dark:bg-blue-950/40"
            />
            <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
              {progress}% complete
            </p>
          </div>
        )}

        {/* Compact Steps */}
        <div className="space-y-1">
          {steps
            .slice(0, error ? 7 : Math.min(currentStep + 2, 7))
            .map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                {getStepIcon(index)}
                <span
                  className={`text-xs ${
                    error
                      ? "text-red-700 dark:text-red-300"
                      : index <= currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
        </div>

        {/* Compact Error Message */}
        {error && (
          <div className="mt-3">
            <div className="p-3 bg-red-100/80 dark:bg-red-950/30 rounded-lg border border-red-200/60 dark:border-red-800/40">
              <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                {error.length > 100 ? error.substring(0, 100) + "..." : error}
              </p>

              {/* Compact Tips */}
              {error.includes("scanned") && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200/50 dark:border-amber-800/30">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">
                    💡 Try OCR tools or convert to text
                  </p>
                </div>
              )}

              {error.includes("password") && (
                <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200/50 dark:border-purple-800/30">
                  <p className="text-xs text-purple-800 dark:text-purple-200 font-medium">
                    🔐 Remove password protection first
                  </p>
                </div>
              )}

              {error.includes("corrupted") && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200/50 dark:border-blue-800/30">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                    🔧 Try downloading the file again
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadStatus;
