"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Trophy,
  CheckCircle2,
  Code2,
  Flame,
  ArrowRight,
  Brain,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZZES: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the worst-case time complexity of QuickSort when using a naive pivot on sorted data?",
    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
    correctIndex: 2,
    explanation: "When naive pivot selection picks the minimum or maximum element each partition step on sorted data, the recursion tree degrades to height n, yielding O(n²) operations.",
  },
  {
    id: 2,
    question: "In C++, what causes undefined behavior when deleting memory allocated with new[] using delete instead of delete[]?",
    options: [
      "Only the first element's destructor is invoked",
      "Compilation error",
      "Stack overflow",
      "No effect on modern compilers",
    ],
    correctIndex: 0,
    explanation: "delete on an array pointer invokes only the first object's destructor and corrupts memory heap metadata allocated by new[].",
  },
  {
    id: 3,
    question: "What is the amortized time complexity of inserting into a Python list (or C++ std::vector)?",
    options: ["O(n)", "O(1)", "O(log n)", "O(n log n)"],
    correctIndex: 1,
    explanation: "Dynamic arrays double capacity exponentially upon exhaustion, meaning reallocation cost is amortized across all previous inserts to O(1).",
  },
];

const DSA_PROBLEMS = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays & Hash Maps",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    starterCode: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
`,
  },
  {
    id: "lru-cache",
    title: "LRU Cache Design",
    difficulty: "Medium",
    category: "Data Structures",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations.",
    starterCode: `class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {}

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        val = self.cache.pop(key)
        self.cache[key] = val
        return val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.pop(key)
        elif len(self.cache) >= self.cap:
            next_key = next(iter(self.cache))
            self.cache.pop(next_key)
        self.cache[key] = value

lru = LRUCache(2)
lru.put(1, 1)
lru.put(2, 2)
print(lru.get(1)) # returns 1
`,
  },
  {
    id: "median-two-sorted",
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    category: "Binary Search",
    description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays in O(log(min(m, n))) time.",
    starterCode: `def find_median_sorted_arrays(nums1, nums2):
    # Binary search partitioning on smaller array
    A, B = (nums1, nums2) if len(nums1) <= len(nums2) else (nums2, nums1)
    total = len(A) + len(B)
    half = total // 2
    l, r = 0, len(A) - 1

    while True:
        i = (l + r) // 2 # A
        j = half - i - 2 # B
        Aleft = A[i] if i >= 0 else float("-infinity")
        Aright = A[i + 1] if (i + 1) < len(A) else float("infinity")
        Bleft = B[j] if j >= 0 else float("-infinity")
        Bright = B[j + 1] if (j + 1) < len(B) else float("infinity")

        if Aleft <= Bright and Bleft <= Aright:
            if total % 2:
                return min(Aright, Bright)
            return (max(Aleft, Bleft) + min(Aright, Bright)) / 2
        elif Aleft > Bright:
            r = i - 1
        else:
            l = i + 1

