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
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <div className="relative">
            <div className="p-6 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 mx-auto w-fit border border-amber-200/50 dark:border-amber-800/30">
              <MessageCircle className="h-16 w-16 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute -top-2 -right-2 p-2 rounded-full bg-gradient-to-br from-red-500/20 to-red-400/10 animate-pulse border border-red-200/50 dark:border-red-800/30">
              <span className="text-lg">🔒</span>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">
              Authentication Required
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Please log in to access the HVAC Manual Chatbot and start
              uploading your technical documentation.
            </p>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800/30">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 Tip: Your uploaded documents are securely stored and only
              accessible to your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Troubleshooting Modal */}
      {showTroubleshooting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
          <TroubleshootingGuide
            error={uploadError}
            onClose={() => setShowTroubleshooting(false)}
          />
        </div>
      )}

      {/* Left Sidebar - Similar to ChatGPT */}
      <div className="w-80 flex-shrink-0 bg-muted/30 border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-semibold text-lg">HVAC Manuals</h1>
          </div>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-b border-border/50">
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
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-sm transition-all duration-200"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Manual
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowTroubleshooting(true)}
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Need help?
          </Button>
        </div>

        {/* Upload Status & Error - Collapsible */}
        {(isUploading || uploadError) && (
          <div className="border-b border-border/50">
            <DocumentUploadStatus
              isUploading={isUploading}
              progress={uploadProgress}
              currentStep={uploadStep}
              error={uploadError}
              fileName={uploadingFileName}
              onDismissError={handleDismissError}
            />
          </div>
        )}

        {/* Documents List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Recent Manuals
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {documents.length === 0 ? (
              <div className="text-center py-8 space-y-3 text-muted-foreground">
                <div className="p-4 rounded-lg bg-muted/30 mx-auto w-fit">
                  <FileIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">No manuals yet</p>
                  <p className="text-xs opacity-70">
                    Upload your first HVAC manual to get started
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedDocument?.id === doc.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                    onClick={() => handleDocumentSelect(doc)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded-md transition-colors ${
                          selectedDocument?.id === doc.id
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <FileIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(doc.uploaded_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                        {selectedDocument?.id === doc.id && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="h-1 w-1 rounded-full bg-primary"></div>
                            <span className="text-xs text-primary font-medium">
                              Active
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id, doc.filename);
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="p-4 border-b border-border/50 bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">HVAC Assistant</h1>
                {selectedDocument && (
                  <p className="text-sm text-muted-foreground">
                    Analyzing:{" "}
                    {selectedDocument.filename.length > 30
                      ? selectedDocument.filename.substring(0, 30) + "..."
                      : selectedDocument.filename}
                  </p>
                )}
              </div>
            </div>
            {selectedDocument && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 border-green-200"
              >
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  Active
                </div>
              </Badge>
            )}
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedDocument ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-md">
                <div className="relative">
                  <div className="p-8 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 mx-auto w-fit">
                    <MessageCircle className="h-16 w-16 text-blue-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 animate-pulse">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Welcome to HVAC Assistant
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Upload an HVAC manual to get started with AI-powered
                    technical assistance. I can help you understand
                    specifications, troubleshoot issues, and answer questions
                    about your equipment.
                  </p>
                  <div className="pt-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-sm transition-all duration-200"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Manual
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${
                          message.type === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.type !== "user" && (
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.type === "system"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {message.type === "system" ? (
                              <MessageCircle className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                        )}

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : message.type === "system"
                              ? "bg-amber-50 border border-amber-200 text-amber-900"
                              : message.type === "error"
                              ? "bg-red-50 border border-red-200 text-red-900"
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
                                      <h1 className="text-lg font-bold mb-3 text-foreground border-b border-border/30 pb-2">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-base font-semibold mb-2 text-foreground">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-sm font-medium mb-2 text-foreground">
                                        {children}
                                      </h3>
                                    ),
                                    p: ({ children }) => (
                                      <p className="mb-3 last:mb-0 leading-relaxed text-foreground">
                                        {children}
                                      </p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-inside mb-3 space-y-1.5 text-foreground">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-inside mb-3 space-y-1.5 text-foreground">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="leading-relaxed text-foreground pl-2">
                                        {children}
                                      </li>
                                    ),
                                    code: ({ inline, children }) =>
                                      inline ? (
                                        <code className="bg-muted/70 px-2 py-1 rounded-md text-xs font-mono text-foreground border">
                                          {children}
                                        </code>
                                      ) : (
                                        <code className="block bg-muted/70 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto text-foreground border">
                                          {children}
                                        </code>
                                      ),
                                    pre: ({ children }) => (
                                      <pre className="bg-muted/70 p-4 rounded-lg overflow-x-auto mb-3 border">
                                        {children}
                                      </pre>
                                    ),
                                    blockquote: ({ children }) => (
                                      <blockquote className="border-l-4 border-primary/30 pl-4 italic mb-3 bg-muted/30 py-2 rounded-r-lg text-foreground">
                                        {children}
                                      </blockquote>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-foreground">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic text-foreground">
                                        {children}
                                      </em>
                                    ),
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto mb-3">
                                        <table className="border-collapse border border-border rounded-lg text-xs min-w-full">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    th: ({ children }) => (
                                      <th className="border border-border px-3 py-2 bg-muted/50 font-medium text-left text-foreground">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="border border-border px-3 py-2 text-foreground">
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
                          <div className="flex justify-end mt-2">
                            <p className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {message.type === "user" && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-4 justify-start">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="bg-muted rounded-2xl px-4 py-3 border">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm">
                              Analyzing your question...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border/50 bg-card/50">
                <div className="flex gap-3 max-w-4xl mx-auto">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about the HVAC manual..."
                    disabled={isLoading}
                    className="flex-1 h-12 px-4 bg-background border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HVACChatbot;
