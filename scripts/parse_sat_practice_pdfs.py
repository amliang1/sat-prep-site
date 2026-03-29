#!/usr/bin/env python3
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent.parent
SAT_DIR = ROOT / "sat-practice"

TESTS = [
    {
        "test_name": "SAT Practice Test 1",
        "practice_pdf": SAT_DIR / "SAT-Practice-Test-1-with-Answer-Key-and-Scoring-Info.pdf",
        "answer_pdf": SAT_DIR / "SAT-Practice-Test-1-with-Answer-Key-and-Scoring-Info.pdf",
    },
    {
        "test_name": "SAT Practice Test 5",
        "practice_pdf": SAT_DIR / "sat-practice-test-5-digital.pdf",
        "answer_pdf": SAT_DIR / "scoring-sat-practice-test-5-digital.pdf",
    },
]


def normalize_whitespace(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def trim_leading_preamble(block: str) -> str:
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    preamble_markers = (
        "Readin g and Writing",
        "Reading and Writing",
        "Math",
        "DIRECTIONS",
        "NOTES",
        "REFERENCE",
        "For multiple-choice",
        "Circle only one answer",
        "For student-produced response questions",
        "question includes one or more passages",
        "question carefully, and then choose the best answer",
        "All questions in this section are multiple-choice",
        "single best answer",
        "Once you've written your answer",
        "If you find more than one correct answer",
        "Your answer can be up to",
        "If your answer is a fraction",
        "If your answer is a decimal",
        "If your answer is a mixed number",
        "Don't include symbols",
        "The questions in this section address",
        "Use of a calculator is permitted",
        "Unless otherwise indicated:",
        "The domain of a given function",
        "The number of degrees of arc",
        "The number of radians of arc",
        "The sum of the measures",
    )

    start_index = 0
    for index, line in enumerate(lines):
        if line.startswith("•") or line in {"A =nr 2", "C=2nr", "A= l w", "A =½ bh", "c2 = a2 + b2", "Special Right Triangles", "V= l wh", "V= nr2h", "V = 4/3πr3", "V= ⅓nr2h", "V =⅓ l wh"}:
            continue
        if re.fullmatch(r"\d+\s+QUESTIONS", line):
            continue
        if any(marker in line for marker in preamble_markers):
            continue
        start_index = index
        break

    return normalize_whitespace("\n".join(lines[start_index:]))


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


def parse_question_blocks(module_text: str, expected_count: int):
    lines = [line.rstrip() for line in module_text.splitlines()]
    start_index = None
    for index, line in enumerate(lines):
        if line.strip() != "1":
            continue
        lookahead_lines = [next_line.strip() for next_line in lines[index + 1 : index + 40] if next_line.strip()]
        if any(candidate.startswith("A)") for candidate in lookahead_lines):
            start_index = index
            break

    if start_index is None:
        return []

    blocks = []
    current_number = None
    current_lines = []
    expected_number = 1

    for line in lines[start_index:]:
        stripped = line.strip()
        if expected_number <= expected_count and stripped == str(expected_number):
            if current_number is not None:
                blocks.append((current_number, normalize_whitespace("\n".join(current_lines))))
            current_number = expected_number
            current_lines = []
            expected_number += 1
            continue

        if current_number is not None:
            current_lines.append(line)

    if current_number is not None:
        blocks.append((current_number, normalize_whitespace("\n".join(current_lines))))

    return blocks


def parse_choices(block: str):
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    stem = []
    choices = []
    current_choice = None

    for line in lines:
        choice_match = re.match(r"^([A-D])\)\s*(.*)$", line)
        if choice_match:
            if current_choice is not None:
                choices.append(current_choice)
            current_choice = {
                "label": choice_match.group(1),
                "text": choice_match.group(2).strip(),
            }
            continue
        if current_choice is not None:
            current_choice["text"] = normalize_whitespace(f"{current_choice['text']} {line}")
        else:
            stem.append(line)

    if current_choice is not None:
        choices.append(current_choice)

    stem_text = normalize_whitespace("\n".join(stem))
    if "STOP" in stem_text:
        stem_text = stem_text.split("STOP")[0].strip()

    return stem_text, choices


def infer_difficulty(section: str, module_number: int):
    if section == "READING_WRITING":
        return "MEDIUM" if module_number == 1 else "HARD"
    return "MEDIUM" if module_number == 1 else "HARD"


def main():
    imported_questions = []

    for config in TESTS:
        modules = extract_module_texts(config["practice_pdf"])
        answer_maps = extract_answer_maps(config["answer_pdf"])

        for module in modules:
            answers = answer_maps[(module["section"], module["module_number"])]
            blocks = parse_question_blocks(module["text"], len(answers))

            for number, block in blocks:
                answer = answers.get(number)
                if not answer:
                    continue

                prompt, choices = parse_choices(trim_leading_preamble(block))
                question_type = "MULTIPLE_CHOICE" if re.fullmatch(r"[A-D]", answer) else "STUDENT_RESPONSE"
                if question_type == "STUDENT_RESPONSE":
                    prompt = block
                    choices = []

                imported_questions.append(
                    {
                        "externalId": f"{config['test_name'].lower().replace(' ', '-')}-{module['section'].lower()}-m{module['module_number']}-q{number}",
                        "source": "Local SAT Practice PDF",
                        "sourceUrl": str(config["practice_pdf"].relative_to(ROOT)),
                        "testName": config["test_name"],
                        "section": module["section"],
                        "moduleNumber": module["module_number"],
                        "domain": f"{config['test_name']} Module {module['module_number']}",
                        "skill": "Official Practice Import",
                        "difficulty": infer_difficulty(module["section"], module["module_number"]),
                        "questionType": question_type,
                        "prompt": prompt,
                        "passage": None,
                        "choices": choices,
                        "answerKey": answer,
                        "tags": [
                            "official-practice",
                            config["test_name"].lower().replace(" ", "-"),
                            f"module-{module['module_number']}",
                            "imported-pdf",
                        ],
                    }
                )

    print(json.dumps(imported_questions))


if __name__ == "__main__":
    main()
