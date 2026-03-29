import { Fragment } from "react";
import { BlockMath, InlineMath } from "react-katex";
import { isMathLikeLine, normalizeImportedMathText, toLatexLine } from "@/lib/math-text";

const MATH_TOKEN_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g;

function isLikelyMathToken(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }

  const proseWords = trimmed.match(/[A-Za-z]{3,}/g) ?? [];
  if (proseWords.length > 2) {
    return false;
  }

  return /\\[A-Za-z]+|[\^_=(){}+\-*/<>]|[A-Za-z]\(|\b[a-zA-Z]\b|,/.test(trimmed);
}

function renderInlineTokens(line: string, keyPrefix: string) {
  const parts = line.split(MATH_TOKEN_PATTERN).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <span key={`${keyPrefix}-inline-block-${index}`} className="math-block">
          <BlockMath math={part.slice(2, -2).trim()} />
        </span>
      );
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1).trim();
      if (isLikelyMathToken(math)) {
        return <InlineMath key={`${keyPrefix}-inline-${index}`} math={math} />;
      }

      return <Fragment key={`${keyPrefix}-literal-${index}`}>{part}</Fragment>;
    }

    return <Fragment key={`${keyPrefix}-text-${index}`}>{part}</Fragment>;
  });
}

export function FormattedMathText({
  text,
  className
}: {
  text: string;
  className?: string;
}) {
  const normalized = normalizeImportedMathText(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

  return (
    <div className={className}>
      {lines.map((line, index) => {
        if (line.startsWith("$$") && line.endsWith("$$")) {
          return (
            <div key={`block-${index}`} className="math-block">
              <BlockMath math={line.slice(2, -2).trim()} />
            </div>
          );
        }

        if (line.includes("$")) {
          return (
            <div key={`line-${index}`} className="formatted-line">
              {renderInlineTokens(line, `line-${index}`)}
            </div>
          );
        }

        if (isMathLikeLine(line)) {
          return (
            <div key={`math-${index}`} className="math-block">
              <BlockMath math={toLatexLine(line)} />
            </div>
          );
        }

        return (
          <div key={`text-${index}`} className="formatted-line">
            {line}
          </div>
        );
      })}
    </div>
  );
}
