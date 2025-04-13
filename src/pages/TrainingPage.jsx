import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaSpinner, FaChevronDown } from "react-icons/fa";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ArrowRight, ArrowLeft, Loader } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TrainingPage = () => {
  const { isCollapsed } = useOutletContext();
  const [activeTab, setActiveTab] = useState("modules");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [trainingModules, setTrainingModules] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    if (activeTab === "modules") {
      fetchTrainingModules();
    } else if (activeTab === "quizzes") {
      fetchQuizzes();
    }
  }, [activeCategory, activeTab]);

  const fetchTrainingModules = async () => {
    try {
      setLoading(true);
      let query = supabase.from("training_modules").select("*");

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setTrainingModules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      let query = supabase.from("quizzes").select("*, training_modules(title)");

      if (activeCategory !== "all") {
        query = query.eq("training_modules.category", activeCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuizzes(data);
      setCurrentQuiz(data[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = () => {
    const isCorrect = selectedAnswer === currentQuiz.correct_answer;
    if (isCorrect) {
      setScore((prevScore) => prevScore + 1);
    }
    setShowResult(true);
  };

  const handleNextQuiz = () => {
    const currentIndex = quizzes.findIndex((q) => q.id === currentQuiz.id);
    if (currentIndex < quizzes.length - 1) {
      setCurrentQuiz(quizzes[currentIndex + 1]);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const handleRestartQuiz = () => {
    setCurrentQuiz(quizzes[0]);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
  };

  const categories = [
    { id: "all", label: "All Modules" },
    { id: "basics", label: "HVAC Basics" },
    { id: "components", label: "Components" },
    { id: "troubleshooting", label: "Troubleshooting" },
  ];

  const filteredModules = trainingModules.filter((module) =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="min-h-screen bg-background text-primary flex items-center justify-center">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Content</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background w-full transition-none min-h-screen">
      <Header isCollapsed={isCollapsed} name="Training" />
      {/* can also pass icon before the name eg.,      <Header isCollapsed={isCollapsed} name="Training" Icon={Book} /> */}

      {activeTab === "modules" && (
        <div className="bg-background w-full mt-4">
          <div
            className={`flex justify-center ${
              isCollapsed ? "max-w-8xl" : "max-w-7xl"
            } mx-auto px-4 sm:px-6 lg:px-8 py-2`}
          >
            <Tabs
              value={activeCategory}
              onValueChange={(value) => {
                setActiveCategory(value);
                setSearchQuery("");
              }}
            >
              <TabsList className="h-10 bg-primary/10 relative border border-border">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="text-sm relative z-10 transition-all duration-300 ease-in-out"
                  >
                    {category.label}
                    {activeCategory === category.id && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full -mb-1 z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4"
                ></motion.div>
              </AnimatePresence>
            </Tabs>
          </div>
        </div>
      )}
      <main
        className={`${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        {loading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : activeTab === "modules" ? (
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredModules.map((module) => (
                <Card
                  key={module.id}
                  className="hover:shadow-xl bg-background transition-transform duration-300 flex flex-col justify-between  transform hover:-translate-y-1 h-full max-w-xs md:max-w-xl sm:max-w-sm mx-auto border border-border"
                >
                  <CardHeader className="flex flex-col items-start min-h-[90px]">
                    <Badge className="px-2 py-1 text-xs font-medium text-background bg-primary rounded-full">
                      {module.category}
                    </Badge>
                    <CardTitle className="text-xl font-semibold text-primary">
                      {module.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-grow">
                    <div className="prose prose-sm max-w-none text-ring">
                      {module.content}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card
                onClick={() =>
                  window.open(
                    "https://www.youtube.com/playlist?list=...",
                    "_blank"
                  )
                }
                className="hover:shadow-xl transition-all duration-600 bg-background flex flex-col transform hover:-translate-y-1 h-full max-w-xs md:max-w-xl sm:max-w-sm mx-auto border border-border w-full min-h-[20rem] justify-center items-center font-black text-7xl md-text-6xl px-5 tracking-tighter leading-tighter hover:bg-primary hover:text-background overflow-hidden"
              >
                Start Learning
              </Card>
            </motion.div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="my-50 flex flex-row items-center justify-center hover:border-b-3 hover:border-primary/70 transition-all duration-100 ease-in-out cursor-pointer py-10">
                    <h2
                      className="text-primary flex flex-col md:flex-row lg:flex-row tracking-tight text-7xl sm:5xl font-black"
                      onClick={() => setActiveTab("quizzes")}
                    >
                      Want to test your knowledge?{" "}
                      <ArrowRight strokeWidth={4} size={70} />
                    </h2>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-md">Start Quiz</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto min-h-screen"
          >
            {currentQuiz && !quizCompleted ? (
              <Card className="bg-background text-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="text-sm text-background bg-primary rounded-full font-medium">
                      {currentQuiz.training_modules?.title}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("modules")}
                          >
                            <ArrowLeft strokeWidth={3} size={4} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-md">Back to Training</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <h3 className="text-3xl tracking-normal font-bold text-primary py-2">
                    {currentQuiz.question}
                  </h3>
                </CardHeader>

                <CardContent className="flex flex-col gap-2">
                  {currentQuiz.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentQuiz.correct_answer;
                    const isIncorrect = showResult && isSelected && !isCorrect;

                    return (
                      <Button
                        key={index}
                        onClick={() => setSelectedAnswer(option)}
                        disabled={showResult}
                        className={cn(
                          "justify-start h-auto py-3 px-4 text-left font-normal bg-background border border-input text-primary hover:text-background hover:bg-primary",
                          isSelected &&
                            !showResult &&
                            "border-input text-background bg-primary",
                          showResult &&
                            isCorrect &&
                            "border-emerald-600 text-emerald-600",
                          isIncorrect && "border-destructive text-destructive"
                        )}
                      >
                        {option}
                      </Button>
                    );
                  })}
                </CardContent>

                <CardFooter className="flex justify-center items-center">
                  {!showResult ? (
                    <Button
                      variant="success"
                      size="xlg"
                      onClick={handleAnswerSubmit}
                      disabled={!selectedAnswer}
                      className="text-background dark:text-primary"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="xlg"
                      onClick={handleNextQuiz}
                      className="text-background dark:text-primary"
                    >
                      Next Question
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ) : quizCompleted ? (
              <Card className="bg-background flex text-center justify-between text-primary w-full py-15">
                <CardHeader className="text-2xl font-semibold text-primary">
                  Quiz Completed!
                </CardHeader>
                <CardContent className="text-4xl font-bold text-primary">
                  <div>
                    {score} / {quizzes.length}
                  </div>
                  <div className="text-lg text-primary">
                    You scored {Math.round((score / quizzes.length) * 100)}%
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center items-center gap-8">
                  <Button
                    variabnt="success"
                    size="xlg"
                    onClick={handleRestartQuiz}
                    className="text-background"
                  >
                    Restart Quiz
                  </Button>
                  <Button
                    size="xlg"
                    onClick={() => setActiveTab("modules")}
                    className="text-primary bg-background hove:bg-primary border border-border hover:text-background"
                  >
                    Back to Training
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center py-8 text-primary bg-background">
                No quizzes available in this category
              </Card>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TrainingPage;
