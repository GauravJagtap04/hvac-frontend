import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import PDFAnalyzer from "../services/PDFAnalyzer";

const TroubleshootingGuide = ({ error = null, onClose }) => {
  const [expandedSections, setExpandedSections] = useState(
    new Set(["overview"])
  );

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const suggestions = error
    ? PDFAnalyzer.getTroubleshootingSuggestions(error)
    : [];
  const fileRecommendations = PDFAnalyzer.getFileTypeRecommendations();

  const SectionHeader = ({ id, title, icon: Icon }) => (
    <Button
      variant="ghost"
      className="w-full justify-between p-3 h-auto"
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{title}</span>
      </div>
      {expandedSections.has(id) ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Document Upload Troubleshooting
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {/* Error-specific suggestions */}
            {error && suggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Current Issue
                </h3>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-destructive/5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{suggestion.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{suggestion.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {suggestion.description}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Solutions:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {suggestion.solutions.map((solution, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">•</span>
                                {solution}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
              </div>
            )}

            {/* File Type Recommendations */}
            <div>
              <SectionHeader
                id="file-types"
                title="Supported File Types"
                icon={FileText}
              />

              {expandedSections.has("file-types") && (
                <div className="space-y-4 p-3">
                  {/* Preferred Types */}
                  <div>
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Recommended
                    </h4>
                    <div className="space-y-2">
                      {fileRecommendations.preferred.map((type, index) => (
                        <div
                          key={index}
                          className="border rounded p-3 bg-green-50"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{type.icon}</span>
                            <div className="flex-1">
                              <h5 className="font-medium">{type.type}</h5>
                              <p className="text-sm text-muted-foreground mb-2">
                                {type.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {type.pros.map((pro, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {pro}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Types to Avoid */}
                  <div>
                    <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Problematic Types
                    </h4>
                    <div className="space-y-2">
                      {fileRecommendations.avoid.map((type, index) => (
                        <div
                          key={index}
                          className="border rounded p-3 bg-orange-50"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{type.icon}</span>
                            <div className="flex-1">
                              <h5 className="font-medium">{type.type}</h5>
                              <p className="text-sm text-muted-foreground mb-2">
                                {type.description}
                              </p>
                              <div className="mb-2">
                                <p className="text-sm font-medium text-orange-700 mb-1">
                                  Issues:
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {type.issues.map((issue, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-start gap-1"
                                    >
                                      <span className="text-orange-500 mt-0.5">
                                        •
                                      </span>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-2 bg-orange-100 rounded text-sm">
                                <strong>Alternative:</strong> {type.alternative}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Quick Solutions */}
            <div>
              <SectionHeader
                id="quick-solutions"
                title="Quick Solutions"
                icon={CheckCircle}
              />

              {expandedSections.has("quick-solutions") && (
                <div className="space-y-3 p-3">
                  <div className="grid gap-3">
                    <div className="border rounded p-3">
                      <h4 className="font-medium mb-2">
                        🔄 Convert PDF to Text
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Use online tools to convert your PDF to text format:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href="https://www.ilovepdf.com/pdf_to_txt"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            ILovePDF <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href="https://smallpdf.com/pdf-to-text"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            SmallPDF <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded p-3">
                      <h4 className="font-medium mb-2">
                        📝 Manual Text Extraction
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        <li>1. Open your PDF in a viewer</li>
                        <li>2. Select all text (Ctrl+A)</li>
                        <li>3. Copy the text (Ctrl+C)</li>
                        <li>4. Paste into a new .txt file</li>
                        <li>5. Upload the .txt file</li>
                      </ol>
                    </div>

                    <div className="border rounded p-3">
                      <h4 className="font-medium mb-2">🔍 Use OCR Tools</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        For scanned documents, use OCR (Optical Character
                        Recognition):
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Google Docs (free OCR when uploading images)</li>
                        <li>• Adobe Acrobat Pro (premium)</li>
                        <li>• Online OCR services</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Contact Support */}
            <div>
              <SectionHeader
                id="support"
                title="Still Need Help?"
                icon={HelpCircle}
              />

              {expandedSections.has("support") && (
                <div className="p-3">
                  <div className="border rounded p-4 bg-muted/50">
                    <h4 className="font-medium mb-2">Contact Support</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      If you're still having trouble, try these options:
                    </p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <span>📧</span>
                        Email the document to support for manual processing
                      </li>
                      <li className="flex items-center gap-2">
                        <span>💬</span>
                        Use the chat support for real-time help
                      </li>
                      <li className="flex items-center gap-2">
                        <span>📖</span>
                        Check our knowledge base for more solutions
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TroubleshootingGuide;
