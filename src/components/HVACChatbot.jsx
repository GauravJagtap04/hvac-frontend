import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Alert } from "./ui/alert";
import { Separator } from "./ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import {
  FileText,
  Send,
  Upload,
  Trash2,
  MessageCircle,
  Bot,
  User,
  FileIcon,
  Loader2,
  HelpCircle,
} from "lucide-react";
import DocumentService from "../services/DocumentService";
import DocumentUploadStatus from "./DocumentUploadStatus";
import TroubleshootingGuide from "./TroubleshootingGuide";
import { supabase } from "./SupabaseClient";
import { toast } from "sonner";

const HVACChatbot = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadUserDocuments(user.id);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadUserDocuments = async (userId) => {
    try {
      const userDocs = await DocumentService.getUserDocuments(userId);
      setDocuments(userDocs);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      toast.error("Please upload only PDF or TXT files");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStep(0);
    setUploadError(null); // Clear any previous errors
    setUploadingFileName(file.name);

    try {
      const document = await DocumentService.uploadDocument(
        file,
        user.id,
        ({ step, progress, message }) => {
          setUploadStep(step);
          setUploadProgress(progress);
        }
      );

      // Reload documents
      await loadUserDocuments(user.id);

      toast.success(`Document "${file.name}" uploaded successfully!`);

      // Auto-select the newly uploaded document
      setSelectedDocument(document);
      setMessages([
        {
          id: Date.now(),
          type: "system",
          content: `Document "${document.filename}" is now active. You can ask questions about its content.`,
          timestamp: new Date(),
        },
      ]);

      // Clear upload states after successful upload
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStep(0);
        setUploadingFileName("");
      }, 2000); // Keep success status visible for 2 seconds
    } catch (error) {
      console.error("Error uploading document:", error);
      setUploadError(error.message);
      toast.error("Failed to upload document: " + error.message);

      // On error, stop uploading states but keep error visible indefinitely
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStep(0);
      // Keep uploadingFileName and uploadError visible until next upload or manual clear
    } finally {
      // Always clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDismissError = () => {
    setUploadError(null);
    setUploadingFileName("");
  };

  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
    setMessages([
      {
        id: Date.now(),
        type: "system",
        content: `Switched to document "${document.filename}". You can now ask questions about its content.`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleDeleteDocument = async (documentId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await DocumentService.deleteDocument(documentId, user.id);
      await loadUserDocuments(user.id);

      // Clear selection if deleted document was selected
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
        setMessages([]);
      }

      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedDocument) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await DocumentService.generateResponse(
        userMessage.content,
        selectedDocument.id
      );

      const botMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        content:
          "Sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Failed to generate response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <MessageCircle className="h-4 w-4" />
          Please log in to use the HVAC Manual Chatbot.
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-screen max-h-screen overflow-hidden">
      {/* Troubleshooting Modal */}
      {showTroubleshooting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <TroubleshootingGuide
            error={uploadError}
            onClose={() => setShowTroubleshooting(false)}
          />
        </div>
      )}

      {/* Documents Panel */}
      <div className="lg:col-span-1 h-full overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              HVAC Manuals
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Upload Status */}
            <DocumentUploadStatus
              isUploading={isUploading}
              progress={uploadProgress}
              currentStep={uploadStep}
              error={uploadError}
              fileName={uploadingFileName}
              onDismissError={handleDismissError}
            />

            {/* Upload Section */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
                variant="outline"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Manual
                  </>
                )}
              </Button>

              {/* Help Button */}
              <Button
                onClick={() => setShowTroubleshooting(true)}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Upload Help
              </Button>
            </div>

            <Separator />

            {/* Documents List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No manuals uploaded yet
                    </p>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDocument?.id === doc.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleDocumentSelect(doc)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <FileIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {doc.filename}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id, doc.filename);
                            }}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Panel */}
      <div className="lg:col-span-3 h-full overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                HVAC Assistant
              </CardTitle>
              {selectedDocument && (
                <Badge variant="secondary">
                  Active: {selectedDocument.filename}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!selectedDocument ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Select an HVAC Manual</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload and select a manual to start asking questions
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Messages - Scrollable area */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 p-4 pb-0">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.type === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {message.type !== "user" && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                              {message.type === "system" ? (
                                <MessageCircle className="h-4 w-4" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-lg px-4 py-3 ${
                              message.type === "user"
                                ? "bg-primary text-primary-foreground"
                                : message.type === "system"
                                ? "bg-muted"
                                : message.type === "error"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "bg-muted border"
                            }`}
                          >
                            <div className="text-sm">
                              {message.type === "assistant" ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                      h1: ({ children }) => (
                                        <h1 className="text-lg font-bold mb-2">
                                          {children}
                                        </h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="text-base font-semibold mb-2">
                                          {children}
                                        </h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="text-sm font-medium mb-1">
                                          {children}
                                        </h3>
                                      ),
                                      p: ({ children }) => (
                                        <p className="mb-2 last:mb-0 leading-relaxed">
                                          {children}
                                        </p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="list-disc list-inside mb-2 space-y-1">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal list-inside mb-2 space-y-1">
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => (
                                        <li className="leading-relaxed">
                                          {children}
                                        </li>
                                      ),
                                      code: ({ inline, children }) =>
                                        inline ? (
                                          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                                            {children}
                                          </code>
                                        ) : (
                                          <code className="block bg-muted p-3 rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                            {children}
                                          </code>
                                        ),
                                      pre: ({ children }) => (
                                        <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2">
                                          {children}
                                        </pre>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-primary/20 pl-4 italic mb-2">
                                          {children}
                                        </blockquote>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold">
                                          {children}
                                        </strong>
                                      ),
                                      em: ({ children }) => (
                                        <em className="italic">{children}</em>
                                      ),
                                      table: ({ children }) => (
                                        <table className="border-collapse border border-border mb-2 text-xs">
                                          {children}
                                        </table>
                                      ),
                                      th: ({ children }) => (
                                        <th className="border border-border px-2 py-1 bg-muted font-medium text-left">
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="border border-border px-2 py-1">
                                          {children}
                                        </td>
                                      ),
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {message.content}
                                </div>
                              )}
                            </div>
                            <p className="text-xs opacity-70 mt-2 text-right">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>

                          {message.type === "user" && (
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="bg-muted rounded-lg px-4 py-3 border">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Input - Fixed at bottom */}
                <div className="border-t pt-4 pb-2 px-4 bg-background">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask a question about the HVAC manual..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HVACChatbot;
