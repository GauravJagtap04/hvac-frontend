import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../components/SupabaseClient";
import { motion } from "framer-motion";
import { FaSearch, FaSpinner, FaChevronDown } from "react-icons/fa";

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Content</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100">
      <header
        className={`bg-gray-800 text-background dark:text-primary fixed top-0 ${
          isCollapsed ? "left-[80px]" : "left-[250px]"
        } right-0 z-10 transition-all duration-300`}
      >
        <div className="px-3 py-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* <button
                onClick={goBack}
                className="p-1 sm:p-2 group rounded-full bg-transparent hover:bg-blue-500 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 group-hover:text-white dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button> */}
            </div>
            <h1 className="text-base sm:text-xl font-semibold ml-1 sm:ml-3 text-background dark:text-primary truncate">
              Training
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Add additional header items here */}
          </div>
        </div>
      </header>
      {activeTab === "modules" && (
        <div className="bg-white border-b mt-10 sm:mt-14 md:mt-14 shadow-sm">
          <div
            className={`transition-all duration-300 ${
              isCollapsed ? "max-w-8xl" : "max-w-7xl"
            } mx-auto px-4 sm:px-6 lg:px-8`}
          >
            <nav className="-mb-px flex space-x-8" aria-label="Categories">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setSearchQuery("");
                  }}
                  className={`${
                    activeCategory === category.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "max-w-8xl" : "max-w-7xl"
        } mx-auto px-4 sm:px-6 lg:px-8 py-8`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
          </div>
        ) : activeTab === "modules" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredModules.map((module) => (
              <div
                key={module.id}
                className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {module.title}
                    </h3>
                    <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                      {module.category}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <div className="prose prose-sm max-w-none text-gray-600 mb-6">
                      {module.content}
                    </div>
                  </div>
                  <a
                    href={module.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
                  >
                    Start Learning
                  </a>
                </div>
              </div>
            ))}
            {filteredModules.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                {searchQuery
                  ? "No modules match your search"
                  : "No modules available in this category"}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            {currentQuiz && !quizCompleted ? (
              <div className="bg-white shadow-lg rounded-xl p-8">
                <div className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {currentQuiz.question}
                  </h3>
                  <p className="text-sm text-gray-500">
                    From module: {currentQuiz.training_modules?.title}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  {currentQuiz.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAnswer(option)}
                      disabled={showResult}
                      className={`w-full p-4 text-left rounded-lg border ${
                        showResult
                          ? option === currentQuiz.correct_answer
                            ? "bg-green-100 border-green-500"
                            : option === selectedAnswer
                            ? "bg-red-100 border-red-500"
                            : "bg-gray-50 border-gray-200"
                          : selectedAnswer === option
                          ? "bg-blue-50 border-blue-500"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  {!showResult ? (
                    <button
                      onClick={handleAnswerSubmit}
                      disabled={!selectedAnswer}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuiz}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            ) : quizCompleted ? (
              <div className="bg-white shadow-lg rounded-xl p-8 text-center">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Quiz Completed!
                </h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {score} / {quizzes.length}
                </div>
                <div className="text-lg text-gray-600 mb-6">
                  You scored {Math.round((score / quizzes.length) * 100)}%
                </div>
                <button
                  onClick={handleRestartQuiz}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Restart Quiz
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No quizzes available in this category
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TrainingPage;
