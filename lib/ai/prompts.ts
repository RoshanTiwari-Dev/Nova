export interface PromptContext {
  responseStyle?: "concise" | "detailed" | "beginner" | "advanced";
  customInstructions?: string;
  memory?: string;
}

export function buildSystemPrompt(context: PromptContext = {}): string {
  const { responseStyle = "detailed", customInstructions, memory } = context;

  const styleDirectives: Record<string, string> = {
    concise:
      "Be extremely direct, clear, and punchy. Provide only the essential code and minimal necessary explanation. Avoid pleasantries or filler.",
    detailed:
      "Provide comprehensive explanations, breakdown of design trade-offs, edge cases, time/space complexity analysis, and clean, production-grade code.",
    beginner:
      "Explain concepts with friendly analogies, avoiding unnecessary jargon. Annotate code lines clearly, define key programming terms, and offer reassuring encouragement.",
    advanced:
      "Assume senior engineering competency. Focus on architectural patterns, low-level efficiency, asymptotic complexity, concurrency implications, and idiomatic idioms.",
  };

  return `You are NOVA — an intelligent, precise, and friendly AI coding companion and developer agent.
Your purpose is to assist developers in writing, understanding, debugging, refactoring, and optimizing code in C++, Java, Python, and other modern languages.

Core Guidelines:
1. Deliver clean, modern, idiomatic, and syntactically correct code blocks with language identifiers (e.g. \`\`\`cpp, \`\`\`java, \`\`\`python).
2. When answering coding queries, provide well-structured solutions. Point out critical edge cases, boundary conditions, and performance considerations.
3. Use GitHub-Flavored Markdown for all formatting: tables, task lists, and KaTeX math notation for algorithmic formulas (e.g., $O(n \\log n)$).
4. Response Tone & Style: ${styleDirectives[responseStyle] || styleDirectives.detailed}
${customInstructions ? `\nUser Custom Instructions:\n${customInstructions}` : ""}
${memory ? `\nUser Working Memory:\n${memory}` : ""}

At the very end of your response, if applicable, provide exactly 3 concise follow-up suggestion chips formatted on their own line as:
<!-- SUGGESTIONS: ["Suggestion 1", "Suggestion 2", "Suggestion 3"] -->
`;
}

export const CODE_ACTION_PROMPTS = {
  explain: (code: string, language: string) => `
Analyze the following ${language} code line by line. Explain:
1. High-level intent and architecture.
2. Step-by-step line-by-line breakdown.
3. Inputs, outputs, and side effects.
4. Edge cases or potential runtime failure points.

Code:
\`\`\`${language}
${code}
\`\`\`
`,

  debug: (code: string, language: string, error?: string, stdin?: string) => `
Debug this ${language} code.
${error ? `Error / compiler output encountered:\n${error}\n` : ""}
${stdin ? `Standard input provided:\n${stdin}\n` : ""}

Code:
\`\`\`${language}
${code}
\`\`\`

Pinpoint:
1. Root cause of bug/error.
2. Why it happens.
3. How to fix it.
`,

  optimize: (code: string, language: string) => `
Analyze and optimize the following ${language} code for execution speed and memory efficiency.
- Compare the current complexity vs optimal complexity.
- Identify cache locality, unnecessary allocations, or algorithmic bottlenecks.
- Provide the rewritten optimal version.

Code:
\`\`\`${language}
${code}
\`\`\`
`,

  complexity: (code: string, language: string) => `
Analyze the asymptotic time and space complexity of this ${language} code.
- State Time Complexity in Big-O notation with detailed mathematical derivation.
- State Auxiliary Space Complexity in Big-O.
- Compare brute-force approach vs current vs theoretical lower bound optimal approach.

Code:
\`\`\`${language}
${code}
\`\`\`
`,

  generate_tests: (code: string, language: string) => `
Generate a comprehensive suite of unit test cases for this ${language} code.
Include:
1. Standard / typical cases.
2. Edge cases (empty inputs, zero, negatives, singletons, max integers).
3. Boundary / corner conditions.
4. Malformed / unexpected inputs.

Code:
\`\`\`${language}
${code}
\`\`\`
`,

  review: (code: string, language: string) => `
Conduct a rigorous code review of this ${language} snippet covering:
1. Correctness & logic bugs.
2. Security issues (buffer overflow, injection, bounds checks, memory leaks).
3. Code style, naming conventions, and readability.
4. Concurrency or performance bottlenecks.
5. Actionable rating (1 to 10) and summary verdict.

Code:
\`\`\`${language}
${code}
\`\`\`
`,

  document: (code: string, language: string) => `
Add industry-standard documentation (e.g. Javadoc, Doxygen, Sphinx/Docstrings) to this ${language} code.
Include parameters, return values, exceptions, and usage examples.

Code:
\`\`\`${language}
${code}
\`\`\`
`,

  explain_concept: (concept: string) => `
Provide a masterclass explanation of the computer science concept: "${concept}".
Cover:
1. Intuitive explanation with a real-world analogy.
2. Formal definitions & internal mechanics.
3. Code example in Python or C++.
4. Common pitfalls and interview relevance.
`,
};
