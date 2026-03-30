#!/usr/bin/env python3
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent.parent
SAT_DIR = ROOT / "sat-practice"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemini-3.1-pro-preview")


def normalize_whitespace(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def clean_page_text(text: str) -> str:
    lines = []
    for raw_line in text.splitlines():
      line = raw_line.rstrip()
      if not line:
          lines.append("")
          continue
      if "Unauthorized copying or reuse" in line:
          continue
      if "CO N T I N U E" in line or "CO N TI" in line or "CO N T IN" in line:
          continue
      if line.strip() == "No Test Material On This Page":
          continue
      lines.append(line)
    return "\n".join(lines)


def infer_difficulty(section: str, module_number: int):
    if section == "READING_WRITING":
        return "MEDIUM" if module_number == 1 else "HARD"
    return "MEDIUM" if module_number == 1 else "HARD"


def extract_module_texts(practice_pdf: Path):
    pages = [clean_page_text(page.extract_text() or "") for page in PdfReader(str(practice_pdf)).pages]
    modules = []
    current = None
    rw_count = 0
    math_count = 0

    def maybe_finish():
        nonlocal current
        if current:
            current["text"] = "\n".join(current["pages"]).strip()
            del current["pages"]
            modules.append(current)
            current = None

    for page_text in pages:
        if not page_text.strip():
            continue
        if "Scoring Your Paper" in page_text or "SAT ANSWER EXPLANATIONS" in page_text:
            maybe_finish()
            break

        if re.search(r"Read\s*in\s*g?\s+and\s+Writing", page_text, re.IGNORECASE) and "DIRECTIONS" in page_text and "QUESTIONS" in page_text:
            maybe_finish()
            rw_count += 1
            current = {
                "section": "READING_WRITING",
                "module_number": rw_count,
                "pages": [page_text],
            }
            continue

        if re.search(r"\bMath\b", page_text) and "DIRECTIONS" in page_text and "QUESTIONS" in page_text:
            maybe_finish()
            math_count += 1
            current = {
                "section": "MATH",
                "module_number": math_count,
                "pages": [page_text],
            }
            continue

        if current:
            current["pages"].append(page_text)

    maybe_finish()
    return modules


def extract_answer_maps(answer_pdf: Path):
    reader = PdfReader(str(answer_pdf))
    candidate_pages = []
    for page in reader.pages:
        text = clean_page_text(page.extract_text() or "")
        if "SAT Practice Test Worksheet:" in text and "QUESTION #" in text and "MARK YOUR" in text:
            candidate_pages.append(text)

    if not candidate_pages:
        raise RuntimeError(f"Could not locate answer key in {answer_pdf}")

    def parse_candidate(answer_page: str):
        parts = answer_page.split("QUESTION #")
        maps = []
        for part in parts[1:5]:
            lines = [line.strip() for line in part.splitlines() if line.strip()]
            entries = {}
            for line in lines:
                match = re.match(r"^(\d+)\s+(.+)$", line)
                if not match:
                    continue
                question_number = int(match.group(1))
                answer = match.group(2).strip()
                entries[question_number] = answer
            if entries:
                maps.append(entries)
        return maps

    parsed_candidates = [parse_candidate(page) for page in candidate_pages]
    valid_candidates = []
    for maps in parsed_candidates:
        if len(maps) != 4:
            continue
        module_four = maps[3]
        first_answer = module_four.get(1, "")
        if re.fullmatch(r"[A-D]|\d+(?:\.\d+)?(?:;\s*[-\d./]+)*", first_answer):
            valid_candidates.append(maps)

    if not valid_candidates:
        raise RuntimeError(f"Expected a valid 4-block answer key in {answer_pdf}")

    maps = valid_candidates[-1]
    return {
        ("READING_WRITING", 1): maps[0],
        ("READING_WRITING", 2): maps[1],
        ("MATH", 1): maps[2],
        ("MATH", 2): maps[3],
    }


def discover_tests():
    pdfs = sorted(SAT_DIR.glob("*.pdf"))
    grouped = {}
    for pdf in pdfs:
        lower = pdf.name.lower()
        match = re.search(r"test[- ]?(\d+)", lower)
        if not match:
            continue
        test_number = int(match.group(1))
        entry = grouped.setdefault(test_number, {"practice_pdf": None, "answer_pdf": None})
        if "scoring" in lower or "answer" in lower:
            entry["answer_pdf"] = pdf
        else:
            entry["practice_pdf"] = pdf

    tests = []
    for test_number, entry in sorted(grouped.items()):
        practice_pdf = entry["practice_pdf"]
        answer_pdf = entry["answer_pdf"] or practice_pdf
        if not practice_pdf or not answer_pdf:
            continue
        tests.append({
            "test_name": f"SAT Practice Test {test_number}",
            "practice_pdf": practice_pdf,
            "answer_pdf": answer_pdf,
        })
    return tests


def build_prompt(test_name: str, section: str, module_number: int, module_text: str, answer_map: dict):
    answer_lines = "\n".join(f"{number}: {answer}" for number, answer in sorted(answer_map.items()))
    return f"""You are parsing an official SAT practice test module into structured question JSON.

Return ONLY valid JSON with this exact schema:
{{
  "questions": [
    {{
      "number": 1,
      "passage": "string or null",
      "prompt": "string",
      "choices": [{{"label":"A","text":"..."}}, {{"label":"B","text":"..."}}, {{"label":"C","text":"..."}}, {{"label":"D","text":"..."}}],
      "questionType": "MULTIPLE_CHOICE" or "STUDENT_RESPONSE",
      "skill": "short SAT skill label",
      "domain": "official SAT domain label",
      "formatNotes": "brief parser notes or empty string"
    }}
  ]
}}

Rules:
- Preserve wording faithfully while cleaning OCR/PDF spacing.
- Use LaTeX delimiters like $...$ only when the text clearly represents math notation.
- Put shared passage text in "passage" when multiple questions use it; otherwise use null.
- For student-response questions, set "choices" to [].
- Include every question in this module exactly once.
- Do not invent answer keys. The answer key is provided separately below and will be merged later.
- Domain must be one of:
  - Information and Ideas
  - Craft and Structure
  - Expression of Ideas
  - Standard English Conventions
  - Algebra
  - Advanced Math
  - Problem-Solving and Data Analysis
  - Geometry and Trigonometry

Test: {test_name}
Section: {section}
Module: {module_number}
Expected questions: {len(answer_map)}

Answer key:
{answer_lines}

Module text:
{module_text}
"""


def call_gemini_json(prompt: str):
    if OPENROUTER_API_KEY:
        return call_openrouter_json(prompt)
    if not GEMINI_API_KEY:
        raise RuntimeError("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is configured")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={urllib.parse.quote(GEMINI_API_KEY)}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini request failed: {details}") from error

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def call_openrouter_json(prompt: str):
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "SAT Forge Importer",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenRouter request failed: {details}") from error

    text = data["choices"][0]["message"]["content"]
    return json.loads(text)


def sanitize_choice_label(value: str):
    label = (value or "").strip().upper()
    return label[:1]


def convert_ai_questions(config, module, structured_questions, answer_map):
    imported_questions = []
    for item in structured_questions:
        question_number = int(item["number"])
        answer = answer_map.get(question_number)
        if not answer:
            continue

        question_type = item.get("questionType") or ("MULTIPLE_CHOICE" if re.fullmatch(r"[A-D]", answer) else "STUDENT_RESPONSE")
        choices = item.get("choices") or []
        normalized_choices = [
            {
                "label": sanitize_choice_label(choice.get("label", "")),
                "text": normalize_whitespace(choice.get("text", "")),
            }
            for choice in choices
            if choice.get("text")
        ]

        imported_questions.append(
            {
                "externalId": f"{config['test_name'].lower().replace(' ', '-')}-{module['section'].lower()}-m{module['module_number']}-q{question_number}",
                "source": "AI Parsed SAT Practice PDF",
                "sourceUrl": str(config["practice_pdf"].relative_to(ROOT)),
                "testName": config["test_name"],
                "section": module["section"],
                "moduleNumber": module["module_number"],
                "domain": normalize_whitespace(item.get("domain", "") or f"{config['test_name']} Module {module['module_number']}"),
                "skill": normalize_whitespace(item.get("skill", "") or "AI Imported Practice"),
                "difficulty": infer_difficulty(module["section"], module["module_number"]),
                "questionType": question_type,
                "prompt": normalize_whitespace(item.get("prompt", "")),
                "passage": normalize_whitespace(item.get("passage", "")) if item.get("passage") else None,
                "choices": normalized_choices if question_type == "MULTIPLE_CHOICE" else [],
                "answerKey": answer,
                "tags": [
                    "official-practice",
                    config["test_name"].lower().replace(" ", "-"),
                    f"module-{module['module_number']}",
                    "imported-pdf",
                    "ai-imported-pdf",
                ],
            }
        )
    return imported_questions


def main():
    tests = discover_tests()
    if not tests:
        raise RuntimeError(f"No SAT practice test PDFs found in {SAT_DIR}")

    imported_questions = []
    for config in tests:
        modules = extract_module_texts(config["practice_pdf"])
        answer_maps = extract_answer_maps(config["answer_pdf"])

        for module in modules:
            answer_map = answer_maps.get((module["section"], module["module_number"]))
            if not answer_map:
                continue
            prompt = build_prompt(config["test_name"], module["section"], module["module_number"], module["text"], answer_map)
            parsed = call_gemini_json(prompt)
            structured_questions = parsed.get("questions", [])
            imported_questions.extend(convert_ai_questions(config, module, structured_questions, answer_map))

    print(json.dumps(imported_questions))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
