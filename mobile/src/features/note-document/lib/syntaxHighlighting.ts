/**
 * Simple syntax highlighting for code blocks
 * Based on regex patterns for common programming languages
 */

import type { Colors } from '@/shared/config';

export type SyntaxToken = {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'plain';
  content: string;
  color: string;
};

export type LanguageHighlighter = {
  patterns: Array<{
    regex: RegExp;
    type: SyntaxToken['type'];
  }>;
};

/**
 * Language-specific syntax patterns
 */
const LANGUAGE_PATTERNS: Record<string, LanguageHighlighter> = {
  javascript: {
    patterns: [
      {
        regex: /\/\/.*$/gm,
        type: 'comment',
      },
      {
        regex: /\/\*[\s\S]*?\*\//g,
        type: 'comment',
      },
      {
        regex: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
        type: 'string',
      },
      {
        regex:
          /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
        type: 'keyword',
      },
      {
        regex: /\b\d+\.?\d*\b/g,
        type: 'number',
      },
      {
        regex: /\b[A-Z][a-zA-Z0-9]*\b/g,
        type: 'function',
      },
    ],
  },
  typescript: {
    patterns: [
      {
        regex: /\/\/.*$/gm,
        type: 'comment',
      },
      {
        regex: /\/\*[\s\S]*?\*\//g,
        type: 'comment',
      },
      {
        regex: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
        type: 'string',
      },
      {
        regex:
          /\b(abstract|any|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|of|package|private|protected|public|readonly|require|return|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g,
        type: 'keyword',
      },
      {
        regex: /\b\d+\.?\d*\b/g,
        type: 'number',
      },
      {
        regex: /\b[A-Z][a-zA-Z0-9]*\b/g,
        type: 'function',
      },
    ],
  },
  python: {
    patterns: [
      {
        regex: /#.*$/gm,
        type: 'comment',
      },
      {
        regex: /("""[\s\S]*?"""|'''[\s\S]*?''')/g,
        type: 'comment',
      },
      {
        regex: /(["'])(?:(?=(\\?))\2.)*?\1/g,
        type: 'string',
      },
      {
        regex:
          /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g,
        type: 'keyword',
      },
      {
        regex: /\b\d+\.?\d*\b/g,
        type: 'number',
      },
      {
        regex: /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
        type: 'function',
      },
    ],
  },
  json: {
    patterns: [
      {
        regex: /"[^"]*"(?=\s*:)/g,
        type: 'keyword',
      },
      {
        regex: /"[^"]*"/g,
        type: 'string',
      },
      {
        regex: /\b(true|false|null)\b/g,
        type: 'keyword',
      },
      {
        regex: /\b\d+\.?\d*\b/g,
        type: 'number',
      },
    ],
  },
  jsx: {
    patterns: [
      {
        regex: /\/\/.*$/gm,
        type: 'comment',
      },
      {
        regex: /\/\*[\s\S]*?\*\//g,
        type: 'comment',
      },
      {
        regex: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
        type: 'string',
      },
      {
        regex:
          /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
        type: 'keyword',
      },
      {
        regex: /\b\d+\.?\d*\b/g,
        type: 'number',
      },
      {
        regex:
          /<\/?[A-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*(?:=(?:"[^"]*"|'[^']*'|{[^}]*}))?)*\s*\/?>/g,
        type: 'function',
      },
    ],
  },
  tsx: {
    patterns: [
      {
        regex: /\/\/.*$/gm,
        type: 'comment',
      },
      {
        regex: /\/\*[\s\S]*?\*\//g,
        type: 'comment',
      },
      {
        regex: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
        type: 'string',
      },
      {
        regex:
          /\b(abstract|any|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|of|package|private|protected|public|readonly|require|return|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g,
        type: 'keyword',
      },
      {
        regex: /\b\d+\.?\d*\b/g,
        type: 'number',
      },
      {
        regex:
          /<\/?[A-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*(?:=(?:"[^"]*"|'[^']*'|{[^}]*}))?)*\s*\/?>/g,
        type: 'function',
      },
    ],
  },
};

// Aliases
LANGUAGE_PATTERNS.js = LANGUAGE_PATTERNS.javascript;
LANGUAGE_PATTERNS.ts = LANGUAGE_PATTERNS.typescript;
LANGUAGE_PATTERNS.py = LANGUAGE_PATTERNS.python;

/**
 * Get syntax highlighting colors for different token types
 */
export function getSyntaxColors(color: Colors) {
  return {
    keyword: '#C792EA', // Purple
    string: '#C3E88D', // Green
    comment: color.text.muted, // Muted
    number: '#F78C6C', // Orange
    function: '#82AAFF', // Blue
    operator: color.text.secondary, // Secondary
    plain: color.text.primary, // Primary
  };
}

/**
 * Tokenize code string based on language patterns
 */
export function tokenizeCode(
  code: string,
  language: string = 'plain',
  color: Colors,
): SyntaxToken[] {
  const highlighter = LANGUAGE_PATTERNS[language.toLowerCase()];

  if (!highlighter) {
    // No highlighting for unknown languages
    return [
      {
        type: 'plain',
        content: code,
        color: color.text.primary,
      },
    ];
  }

  const colors = getSyntaxColors(color);
  const tokens: SyntaxToken[] = [];
  const matches: Array<{ start: number; end: number; type: SyntaxToken['type'] }> = [];

  // Find all matches
  for (const pattern of highlighter.patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(code)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: pattern.type,
      });
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Build tokens, handling overlaps
  let lastIndex = 0;
  const processedRanges: Array<{ start: number; end: number }> = [];

  for (const match of matches) {
    // Skip if this range overlaps with already processed range
    const hasOverlap = processedRanges.some(
      (range) => match.start < range.end && match.end > range.start,
    );

    if (hasOverlap) {
      continue;
    }

    // Add plain text before match
    if (match.start > lastIndex) {
      tokens.push({
        type: 'plain',
        content: code.slice(lastIndex, match.start),
        color: colors.plain,
      });
    }

    // Add highlighted match
    tokens.push({
      type: match.type,
      content: code.slice(match.start, match.end),
      color: colors[match.type],
    });

    processedRanges.push({ start: match.start, end: match.end });
    lastIndex = match.end;
  }

  // Add remaining plain text
  if (lastIndex < code.length) {
    tokens.push({
      type: 'plain',
      content: code.slice(lastIndex),
      color: colors.plain,
    });
  }

  return tokens.length > 0 ? tokens : [{ type: 'plain', content: code, color: colors.plain }];
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_PATTERNS);
}
