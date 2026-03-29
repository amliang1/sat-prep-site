type ImportedChoice = {
  label: string;
  text: string;
};

type ImportedQuestion = {
  externalId: string;
  prompt: string;
  passage: string | null;
  choices: ImportedChoice[];
};

type QuestionOverride = {
  prompt?: string;
  passage?: string | null;
  choices?: Record<string, string>;
};

const QUESTION_OVERRIDES: Record<string, QuestionOverride> = {
  "sat-practice-test-1-math-m1-q4": {
    prompt: "The function $g$ is defined by $g(x) = x^2 + 9$. For which value of $x$ is $g(x) = 25$?"
  },
  "sat-practice-test-1-math-m1-q5": {
    choices: {
      A: "$\\frac{1}{14}$",
      B: "$\\frac{2}{14}$",
      C: "$\\frac{12}{14}$",
      D: "$\\frac{13}{14}$"
    }
  },
  "sat-practice-test-1-math-m1-q7": {
    prompt: "The function $f$ is defined by the equation $f(x) = 7x + 2$. What is the value of $f(x)$ when $x = 4$?"
  },
  "sat-practice-test-1-math-m1-q8": {
    prompt:
      "A teacher is creating an assignment worth 70 points. The assignment will consist of questions worth 1 point and questions worth 3 points. Which equation represents this situation, where $x$ represents the number of 1-point questions and $y$ represents the number of 3-point questions?",
    choices: {
      A: "$4xy = 70$",
      B: "$4(x + y) = 70$",
      C: "$3x + y = 70$",
      D: "$x + 3y = 70$"
    }
  },
  "sat-practice-test-1-math-m1-q10": {
    prompt:
      "$$y = -3x$$\n$$4x + y = 15$$\nThe solution to the given system of equations is $(x, y)$. What is the value of $x$?"
  },
  "sat-practice-test-1-math-m1-q11": {
    choices: {
      A: "$y = -1.9x - 10.1$",
      B: "$y = -1.9x + 10.1$",
      C: "$y = 1.9x - 10.1$",
      D: "$y = 1.9x + 10.1$"
    }
  },
  "sat-practice-test-1-math-m1-q12": {
    prompt:
      "The graph of $y = f(x)$ is shown, where the function $f$ is defined by $f(x) = ax^3 + bx^2 + cx + d$ and $a$, $b$, $c$, and $d$ are constants. For how many values of $x$ does $f(x) = 0$?"
  },
  "sat-practice-test-1-math-m1-q14": {
    prompt: "$$z^2 + 10z - 24 = 0$$\nWhat is one of the solutions to the given equation?"
  },
  "sat-practice-test-1-math-m1-q16": {
    prompt: "Which expression is equivalent to $6x^8y^2 + 12x^2y^2$?",
    choices: {
      A: "$6x^2y^2(x^6)$",
      B: "$6x^2y^2(x^4)$",
      C: "$6x^2y^2(x^6 + 2)$",
      D: "$6x^2y^2(x^4 + 2)$"
    }
  },
  "sat-practice-test-1-math-m1-q17": {
    prompt:
      "A neighborhood consists of a 2-hectare park and a 35-hectare residential area. The total number of trees in the neighborhood is 3,934. The equation $2x + 35y = 3{,}934$ represents this situation. Which of the following is the best interpretation of $x$ in this context?"
  },
  "sat-practice-test-1-math-m1-q18": {
    choices: {
      A: "$y = 8x + 12$",
      B: "$8x + 12y = 480$",
      C: "$y = 12x + 8$",
      D: "$12x + 8y = 480$"
    }
  },
  "sat-practice-test-1-math-m1-q24": {
    prompt:
      "For line $h$, the table shows three values of $x$ and their corresponding values of $y$.\n$$\\begin{array}{cc}x & y \\\\ 18 & 130 \\\\ 23 & 160 \\\\ 26 & 178\\end{array}$$\nLine $k$ is the result of translating line $h$ down 5 units in the $xy$-plane. What is the $x$-intercept of line $k$?",
    choices: {
      A: "$\\left(-\\frac{26}{3}, 0\\right)$",
      B: "$\\left(-\\frac{9}{2}, 0\\right)$",
      C: "$\\left(-\\frac{11}{3}, 0\\right)$",
      D: "$\\left(-\\frac{17}{6}, 0\\right)$"
    }
  },
  "sat-practice-test-1-math-m1-q25": {
    prompt:
      "In the $xy$-plane, the graph of the equation $y = -x^2 + 9x - 100$ intersects the line $y = c$ at exactly one point. What is the value of $c$?",
    choices: {
      A: "$-\\frac{481}{4}$",
      B: "$-100$",
      C: "$-\\frac{319}{4}$",
      D: "$-\\frac{9}{2}$"
    }
  },
  "sat-practice-test-1-math-m1-q26": {
    prompt:
      "$$2x + 3y = 7$$\n$$10x + 15y = 35$$\nFor each real number $r$, which of the following points lies on the graph of each equation in the $xy$-plane for the given system?",
    choices: {
      A: "$\\left(\\frac{r}{5} + 7, -\\frac{r}{5} + 35\\right)$",
      B: "$\\left(-\\frac{3r}{2} + \\frac{7}{2}, r\\right)$",
      C: "$\\left(r, \\frac{2r}{3} + \\frac{7}{3}\\right)$",
      D: "$\\left(r, -\\frac{3r}{2} + \\frac{7}{2}\\right)$"
    }
  },
  "sat-practice-test-1-math-m1-q27": {
    prompt:
      "The perimeter of an equilateral triangle is 624 centimeters. The height of this triangle is $k\\sqrt{3}$ centimeters, where $k$ is a constant. What is the value of $k$?"
  },
  "sat-practice-test-1-math-m2-q8": {
    prompt:
      "The function $f$ is defined by $f(x) = \\frac{1}{10}x - 2$. What is the $y$-intercept of the graph of $y = f(x)$ in the $xy$-plane?",
    choices: {
      A: "$(-2, 0)$",
      B: "$(0, -2)$",
      C: "$\\left(0, \\frac{1}{10}\\right)$",
      D: "$\\left(\\frac{1}{10}, 0\\right)$"
    }
  },
  "sat-practice-test-1-math-m2-q9": {
    prompt:
      "The function $f$ is defined by $f(x) = 7x^3$. In the $xy$-plane, the graph of $y = g(x)$ is the result of shifting the graph of $y = f(x)$ down 2 units. Which equation defines function $g$?",
    choices: {
      A: "$g(x) = \\frac{7}{2}x^3$",
      B: "$g(x) = 7x^{\\frac{3}{2}}$",
      C: "$g(x) = 7x^3 + 2$",
      D: "$g(x) = 7x^3 - 2$"
    }
  },
  "sat-practice-test-1-math-m2-q10": {
    prompt:
      "$$x + 7 = 10$$\n$$y = (x + 7)^2$$\nWhich ordered pair $(x, y)$ is a solution to the given system of equations?",
    choices: {
      A: "$(3, 100)$",
      B: "$(3, 3)$",
      C: "$(3, 10)$",
      D: "$(3, 70)$"
    }
  },
  "sat-practice-test-1-math-m2-q11": {
    prompt: "Which expression is equivalent to $(7x^3 + 7x) - (6x^3 - 3x)$?",
    choices: {
      A: "$x^3 + 10x$",
      B: "$-13x^3 + 10x$",
      C: "$-13x^3 + 4x$",
      D: "$x^3 + 4x$"
    }
  },
  "sat-practice-test-1-math-m2-q15": {
    prompt:
      "The equation $E(t) = 5(1.8)^t$ gives the estimated number of employees at a restaurant, where $t$ is the number of years since the restaurant opened. Which of the following is the best interpretation of the number 5 in this context?"
  },
  "sat-practice-test-1-math-m2-q16": {
    prompt: "$$g(x) = x^2 + 55$$\nWhat is the minimum value of the given function?"
  },
  "sat-practice-test-1-math-m2-q23": {
    prompt: "What is the diameter of the circle in the $xy$-plane with equation $(x - 5)^2 + (y - 3)^2 = 16$?"
  },
  "sat-practice-test-1-math-m2-q26": {
    prompt:
      "$$5x + 7y = 1$$\n$$ax + by = 1$$\nIn the given pair of equations, $a$ and $b$ are constants. The graph of this pair of equations in the $xy$-plane is a pair of perpendicular lines. Which of the following pairs of equations also represents a pair of perpendicular lines?",
    choices: {
      A: "$$10x + 7y = 1$$\n$$ax - 2by = 1$$",
      B: "$$10x + 7y = 1$$\n$$ax + 2by = 1$$",
      C: "$$10x + 7y = 1$$\n$$2ax + by = 1$$",
      D: "$$5x - 7y = 1$$\n$$ax + by = 1$$"
    }
  },
  "sat-practice-test-1-math-m2-q27": {
    prompt:
      "$$x^2 - 34x + c = 0$$\nIn the given equation, $c$ is a constant. The equation has no real solutions if $c > n$. What is the least possible value of $n$?"
  },
  "sat-practice-test-5-math-m1-q21": {
    prompt:
      "The function $g$ is defined by $g(x) = (x + 14)(t - x)$, where $t$ is a constant. In the $xy$-plane, the graph of $y = g(x)$ passes through the point $(24, 0)$. What is the value of $g(0)$?"
  },
  "sat-practice-test-5-math-m1-q26": {
    prompt:
      "The function $f$ is defined by $f(x) = ax^2 + bx + c$, where $a$, $b$, and $c$ are constants. The graph of $y = f(x)$ in the $xy$-plane passes through the points $(7, 0)$ and $(-3, 0)$. If $a$ is an integer greater than 1, which of the following could be the value of $a + b$?"
  },
  "sat-practice-test-5-math-m2-q14": {
    prompt:
      "The length of each edge of a box is 29 inches. Each side of the box is in the shape of a square. The box does not have a lid. What is the exterior surface area, in square inches, of this box without a lid?"
  },
  "sat-practice-test-5-math-m2-q18": {
    prompt: "If $4\\sqrt{2x} = 16$, what is the value of $6x$?"
  },
  "sat-practice-test-5-math-m2-q21": {
    prompt:
      "A rectangle is inscribed in a circle, such that each vertex of the rectangle lies on the circumference of the circle. The diagonal of the rectangle is twice the length of the shortest side of the rectangle. The area of the rectangle is $1{,}089\\sqrt{3}$ square units. What is the length, in units, of the diameter of the circle?"
  },
  "sat-practice-test-5-math-m2-q23": {
    prompt: "Which expression is equivalent to $\\frac{42a}{k} + 42ak$, where $k > 0$?",
    choices: {
      A: "$\\frac{84a}{k}$",
      B: "$\\frac{84ak^2}{k}$",
      C: "$\\frac{42a(k + 1)}{k}$",
      D: "$\\frac{42a(k^2 + 1)}{k}$"
    }
  }
};

export function applyImportedQuestionOverrides<T extends ImportedQuestion>(question: T): T {
  const override = QUESTION_OVERRIDES[question.externalId];
  if (!override) {
    return question;
  }

  return {
    ...question,
    prompt: override.prompt ?? question.prompt,
    passage: override.passage === undefined ? question.passage : override.passage,
    choices: question.choices.map((choice) => ({
      ...choice,
      text: override.choices?.[choice.label] ?? choice.text
    }))
  };
}