print(find_median_sorted_arrays([1, 3], [2])) # Expected: 2.0
`,
  },
];

export function LearningHubView() {
  const [activeTab, setActiveTab] = React.useState("dsa");
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<number, number>>({});
  const [showResults, setShowResults] = React.useState<Record<number, boolean>>({});

  // Recursion Visualizer state
  const [recStep, setRecStep] = React.useState(0);
  const recSteps = [
    { call: "fib(4)", desc: "Calls fib(3) and fib(2)", depth: 0, result: "?" },
    { call: "fib(3)", desc: "Calls fib(2) and fib(1)", depth: 1, result: "?" },
    { call: "fib(2)", desc: "Calls fib(1) and fib(0)", depth: 2, result: "?" },
    { call: "fib(1)", desc: "Base case: returns 1", depth: 3, result: "1" },
    { call: "fib(0)", desc: "Base case: returns 0", depth: 3, result: "0" },
    { call: "fib(2)", desc: "Computes 1 + 0 = 1", depth: 2, result: "1" },
    { call: "fib(1)", desc: "Base case: returns 1", depth: 2, result: "1" },
    { call: "fib(3)", desc: "Computes 1 + 1 = 2", depth: 1, result: "2" },
    { call: "fib(2)", desc: "Subtree evaluation returns 1", depth: 1, result: "1" },
    { call: "fib(4)", desc: "Final root evaluation: 2 + 1 = 3", depth: 0, result: "3" },
  ];

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setShowResults((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleSolveInIde = (code: string) => {
    try {
      localStorage.setItem(
        "nova_editor_import",
        JSON.stringify({
          language: "python",
          code,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border border-border bg-gradient-to-r from-card via-card to-primary/5 shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              NOVA Learning Hub & DSA Lab
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Master Data Structures, Algorithms, and System Design with interactive simulations and AI tutoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-muted/40 p-2.5 rounded-xl border border-border">
          <Flame className="h-5 w-5 text-amber-500 fill-amber-500" />
          <div className="text-left text-xs">
            <span className="font-bold text-foreground">Daily Streak: 3 Days</span>
            <p className="text-muted-foreground text-[10px]">Daily Challenge Ready</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="dsa">DSA Practice</TabsTrigger>
          <TabsTrigger value="quizzes">MCQs & Quizzes</TabsTrigger>
          <TabsTrigger value="visualizer">Recursion Visualizer</TabsTrigger>
        </TabsList>

        {/* DSA Practice Tab */}
        <TabsContent value="dsa" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DSA_PROBLEMS.map((prob) => (
              <div
                key={prob.id}
                className="flex flex-col justify-between p-5 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-all shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        prob.difficulty === "Easy"
                          ? "success"
                          : prob.difficulty === "Medium"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {prob.difficulty}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{prob.category}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{prob.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {prob.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <Link
                    href={`/ide?import=true&lang=python`}
                    onClick={() => handleSolveInIde(prob.starterCode)}
                  >
                    <Button size="sm" className="space-x-1.5 h-8 text-xs">
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Solve in IDE</span>
                    </Button>
                  </Link>
                  <Link href={`/chat?q=Explain%20how%20to%20solve%20${encodeURIComponent(prob.title)}%20step%20by%20step`}>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground">
                      <span>Ask AI Tutor</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* MCQs & Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4 pt-4">
          <div className="space-y-4 max-w-3xl">
            {QUIZZES.map((q) => {
              const selected = selectedAnswers[q.id];
              const revealed = showResults[q.id];
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-xl border border-border bg-card/60 space-y-3 shadow-sm"
                >
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Question {q.id}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, oIdx) => {
                      let btnStyle = "border-border hover:bg-muted text-foreground";
                      if (revealed) {
                        if (oIdx === q.correctIndex) {
                          btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold";
                        } else if (selected === oIdx) {
                          btnStyle = "border-rose-500 bg-rose-500/15 text-rose-400";
                        }
                      }
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(q.id, oIdx)}
                          disabled={revealed}
                          className={`text-left p-3 rounded-lg border text-xs transition-colors ${btnStyle}`}
                        >
                          <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {revealed && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center space-x-1 font-semibold text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Explanation:</span>
                      </div>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Recursion Visualizer Tab */}
        <TabsContent value="visualizer" className="space-y-4 pt-4">
          <div className="p-6 rounded-xl border border-border bg-card/60 space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Interactive Recursion Tree: Fibonacci(4)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Step through recursive call stack activation, tree branching, and return evaluations.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRecStep(0)}
                  disabled={recStep === 0}
                  className="h-8 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={() => setRecStep((s) => Math.min(s + 1, recSteps.length - 1))}
                  disabled={recStep === recSteps.length - 1}
                  className="h-8 text-xs space-x-1"
                >
                  <span>Step Next</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Visualizer Frame */}
            <div className="p-4 rounded-lg border border-border bg-[#0d1117] font-mono text-xs text-slate-200 min-h-[220px] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-slate-400 text-[11px] pb-2 border-b border-border/40">
                  Execution Step {recStep + 1} of {recSteps.length}
                </div>
                <div className="space-y-1.5 pt-1">
                  {recSteps.slice(0, recStep + 1).map((s, idx) => (
                    <div
                      key={idx}
                      style={{ paddingLeft: `${s.depth * 24}px` }}
                      className={`flex items-center space-x-2 py-1 transition-all ${
                        idx === recStep
                          ? "text-emerald-400 font-bold bg-emerald-500/10 rounded px-2"
                          : "text-slate-400 opacity-80"
                      }`}
                    >
                      <span className="text-[10px] opacity-60">[{idx + 1}]</span>
                      <span>{s.call}</span>
                      <span className="text-slate-400 text-[11px]">→ {s.desc}</span>
                      {s.result !== "?" && (
                        <Badge variant="outline" className="text-[10px] h-4 py-0 ml-auto">
                          returned: {s.result}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Stack Depth: {recSteps[recStep].depth}</span>
                <span>Active Expression: {recSteps[recStep].call}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
