import { SupportedLanguage } from "./types";
export type { SupportedLanguage } from "./types";

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  judge0Id: number;
  fileName: string;
  monacoLanguage: string;
  compileCommand?: string;
  runtimeVersion?: string;
  starterTemplate: string;
}

export const LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  cpp: {
    id: "cpp",
    name: "C++ (GCC 9.2.0)",
    judge0Id: 54, // GCC 9.2.0 or 105 for GCC 14
    fileName: "main.cpp",
    monacoLanguage: "cpp",
    compileCommand: "g++ -O2 -Wall main.cpp -o main",
    runtimeVersion: "GCC 9.2.0",
    starterTemplate: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    cout << "Hello from NOVA C++ Sandbox!" << endl;
    
    string name;
    if (cin >> name) {
        cout << "Welcome, " << name << "!" << endl;
    }
    
    return 0;
}
`,
  },
  java: {
    id: "java",
    name: "Java (OpenJDK 13.0.1)",
    judge0Id: 62, // OpenJDK 13.0.1
    fileName: "Main.java",
    monacoLanguage: "java",
    compileCommand: "javac Main.java && java Main",
    runtimeVersion: "OpenJDK 13.0.1",
    starterTemplate: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from NOVA Java Sandbox!");
        
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNext()) {
            String input = scanner.nextLine();
            System.out.println("Received: " + input);
        }
        scanner.close();
    }
}
`,
  },
  python: {
    id: "python",
    name: "Python (3.8.1)",
    judge0Id: 71, // Python 3.8.1
    fileName: "main.py",
    monacoLanguage: "python",
    compileCommand: "python3 main.py",
    runtimeVersion: "Python 3.8.1",
    starterTemplate: `import sys

def main():
    print("Hello from NOVA Python Sandbox!")
    
    # Read custom stdin if provided
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        print(f"Received {len(lines)} lines of input:")
        for idx, line in enumerate(lines, 1):
            print(f"  [{idx}] {line}")
    else:
        print("No stdin provided. Provide custom stdin in the console below.")

if __name__ == "__main__":
    main()
`,
  },
  javascript: {
    id: "javascript",
    name: "JavaScript (Node.js 18)",
    judge0Id: 93,
    fileName: "index.js",
    monacoLanguage: "javascript",
    compileCommand: "node index.js",
    runtimeVersion: "Node.js 18.15.0",
    starterTemplate: `console.log("Hello from NOVA JavaScript Sandbox!");

const fs = require("fs");
try {
  const input = fs.readFileSync(0, "utf-8").trim();
  if (input) {
    console.log("Stdin:", input);
  }
} catch (e) {
  // no stdin
}
`,
  },
  typescript: {
    id: "typescript",
    name: "TypeScript (5.0.3)",
    judge0Id: 94,
    fileName: "index.ts",
    monacoLanguage: "typescript",
    compileCommand: "ts-node index.ts",
    runtimeVersion: "TypeScript 5.0.3",
    starterTemplate: `interface Greeter {
  name: string;
  greet(): string;
}

const user: Greeter = {
  name: "NOVA Developer",
  greet() {
    return \`Hello \${this.name} from TypeScript Sandbox!\`;
  }
};

console.log(user.greet());
`,
  },
  go: {
    id: "go",
    name: "Go (1.18.5)",
    judge0Id: 60,
    fileName: "main.go",
    monacoLanguage: "go",
    compileCommand: "go run main.go",
    runtimeVersion: "Go 1.18.5",
    starterTemplate: `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	fmt.Println("Hello from NOVA Go Sandbox!")
	scanner := bufio.NewScanner(os.Stdin)
	if scanner.Scan() {
		fmt.Printf("Received: %s\\n", scanner.Text())
	}
}
`,
  },
  rust: {
    id: "rust",
    name: "Rust (1.68.2)",
    judge0Id: 73,
    fileName: "main.rs",
    monacoLanguage: "rust",
    compileCommand: "rustc main.rs && ./main",
    runtimeVersion: "Rust 1.68.2",
    starterTemplate: `use std::io::{self, Read};

fn main() {
    println!("Hello from NOVA Rust Sandbox!");
    let mut buffer = String::new();
    if let Ok(_) = io::stdin().read_to_string(&mut buffer) {
        if !buffer.trim().is_empty() {
            println!("Stdin content: {}", buffer.trim());
        }
    }
}
`,
  },
};

export const DEFAULT_LANGUAGE: SupportedLanguage = "python";

export function getLanguageConfig(lang: string): LanguageConfig {
  const validLang = (lang in LANGUAGES ? lang : DEFAULT_LANGUAGE) as SupportedLanguage;
  return LANGUAGES[validLang];
}

export function getAllLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES);
}
