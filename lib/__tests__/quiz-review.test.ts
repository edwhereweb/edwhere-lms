import {
  buildReviewCsv,
  buildReviewPayload,
  buildReviewWorkbook,
  canViewSubmissionReport,
  ReviewSourceAttempt,
  ReviewSourceQuiz
} from '@/lib/quiz-review';

const quiz: ReviewSourceQuiz = {
  id: 'quiz-1',
  allowSubmissionReportView: false,
  questions: [
    {
      id: 'q1',
      body: 'What is 2 + 2?',
      imageUrl: null,
      options: ['3', '4', '5'],
      correctOptions: [1],
      isMultipleChoice: false
    },
    {
      id: 'q2',
      body: 'Select all prime numbers',
      imageUrl: null,
      options: ['2', '3', '4'],
      correctOptions: [0, 1],
      isMultipleChoice: true
    }
  ]
};

const attempt: ReviewSourceAttempt = {
  id: 'attempt-1',
  userId: 'user-1',
  quizId: 'quiz-1',
  score: 50,
  submittedAt: '2024-01-01T00:00:00.000Z',
  isCompleted: true,
  responses: [
    { questionId: 'q1', selectedOptions: [0] }, // wrong (correct is 1)
    { questionId: 'q2', selectedOptions: [0, 1] } // correct
  ]
};

describe('quiz Model default', () => {
  it('allowSubmissionReportView defaults to false when not explicitly set on the quiz', () => {
    expect(quiz.allowSubmissionReportView).toBe(false);
  });
});

describe('canViewSubmissionReport', () => {
  it('blocks the learner when the toggle is disabled', () => {
    const allowed = canViewSubmissionReport({
      quiz: { allowSubmissionReportView: false },
      attempt: { userId: 'user-1', isCompleted: true },
      requesterId: 'user-1',
      isPrivileged: false
    });
    expect(allowed).toBe(false);
  });

  it('allows the learner when the toggle is enabled and it is their own completed attempt', () => {
    const allowed = canViewSubmissionReport({
      quiz: { allowSubmissionReportView: true },
      attempt: { userId: 'user-1', isCompleted: true },
      requesterId: 'user-1',
      isPrivileged: false
    });
    expect(allowed).toBe(true);
  });

  it("blocks the learner from viewing another learner's attempt even when enabled", () => {
    const allowed = canViewSubmissionReport({
      quiz: { allowSubmissionReportView: true },
      attempt: { userId: 'user-1', isCompleted: true },
      requesterId: 'user-2',
      isPrivileged: false
    });
    expect(allowed).toBe(false);
  });

  it('blocks the learner from viewing an in-progress attempt even when enabled', () => {
    const allowed = canViewSubmissionReport({
      quiz: { allowSubmissionReportView: true },
      attempt: { userId: 'user-1', isCompleted: false },
      requesterId: 'user-1',
      isPrivileged: false
    });
    expect(allowed).toBe(false);
  });

  it('always allows privileged users (creator/instructor/admin) regardless of the toggle', () => {
    const allowed = canViewSubmissionReport({
      quiz: { allowSubmissionReportView: false },
      attempt: { userId: 'user-1', isCompleted: true },
      requesterId: 'creator-1',
      isPrivileged: true
    });
    expect(allowed).toBe(true);
  });
});

describe('buildReviewPayload', () => {
  it('maps questions with selected/correct options and per-question correctness', () => {
    const payload = buildReviewPayload(quiz, attempt);

    expect(payload.attemptId).toBe('attempt-1');
    expect(payload.summary).toEqual({
      totalQuestions: 2,
      correctCount: 1,
      wrongCount: 1,
      score: 50
    });

    const [q1, q2] = payload.questions;

    expect(q1.isCorrect).toBe(false);
    expect(q1.options[0]).toMatchObject({ index: 0, isSelected: true, isCorrect: false });
    expect(q1.options[1]).toMatchObject({ index: 1, isSelected: false, isCorrect: true });

    expect(q2.isCorrect).toBe(true);
    expect(q2.options[0]).toMatchObject({ isSelected: true, isCorrect: true });
    expect(q2.options[1]).toMatchObject({ isSelected: true, isCorrect: true });
    expect(q2.options[2]).toMatchObject({ isSelected: false, isCorrect: false });
  });

  it('marks an unanswered question as not answered and wrong', () => {
    const unansweredAttempt: ReviewSourceAttempt = {
      ...attempt,
      responses: [{ questionId: 'q2', selectedOptions: [0, 1] }]
    };
    const payload = buildReviewPayload(quiz, unansweredAttempt);
    const q1 = payload.questions[0];

    expect(q1.isAnswered).toBe(false);
    expect(q1.isCorrect).toBe(false);
  });
});

describe('buildReviewCsv', () => {
  it('produces a UTF-8 BOM-prefixed CSV with a header row and one row per question', () => {
    const payload = buildReviewPayload(quiz, attempt);
    const csv = buildReviewCsv(payload);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.replace('\uFEFF', '').split('\n');
    expect(lines).toHaveLength(3); // header + 2 questions
    expect(lines[0]).toBe('Question #,Question,Options,Learner Answer,Correct Answer,Result');
    expect(lines[1]).toContain('Wrong');
    expect(lines[2]).toContain('Correct');
  });

  it('escapes values containing commas or quotes', () => {
    const quizWithComma: ReviewSourceQuiz = {
      ...quiz,
      questions: [
        {
          id: 'q1',
          body: 'Is this, a "tricky" question?',
          imageUrl: null,
          options: ['Yes', 'No'],
          correctOptions: [0],
          isMultipleChoice: false
        }
      ]
    };
    const attemptForComma: ReviewSourceAttempt = {
      ...attempt,
      responses: [{ questionId: 'q1', selectedOptions: [0] }]
    };
    const csv = buildReviewCsv(buildReviewPayload(quizWithComma, attemptForComma));
    expect(csv).toContain('"Is this, a ""tricky"" question?"');
  });
});

describe('buildReviewWorkbook', () => {
  it('creates a worksheet with one header row plus one row per question, highlighting wrong/correct cells', () => {
    const payload = buildReviewPayload(quiz, attempt);
    const workbook = buildReviewWorkbook(payload);
    const sheet = workbook.getWorksheet('Submission Report');

    expect(sheet).toBeDefined();
    expect(sheet!.rowCount).toBe(3); // header + 2 questions

    const wrongRow = sheet!.getRow(2); // q1 is wrong
    expect(wrongRow.getCell('result').value).toBe('Wrong');
    expect(wrongRow.getCell('result').fill).toMatchObject({
      fgColor: { argb: 'FFF8D7DA' }
    });
    expect(wrongRow.getCell('correctAnswer').fill).toMatchObject({
      fgColor: { argb: 'FFD4EDDA' }
    });

    const correctRow = sheet!.getRow(3); // q2 is correct
    expect(correctRow.getCell('result').value).toBe('Correct');
    expect(correctRow.getCell('learnerAnswer').fill).toBeUndefined();
  });
});
