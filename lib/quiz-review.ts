import ExcelJS from 'exceljs';

// ── Types ──────────────────────────────────────────────────────────────

export interface ReviewQuestionOption {
  index: number;
  text: string;
  isSelected: boolean;
  isCorrect: boolean;
}

export interface ReviewQuestion {
  id: string;
  questionNumber: number;
  body: string;
  imageUrl: string | null;
  isMultipleChoice: boolean;
  options: ReviewQuestionOption[];
  selectedOptions: number[];
  correctOptions: number[];
  isCorrect: boolean;
  isAnswered: boolean;
}

export interface ReviewSummary {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number | null;
}

export interface ReviewPayload {
  attemptId: string;
  quizId: string;
  submittedAt: string | null;
  summary: ReviewSummary;
  questions: ReviewQuestion[];
}

export interface ReviewSourceQuestion {
  id: string;
  body: string;
  imageUrl: string | null;
  options: string[];
  correctOptions: number[];
  isMultipleChoice: boolean;
}

export interface ReviewSourceResponse {
  questionId: string;
  selectedOptions: number[];
}

export interface ReviewSourceQuiz {
  id: string;
  allowSubmissionReportView: boolean;
  questions: ReviewSourceQuestion[];
}

export interface ReviewSourceAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number | null;
  submittedAt: Date | string | null;
  isCompleted: boolean;
  responses: ReviewSourceResponse[];
}

// ── Authorization ──────────────────────────────────────────────────────

/**
 * Determines whether requesterId may view the submission report for the
 * given attempt. Learners may only see their own completed attempt, and
 * only when the quiz creator has enabled allowSubmissionReportView.
 * Privileged users (course owner/instructor/admin) bypass the toggle.
 */
export function canViewSubmissionReport(params: {
  quiz: Pick<ReviewSourceQuiz, 'allowSubmissionReportView'>;
  attempt: Pick<ReviewSourceAttempt, 'userId' | 'isCompleted'>;
  requesterId: string;
  isPrivileged: boolean;
}): boolean {
  const { quiz, attempt, requesterId, isPrivileged } = params;

  if (isPrivileged) return true;

  if (attempt.userId !== requesterId) return false;
  if (!attempt.isCompleted) return false;

  return quiz.allowSubmissionReportView === true;
}

// ── Payload mapping ────────────────────────────────────────────────────

export function buildReviewPayload(
  quiz: ReviewSourceQuiz,
  attempt: ReviewSourceAttempt
): ReviewPayload {
  let correctCount = 0;

  const questions: ReviewQuestion[] = quiz.questions.map((question, index) => {
    const response = attempt.responses.find((r) => r.questionId === question.id);
    const selectedOptions = response?.selectedOptions ?? [];

    const sortedSelected = [...selectedOptions].sort();
    const sortedCorrect = [...question.correctOptions].sort();
    const isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);

    if (isCorrect) correctCount++;

    const options: ReviewQuestionOption[] = question.options.map((text, optionIndex) => ({
      index: optionIndex,
      text,
      isSelected: selectedOptions.includes(optionIndex),
      isCorrect: question.correctOptions.includes(optionIndex)
    }));

    return {
      id: question.id,
      questionNumber: index + 1,
      body: question.body,
      imageUrl: question.imageUrl,
      isMultipleChoice: question.isMultipleChoice,
      options,
      selectedOptions,
      correctOptions: question.correctOptions,
      isCorrect,
      isAnswered: selectedOptions.length > 0
    };
  });

  const totalQuestions = questions.length;

  return {
    attemptId: attempt.id,
    quizId: quiz.id,
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
    summary: {
      totalQuestions,
      correctCount,
      wrongCount: totalQuestions - correctCount,
      score: attempt.score ?? null
    },
    questions
  };
}

// ── Export helpers ─────────────────────────────────────────────────────

function optionLabel(option: ReviewQuestionOption): string {
  const letter = String.fromCharCode(65 + option.index);
  return `${letter}. ${option.text}`;
}

function selectedAnswerText(question: ReviewQuestion): string {
  const selected = question.options.filter((o) => o.isSelected);
  if (selected.length === 0) return 'Not Answered';
  return selected.map(optionLabel).join('; ');
}

function correctAnswerText(question: ReviewQuestion): string {
  const correct = question.options.filter((o) => o.isCorrect);
  return correct.map(optionLabel).join('; ');
}

const CSV_HEADERS = [
  'Question #',
  'Question',
  'Options',
  'Learner Answer',
  'Correct Answer',
  'Result'
];

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds a UTF-8 (BOM-prefixed for Excel compatibility) CSV string.
 * Plain CSV cannot reliably encode cell colors, so wrong/correct status
 * is only conveyed via the "Result" column here — use the XLSX export
 * for colored highlighting.
 */
export function buildReviewCsv(payload: ReviewPayload): string {
  const rows = [CSV_HEADERS];

  payload.questions.forEach((q) => {
    rows.push([
      String(q.questionNumber),
      q.body,
      q.options.map(optionLabel).join(' | '),
      selectedAnswerText(q),
      correctAnswerText(q),
      q.isCorrect ? 'Correct' : 'Wrong'
    ]);
  });

  const body = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  return `\uFEFF${body}`;
}

const FILL_WRONG: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8D7DA' }
};

const FILL_CORRECT: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD4EDDA' }
};

/**
 * Builds an XLSX workbook with wrong answers highlighted red and correct
 * answers highlighted green, so learners can quickly spot mistakes.
 */
export function buildReviewWorkbook(payload: ReviewPayload): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Submission Report');

  sheet.columns = [
    { header: 'Question #', key: 'number', width: 12 },
    { header: 'Question', key: 'question', width: 50 },
    { header: 'Options', key: 'options', width: 50 },
    { header: 'Learner Answer', key: 'learnerAnswer', width: 30 },
    { header: 'Correct Answer', key: 'correctAnswer', width: 30 },
    { header: 'Result', key: 'result', width: 12 }
  ];
  sheet.getRow(1).font = { bold: true };

  payload.questions.forEach((q) => {
    const row = sheet.addRow({
      number: q.questionNumber,
      question: q.body,
      options: q.options.map(optionLabel).join('\n'),
      learnerAnswer: selectedAnswerText(q),
      correctAnswer: correctAnswerText(q),
      result: q.isCorrect ? 'Correct' : 'Wrong'
    });

    if (!q.isCorrect) {
      row.getCell('learnerAnswer').fill = FILL_WRONG;
      row.getCell('result').fill = FILL_WRONG;
    }
    row.getCell('correctAnswer').fill = FILL_CORRECT;
  });

  return workbook;
}
