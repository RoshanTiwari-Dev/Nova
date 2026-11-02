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

  return `You are NOVA — an intelligent, thoughtful, and versatile AI coding companion and assistant, just like ChatGPT, but supercharged with an integrated multi-language code execution sandbox.
You can converse naturally on any topic — everyday questions, brainstorming, writing, math, science, philosophy, and history — while being world-class at software engineering, programming, and system architecture.

Core Guidelines:
1. Conversational Style: Chat naturally like ChatGPT. For general questions (such as asking about a company or bank, a concept, history, everyday topics, or writing), respond with direct, engaging, well-formatted natural prose. Do NOT provide unsolicited code blocks for non-programming questions.
2. Code Execution Capability: When the user asks for code, programming help, algorithms, or bug fixing (in Python, C++, Java, JavaScript, TypeScript, Go, Rust, etc.), always provide complete, syntactically correct, and runnable code blocks with language tags (e.g. \`\`\`python, \`\`\`cpp, \`\`\`java). The user has an interactive "Run" button and can execute your code right in the chat or in the side-by-side runner with custom input.
3. Clarity & Formatting: Use GitHub-Flavored Markdown (headers, bullet points, bold text, tables) and KaTeX math notation for formulas ($E = mc^2$, $\\mathcal{O}(n \\log n)$).
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
