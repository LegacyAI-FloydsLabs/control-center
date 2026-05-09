/**
 * Pattern banks for terminal output classification.
 *
 * Each pattern has a regex and a label. Patterns are ordered by specificity
 * within each bank — more specific patterns first to avoid false matches.
 */

export interface Pattern {
  re: RegExp;
  label: string;
}

// ---------------------------------------------------------------------------
// PROMPT patterns — shell is ready for input
// Match against the LAST LINE of output only
// ---------------------------------------------------------------------------
export const PROMPT_PATTERNS: Pattern[] = [
  // Bash/Zsh common prompts
  { re: /\$\s*$/, label: "bash-dollar" },
  { re: />\s*$/, label: "generic-gt" },
  { re: /#\s*$/, label: "root-hash" },
  { re: /❯\s*$/, label: "starship-arrow" },
  { re: /➜\s*$/, label: "ohmyzsh-arrow" },
  { re: /λ\s*$/, label: "lambda" },
  { re: /→\s*$/, label: "arrow" },

  // Language REPLs
  { re: />>>\s*$/, label: "python-repl" },
  { re: /^\.\.\. ?$/, label: "python-continuation" },
  { re: /In \[\d+\]:\s*$/, label: "ipython" },
  { re: /irb\([^)]*\):\d+:\d+>\s*$/, label: "ruby-irb" },
  { re: /pry\([^)]*\)>\s*$/, label: "ruby-pry" },

  // Database REPLs
  { re: /mysql>\s*$/, label: "mysql" },
  { re: /postgres[=#]>\s*$/, label: "psql" },
  { re: /sqlite>\s*$/, label: "sqlite" },
  { re: /redis[-\d.]*>\s*$/, label: "redis" },
  { re: /mongo[sh]*>\s*$/, label: "mongo" },

  // Debug
  { re: /\(gdb\)\s*$/, label: "gdb" },
  { re: /\(lldb\)\s*$/, label: "lldb" },
  { re: /\(Pdb\)\s*$/, label: "python-debugger" },
  { re: /debug>\s*$/, label: "node-debug" },

  // Node
  { re: />\s*$/, label: "node-repl" }, // intentionally last — very broad
];

// ---------------------------------------------------------------------------
// INPUT_WAITING patterns — process is asking the user/agent something
// Match against the LAST LINE of output only
// These are HIGHER priority than PROMPT patterns when a command is pending
// ---------------------------------------------------------------------------
export const INPUT_PATTERNS: Pattern[] = [
  // Yes/No confirmation
  { re: /\[y\/n\]\s*$/i, label: "yn-bracket" },
  { re: /\[Y\/n\]\s*$/i, label: "Yn-bracket" },
  { re: /\[yes\/no\]\s*$/i, label: "yesno-bracket" },
  { re: /\(y\/n\)\s*$/i, label: "yn-paren" },
  { re: /\?[:\s]*$/i, label: "question-mark" },
  { re: /continue\?\s*$/i, label: "continue-prompt" },
  { re: /proceed\?\s*$/i, label: "proceed-prompt" },
  { re: /overwrite\s*\(y\/n\)/i, label: "overwrite-yn" },

  // Password / passphrase
  { re: /password[:\s]*$/i, label: "password" },
  { re: /passphrase[:\s]*$/i, label: "passphrase" },
  { re: /\[sudo\] password/i, label: "sudo-password" },
  { re: /enter pem pass phrase/i, label: "pem-passphrase" },

  // SSH
  { re: /fingerprint.*\(yes\/no/i, label: "ssh-fingerprint" },
  { re: /Are you sure you want to continue connecting/i, label: "ssh-continue" },

  // Git
  { re: /enter commit message/i, label: "git-commit-msg" },
  { re: /pick, (?:squash|fixup|reword|edit|drop)/i, label: "git-rebase" },

  // Package managers
  { re: /is this OK\?/i, label: "npm-ok" },
  { re: /Do you want to install/i, label: "install-confirm" },
  { re: /RETURN.*to continue/i, label: "return-continue" },
  { re: /Press (?:ENTER|RETURN)/i, label: "press-enter" },
];

// ---------------------------------------------------------------------------
// ERROR patterns — something went wrong
// Match against FULL output (not just last line), but only when command context
// suggests the output is live (not displayed historical content)
// ---------------------------------------------------------------------------
export const ERROR_PATTERNS: Pattern[] = [
  // Generic
  { re: /^error(?:\[[\w]+\])?:/im, label: "error-prefix" },
  { re: /^ERROR:/im, label: "error-upper" },
  { re: /^FATAL:/im, label: "fatal" },
  { re: /^FAIL /im, label: "fail-prefix" },
  { re: /failed with exit code \d+/i, label: "exit-code-fail" },
  { re: /permission denied/i, label: "permission-denied" },
  { re: /command not found/i, label: "command-not-found" },
  { re: /no such file or directory/i, label: "enoent" },

  // Python
  { re: /^Traceback \(most recent call last\)/m, label: "python-traceback" },
  { re: /^(?:SyntaxError|TypeError|ValueError|KeyError|IndexError|AttributeError|ImportError|NameError|RuntimeError):/m, label: "python-exception" },

  // Rust
  { re: /^error\[E\d+\]:/m, label: "rust-error" },
  { re: /could not compile/i, label: "rust-compile-fail" },

  // Node/JS
  { re: /^(?:SyntaxError|TypeError|ReferenceError|RangeError):/m, label: "js-error" },
  { re: /npm ERR!/m, label: "npm-error" },
  { re: /ERR_MODULE_NOT_FOUND/m, label: "node-module-not-found" },

  // C/C++
  { re: /segmentation fault/i, label: "segfault" },
  { re: /^.*:\d+:\d+: (?:error|fatal error):/m, label: "gcc-clang-error" },

  // Go
  { re: /^\.\/\w+\.go:\d+:\d+:/m, label: "go-error" },
  { re: /cannot find package/i, label: "go-package-missing" },

  // Java
  { re: /^Exception in thread/m, label: "java-exception" },
  { re: /^Caused by:/m, label: "java-caused-by" },

  // Docker
  { re: /^Error response from daemon/m, label: "docker-error" },

  // General build
  { re: /BUILD FAILED/i, label: "build-failed" },
  { re: /make\[\d+\]: \*\*\*/m, label: "make-error" },
];

// ---------------------------------------------------------------------------
// PROGRESS patterns — work is happening, not done yet
// Match against recent output
// ---------------------------------------------------------------------------
export const PROGRESS_PATTERNS: Pattern[] = [
  { re: /\d+%/, label: "percentage" },
  { re: /\[=+>?\s*\]/, label: "progress-bar" },
  { re: /downloading/i, label: "downloading" },
  { re: /compiling/i, label: "compiling" },
  { re: /building/i, label: "building" },
  { re: /installing/i, label: "installing" },
  { re: /linking/i, label: "linking" },
  { re: /bundling/i, label: "bundling" },
  { re: /ETA\s/i, label: "eta" },
  { re: /\d+\/\d+\s+(tests?|specs?|suites?)/i, label: "test-progress" },
];


// ---------------------------------------------------------------------------
// Pattern Registry — runtime extensibility for pattern banks
// ---------------------------------------------------------------------------

export type PatternBank = "prompt" | "input" | "error" | "progress";

export class PatternRegistry {
  /** Get all patterns for a bank */
  get(bank: PatternBank): Pattern[] {
    switch (bank) {
      case "prompt": return PROMPT_PATTERNS;
      case "input": return INPUT_PATTERNS;
      case "error": return ERROR_PATTERNS;
      case "progress": return PROGRESS_PATTERNS;
    }
  }

  /** Add a pattern to a bank */
  add(bank: PatternBank, pattern: Pattern): void {
    this.get(bank).push(pattern);
  }

  /** Remove a pattern by label */
  remove(bank: PatternBank, label: string): boolean {
    const arr = this.get(bank);
    const idx = arr.findIndex((p) => p.label === label);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    return true;
  }

  /** List all banks with pattern counts */
  list(): Record<PatternBank, number> {
    return {
      prompt: PROMPT_PATTERNS.length,
      input: INPUT_PATTERNS.length,
      error: ERROR_PATTERNS.length,
      progress: PROGRESS_PATTERNS.length,
    };
  }
}

/** Singleton registry — add/remove patterns at runtime */
export const patternRegistry = new PatternRegistry();