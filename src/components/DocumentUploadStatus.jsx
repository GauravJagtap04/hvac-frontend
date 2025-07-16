import React from "react";
import { Card, CardContent } from "./ui/card";
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
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }

    if (index < currentStep) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    if (index === currentStep) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }

    return (
      <div className="h-4 w-4 rounded-full bg-muted border-2 border-muted-foreground/20" />
    );
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div className="flex-1">
              <h3 className="font-medium">
                {error ? "Upload Failed" : "Processing Document"}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {fileName}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {!error && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                {getStepIcon(index)}
                <span
                  className={`text-sm ${
                    error
                      ? "text-destructive"
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

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-destructive">
                      Upload Failed
                    </h4>
                    {onDismissError && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDismissError}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-destructive/80 whitespace-pre-wrap">
                    {error}
                  </p>

                  {/* Show helpful tips based on error type */}
                  {error.includes("scanned") && (
                    <div className="mt-3 p-3 bg-muted rounded border-l-4 border-orange-500">
                      <h5 className="font-medium text-sm mb-1">
                        💡 Helpful Tips:
                      </h5>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>
                          • Try converting the PDF to text using online tools
                        </li>
                        <li>
                          • Use OCR software like Adobe Acrobat or Google Docs
                        </li>
                        <li>• Copy and paste text manually into a .txt file</li>
                      </ul>
                    </div>
                  )}

                  {error.includes("password") && (
                    <div className="mt-3 p-3 bg-muted rounded border-l-4 border-orange-500">
                      <h5 className="font-medium text-sm mb-1">
                        🔐 Password Protected:
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        Please unlock the PDF using the password and try again.
                      </p>
                    </div>
                  )}

                  {error.includes("corrupted") && (
                    <div className="mt-3 p-3 bg-muted rounded border-l-4 border-orange-500">
                      <h5 className="font-medium text-sm mb-1">
                        🔧 File Issues:
                      </h5>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Try downloading the PDF again</li>
                        <li>• Open in a PDF viewer to check if it works</li>
                        <li>• Try a different PDF file</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUploadStatus;
