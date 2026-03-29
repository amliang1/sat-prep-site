export function stripPdfArtifacts(text: string) {
  return text
    .replace(/\.{10,}.*/g, "")
    .replace(/Unauthorized\s*copying.*$/gim, "")
    .replace(/STOP[\s\S]*$/gim, "")
    .replace(/CONTINUE\d*/gim, "")
    .replace(/\bNo Test Material On This Page\b/g, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeCommonMathForms(text: string) {
  return text
    .replace(/([fgpEm])\s*x\s*x\s*=\s*\+?\s*([0-9]+)\s*2\s*\(\s*\)/g, (_, fn, c) => `${fn}(x) = x^2 + ${c}`)
    .replace(/([fgpEm])\s*x\s*x\s*=\s*([0-9]+)\s*\+\s*2\s*\(\s*\)/g, (_, fn, c) => `${fn}(x) = x^2 + ${c}`)
    .replace(/([fgpEm])\s*\(?t\)?\s*\(\s*\)\s*=\s*([0-9.()]+)\s*t/g, (_, fn, expr) => `${fn}(t) = ${expr}^t`)
    .replace(/([PEm])\((\w)\)\s*=\s*([0-9.]+)\s*\(([^)]+)\)\s*\(\s*([^)]+)\s*(\w)\s*\)/g, "$1($2) = $3($4)^{$5$6}")
    .replace(/([pfg])\s*n\s*n\s*=\s*([0-9]+)\s*([0-9]+)\s*\(\s*\)/g, (_, fn, c, pow) => `${fn}(n) = ${c}n^${pow}`)
    .replace(/^([xyz])\s+([xyz])=\s*([+-]?\d+(?:\.\d+)?)$/gm, (_, left, variable, coef) => `${left} = ${coef}${variable}`)
    .replace(/^x y(\d+)\s+\+\s+(\d+)\s*=\s*(.+)$/gm, (_, a, b, rhs) => `${a}x + ${b}y = ${rhs}`)
    .replace(/^x y(\d+)\s+\+\s*=\s*(.+)$/gm, (_, a, rhs) => `x + ${a}y = ${rhs}`)
    .replace(/^([a-z]) y(\d+)\s+\+\s+(\d+)\s*=\s*(.+)$/gim, (_, variable, a, b, rhs) => `${a}${variable} + ${b}y = ${rhs}`)
    .replace(/xyr\(−\s*2\s*\)\s*\+\s*\(\s*−\s*9\s*\)\s*=\s*22\s*2/g, "(x - 2)^2 + (y - 9)^2 = r^2")
    .replace(/y x x=\s*[−-]\s*\+\s*9\s*[−-]\s*1002/g, "y = -x^2 + 9x - 100")
    .replace(/z z\+\s*10\s*-\s*24\s*=\s*0\s*\n\s*2/g, "z^2 + 10z - 24 = 0")
    .replace(/4 2 x = 16/g, "4^{2x} = 16")
    .replace(/a\s*11\s*12/g, "a^{11/12}")
    .replace(/(\w+)\s*\(\s*\)\s*/g, "$1() ")
    .replace(/([A-Za-z])\s+([0-9]+)\b/g, "$2$1");
}

export function normalizeImportedMathText(text: string) {
  let cleaned = stripPdfArtifacts(text);
  cleaned = cleaned.replace(/\n\s*\./g, ".");
  cleaned = cleaned.replace(/\$(\d+)\s*\n/g, (_, dollars) => `$${dollars} `);
  cleaned = cleaned.replace(/([.,;:?])\n/g, "$1 ");
  cleaned = cleaned.replace(/\n{2,}/g, "\n");
  cleaned = normalizeCommonMathForms(cleaned);
  return cleaned.trim();
}

export function isMathLikeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[A-D]\)/.test(trimmed)) {
    return false;
  }
  const proseWords = trimmed.match(/[A-Za-z]{3,}/g) ?? [];
  if (proseWords.length > 3) {
    return false;
  }
  return (
    /=|\\frac|\\sqrt|\^|\([xytn]\)|[xytnrp]\s*[=+\-]/i.test(trimmed) ||
    (/[\dxytnrpπ]/i.test(trimmed) && /[=+\-]/.test(trimmed) && trimmed.length < 90)
  );
}

export function toLatexLine(line: string) {
  return line
    .replace(/−/g, "-")
    .replace(/π/g, "\\pi ")
    .replace(/(\d)([a-zA-Z])/g, "$1$2")
    .replace(/([a-zA-Z])\^(\d)/g, "$1^{$2}")
    .replace(/([a-zA-Z])\(([^)]*)\)/g, "$1($2)")
    .replace(/%/g, "\\%")
    .trim();
}
