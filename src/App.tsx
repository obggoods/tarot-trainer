import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  Lightbulb,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { TarotCardImage } from "./components/TarotCardImage";
import { getRandomTarotQuestion } from "./data/tarotQuestions";
import { evaluateAnswer } from "./lib/ai/evaluateAnswer";
import { loadWrongNotes, saveWrongNote } from "./lib/storage/wrongNotes";
import { getCard, getCardMeaning } from "./lib/tarot/getCard";
import type { CardOrientationMeaning, EvaluationResult, TarotCard, TarotCategory, TarotQuestion, TarotSuit, WrongNote } from "./types/tarot";

const sampleAnswer =
  "이 카드는 지금 상황이 이미 많이 지치고 부담이 누적된 상태임을 보여줍니다. 질문에 대해 무리하게 버티기보다는 현재 한계를 인정하고 회복을 우선하는 편이 좋아 보입니다. 다만 상황을 단정하기보다, 쉬는 동안 무엇을 정리하고 어떤 방식으로 다시 움직일지 현실적인 계획을 함께 세우는 것이 중요합니다.";

const suitAccent: Record<TarotSuit, string> = {
  major: "bg-wine text-white",
  wands: "bg-[#9d4b2f] text-white",
  cups: "bg-[#33658a] text-white",
  swords: "bg-night text-white",
  pentacles: "bg-moss text-white",
};

const categoryLabel: Record<TarotCategory, string> = {
  love: "연애운",
  reunion: "재회",
  crush: "썸",
  career: "직업운",
  business: "사업운",
  money: "금전운",
  health: "건강운",
  relationship: "인간관계",
  family: "가족",
  path: "진로운",
  job_change: "이직",
  exam: "시험",
  general: "종합운",
};

const orientationLabel = {
  upright: "정방향",
  reversed: "역방향",
};

const gradeLabel: Record<EvaluationResult["grade"], string> = {
  correct: "정답",
  partial: "부분 정답",
  incorrect: "보완 필요",
};

const gradeClass: Record<EvaluationResult["grade"], string> = {
  correct: "border-moss/30 bg-moss/10 text-moss",
  partial: "border-[#c8872f]/30 bg-[#c8872f]/10 text-[#8a5a19]",
  incorrect: "border-wine/30 bg-wine/10 text-wine",
};

function App() {
  const [question, setQuestion] = useState<TarotQuestion>(() => getRandomTarotQuestion());
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [viewedAnswer, setViewedAnswer] = useState(false);

  const answerLength = answer.trim().length;
  const canSubmit = useMemo(() => answerLength >= 20 && !isEvaluating, [answerLength, isEvaluating]);
  const card = useMemo(() => getCard(question.card_id), [question.card_id]);
  const meaning = useMemo(() => getCardMeaning(question.card_id, question.orientation), [question.card_id, question.orientation]);

  useEffect(() => {
    setWrongNotes(loadWrongNotes());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluation(null);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      const nextEvaluation = await evaluateAnswer({
        card,
        meaning,
        question,
        userAnswer: answer.trim(),
      });
      const note = saveWrongNote(question, answer.trim(), nextEvaluation, viewedAnswer);
      setEvaluation(nextEvaluation);
      setWrongNotes((notes) => [note, ...notes]);
    } finally {
      setIsEvaluating(false);
    }
  }

  function loadNextQuestion() {
    setQuestion((currentQuestion) => getRandomTarotQuestion(currentQuestion.question_id));
    setAnswer("");
    setEvaluation(null);
    setIsEvaluating(false);
    setHintLevel(0);
    setViewedAnswer(false);
  }

  function showNextHint() {
    setHintLevel((level) => {
      const nextLevel = Math.min(3, level + 1);
      if (nextLevel === 3) {
        setViewedAnswer(true);
      }
      return nextLevel;
    });
  }

  return (
    <main className="min-h-screen bg-parchment text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex shrink-0 flex-col gap-3 border-b border-stone-300/70 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-night text-white">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">Tarot Trainer</h1>
              <p className="text-sm font-medium text-stone-600">Rider-Waite 정통해석 리딩 실습</p>
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full shrink-0 px-3 sm:w-auto sm:px-4" onClick={loadNextQuestion} disabled={isEvaluating}>
            <RefreshCw size={16} />
            다음 문제
          </Button>
        </header>

        <section className="mx-auto grid w-full max-w-5xl flex-1 gap-4 py-4">
          <QuestionPanel question={question} card={card} />
          <AnswerPanel
            answer={answer}
            answerLength={answerLength}
            canSubmit={canSubmit}
            isEvaluating={isEvaluating}
            hintLevel={hintLevel}
            viewedAnswer={viewedAnswer}
            question={question}
            card={card}
            meaning={meaning}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmit}
            onShowHint={showNextHint}
          />
          <ResultPanel evaluation={evaluation} isEvaluating={isEvaluating} onNext={loadNextQuestion} userAnswer={answer} viewedAnswer={viewedAnswer} />
        </section>

        <WrongNotesSection notes={wrongNotes} />
      </div>
    </main>
  );
}

function QuestionPanel({ question, card }: { question: TarotQuestion; card: TarotCard }) {
  const suit: TarotSuit = card.meta.arcana === "major" ? "major" : card.meta.suit ?? "wands";

  return (
    <div className="trainer-top-grid">
      <Card className="trainer-top-question overflow-hidden">
        <section className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-stone-500">{categoryLabel[question.category]}</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-[1.32] text-stone-950 sm:text-3xl">
            {question.question}
          </h2>

          <div className="mt-4 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold text-stone-500">상담자</p>
              <p className="mt-1 font-semibold text-stone-950">{question.persona.age}</p>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-stone-700">
              <p>{question.persona.background}</p>
              <div>
                <p className="font-semibold text-stone-950">고민</p>
                <p className="mt-1">{question.persona.concern}</p>
              </div>
            </div>
          </div>
        </section>
      </Card>

      <Card className={`${suitAccent[suit]} overflow-hidden p-4`}>
        <section className="flex items-center gap-4">
          <TarotCardImage
            cardId={question.card_id}
            alt={card.meta.name_ko}
            size="sm"
            className="trainer-card-image"
            isReversed={question.orientation === "reversed"}
          />
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-xs font-semibold opacity-75">뽑힌 카드</p>
            <h3 className="mt-1 text-2xl font-semibold leading-tight">{card.meta.name_ko}</h3>
            <p className="mt-1 text-sm font-semibold opacity-85">{orientationLabel[question.orientation]}</p>
            <p className="mt-3 text-xs font-semibold opacity-75">리딩 위치</p>
            <p className="mt-1 text-base font-semibold leading-snug">{question.position}</p>
          </div>
        </section>
      </Card>
    </div>
  );
}

function AnswerPanel({
  answer,
  answerLength,
  canSubmit,
  isEvaluating,
  hintLevel,
  viewedAnswer,
  question,
  card,
  meaning,
  onAnswerChange,
  onSubmit,
  onShowHint,
}: {
  answer: string;
  answerLength: number;
  canSubmit: boolean;
  isEvaluating: boolean;
  hintLevel: number;
  viewedAnswer: boolean;
  question: TarotQuestion;
  card: TarotCard;
  meaning: CardOrientationMeaning;
  onAnswerChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onShowHint: () => void;
}) {
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-500">답변 작성</p>
          <h2 className="mt-1 text-xl font-semibold">상담하듯 해석해보세요</h2>
        </div>
        <Button type="button" variant="ghost" onClick={() => onAnswerChange(sampleAnswer)} disabled={isEvaluating}>
          예시 입력
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="secondary" onClick={onShowHint} disabled={isEvaluating || hintLevel >= 3}>
          <Lightbulb size={16} />
          {hintLevel === 0 ? "모르겠어요" : hintLevel === 1 ? "질문 위치 적용 보기" : hintLevel === 2 ? "정통해석 보기" : "정통해석 확인됨"}
        </Button>
        {viewedAnswer ? (
          <span className="w-fit rounded-md border border-[#c8872f]/30 bg-[#c8872f]/10 px-3 py-2 text-sm font-semibold text-[#8a5a19]">
            참고 풀이 확인됨
          </span>
        ) : null}
      </div>

      <HintPanel hintLevel={hintLevel} question={question} card={card} meaning={meaning} />

      <form className="mt-3 flex flex-col" onSubmit={onSubmit}>
        <textarea
          className="trainer-answer-textarea resize-none overflow-y-auto rounded-md border border-stone-300 bg-stone-50/60 p-4 text-base leading-7 outline-none transition placeholder:text-stone-400 focus:border-night focus:ring-4 focus:ring-night/10"
          placeholder="카드의 핵심 의미, 질문 맥락, 상담 표현, 현실적인 조언을 함께 작성해 보세요."
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          disabled={isEvaluating}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">
            {answerLength}자
            <span className={answerLength >= 20 ? "ml-2 text-moss" : "ml-2 text-stone-400"}>20자 이상 입력 시 채점 가능</span>
          </p>
          <Button type="submit" disabled={!canSubmit}>
            {isEvaluating ? <Loader2 className="animate-spin" size={16} /> : <BookOpenCheck size={16} />}
            {isEvaluating ? "채점 중..." : "AI 채점"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function HintPanel({
  hintLevel,
  question,
  card,
  meaning,
}: {
  hintLevel: number;
  question: TarotQuestion;
  card: TarotCard;
  meaning: CardOrientationMeaning;
}) {
  if (hintLevel === 0) return null;

  const contextText = getQuestionContextText(question, card);

  return (
    <section className="mt-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
      <div>
        <p className="text-sm font-semibold text-stone-500">힌트 {hintLevel}/3</p>
        <h3 className="mt-1 font-semibold text-stone-950">
          {hintLevel === 1 ? "핵심 키워드" : hintLevel === 2 ? "질문 위치 적용" : "정통해석"}
        </h3>
      </div>

      {hintLevel >= 1 ? (
        <div className="flex flex-wrap gap-2">
          {(meaning.must_include.length > 0 ? meaning.must_include : meaning.keywords).map((keyword) => (
            <span className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700" key={keyword}>
              {keyword}
            </span>
          ))}
        </div>
      ) : null}

      {hintLevel >= 2 ? (
        <ResultSection title={`${question.position}에서 보기`} tone="plain">
          {contextText || `${card.meta.name_ko}을 ${question.position} 위치에서 보면, 카드의 핵심 의미를 질문 상황에 맞게 적용해 해석해야 합니다.`}
        </ResultSection>
      ) : null}

      {hintLevel >= 3 ? (
        <ResultSection title={`${card.meta.name_ko} ${orientationLabel[question.orientation]} 정통 의미`} tone="plain">
          {meaning.traditional_meaning}
        </ResultSection>
      ) : null}
    </section>
  );
}

function getQuestionContextText(question: TarotQuestion, card: TarotCard) {
  const contexts = card.contexts;
  if (!contexts) return "";

  if (
    question.category === "love" ||
    question.category === "reunion" ||
    question.category === "career" ||
    question.category === "business" ||
    question.category === "money" ||
    question.category === "health"
  ) {
    return contexts[question.category]?.[question.orientation] ?? "";
  }

  return "";
}

function ResultPanel({
  evaluation,
  isEvaluating,
  onNext,
  userAnswer,
  viewedAnswer,
}: {
  evaluation: EvaluationResult | null;
  isEvaluating: boolean;
  onNext: () => void;
  userAnswer: string;
  viewedAnswer: boolean;
}) {
  if (isEvaluating) {
    return (
      <Card className="min-h-[520px] p-5">
        <div className="h-24 animate-pulse rounded-md bg-stone-100" />
        <div className="mt-4 grid gap-3">
          <div className="h-32 animate-pulse rounded-md bg-stone-100" />
          <div className="h-32 animate-pulse rounded-md bg-stone-100" />
          <div className="h-48 animate-pulse rounded-md bg-stone-100" />
        </div>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card className="flex min-h-[360px] items-center justify-center p-6 text-center">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-night text-white">
            <Star size={20} />
          </div>
          <p className="mt-4 text-xl font-semibold">AI 피드백이 여기에 표시됩니다</p>
          <p className="mt-2 max-w-sm leading-7 text-stone-600">답변을 제출하면 잘한 점, 보완할 점, 정통 해설, 상담 예시가 이어서 표시됩니다.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-500">AI 피드백</p>
            <h2 className="mt-2 text-2xl font-semibold text-night">리딩 해설</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">점수보다 해석 내용을 먼저 확인해보세요</p>
            {viewedAnswer ? (
              <span className="mt-3 inline-flex rounded-md border border-[#c8872f]/30 bg-[#c8872f]/10 px-3 py-2 text-sm font-semibold text-[#8a5a19]">
                해답 확인 후 작성
              </span>
            ) : null}
          </div>
          <div className="grid gap-2 sm:justify-items-end">
            <span className="flex w-fit items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-600">
              <Save size={15} />
              localStorage 저장됨
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <FeedbackList title="잘한 점" items={evaluation.strengths} tone="good" />
        <FeedbackList title="보완하면 좋은 점" items={evaluation.differences} tone="warn" emptyText="큰 보완점이 없습니다." />

        <ResultSection title="정통 해설" tone="plain">
          {evaluation.traditional_correction}
        </ResultSection>
        <ResultSection title="상담 예시" tone="plain">
          {evaluation.sample_answer}
        </ResultSection>
        <ResultSection title="모범 답안 예시" tone="good">
          {evaluation.model_answer}
        </ResultSection>
        <details className="rounded-md border border-night/15 bg-night/5 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-night">채점 요약 보기</summary>
          <div className="mt-4 grid gap-4">
            <RubricGrid rubric={evaluation.rubric} />
            <ScoreSummary evaluation={evaluation} />
            <ResultSection title="내 답변" tone="plain">
              {userAnswer}
            </ResultSection>
            <ResultSection title="오답노트" tone="good">
              {evaluation.wrong_note}
            </ResultSection>
          </div>
        </details>

        <Button type="button" onClick={onNext}>
          다음 문제
        </Button>
      </div>
    </Card>
  );
}

function ScoreSummary({ evaluation }: { evaluation: EvaluationResult }) {
  return (
    <section className="rounded-md border border-night/15 bg-night/5 p-4">
      <p className="text-sm font-semibold text-stone-500">최종 점수</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-4xl font-semibold text-night">{evaluation.score}점</span>
          <p className="mt-1 text-[#c8872f]">{renderStars(Math.round(evaluation.score / 20))}</p>
        </div>
        <span className={`w-fit rounded-md border px-3 py-2 text-sm font-semibold ${gradeClass[evaluation.grade]}`}>{gradeLabel[evaluation.grade]}</span>
      </div>
    </section>
  );
}

function RubricGrid({ rubric }: { rubric: EvaluationResult["rubric"] }) {
  const rows = [
    ["질문 적용", rubric.questionApplication],
    ["정통 의미", rubric.traditionalMeaning],
    ["현실 적용", rubric.practicalApplication],
    ["상담 표현", rubric.counselingExpression],
    ["단정 표현", rubric.certaintyControl],
  ] as const;

  return (
    <section className="grid gap-2">
      {rows.map(([label, value]) => (
        <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3" key={label}>
          <span className="text-sm font-semibold text-stone-700">{label}</span>
          <span className="text-[#c8872f]">{renderStars(value)}</span>
        </div>
      ))}
    </section>
  );
}

function ResultSection({
  title,
  children,
  tone,
}: {
  title: string;
  children: string;
  tone: "good" | "plain";
}) {
  const className = tone === "good" ? "border-moss/30 bg-moss/10" : "border-stone-200 bg-stone-50";

  return (
    <section className={`rounded-md border p-4 ${className}`}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap leading-8 text-stone-700">{children}</p>
    </section>
  );
}

function FeedbackList({
  title,
  items,
  tone,
  emptyText = "표시할 항목이 없습니다.",
}: {
  title: string;
  items: string[];
  tone: "good" | "warn" | "plain";
  emptyText?: string;
}) {
  const toneClass = {
    good: "border-moss/30 bg-moss/10",
    warn: "border-[#c8872f]/30 bg-[#c8872f]/10",
    plain: "border-stone-200 bg-stone-50",
  }[tone];

  return (
    <section className={`rounded-md border p-4 ${toneClass}`}>
      <h3 className="font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stone-500">{emptyText}</p>
      )}
    </section>
  );
}

function WrongNotesSection({ notes }: { notes: WrongNote[] }) {
  return (
    <details className="mb-6 rounded-md border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-stone-500">오답노트</p>
          <h2 className="mt-1 text-xl font-semibold">저장된 리딩 기록 {notes.length}개</h2>
        </div>
        <ChevronDown size={20} />
      </summary>

      <div className="grid gap-3 border-t border-stone-200 p-4">
        {notes.length === 0 ? (
          <p className="rounded-md bg-stone-50 p-4 text-sm leading-6 text-stone-500">아직 저장된 오답노트가 없습니다. 답변을 채점하면 자동으로 여기에 쌓입니다.</p>
        ) : (
          notes.map((note) => <WrongNoteCard key={note.id} note={note} />)
        )}
      </div>
    </details>
  );
}

function WrongNoteCard({ note }: { note: WrongNote }) {
  return (
    <article className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-stone-500">{formatDate(note.created_at)}</p>
          <h3 className="mt-1 text-lg font-semibold text-stone-950">
            {note.card_name_ko} <span className="text-sm font-medium text-stone-500">({orientationLabel[note.orientation] ?? note.orientation})</span>
          </h3>
        </div>
        <span className={`w-fit rounded-md border px-3 py-1.5 text-sm font-semibold ${gradeClass[note.evaluation.grade]}`}>
          {note.evaluation.score}점 · {gradeLabel[note.evaluation.grade]}
        </span>
      </div>
      {note.viewedAnswer ? (
        <span className="mt-3 inline-flex rounded-md border border-[#c8872f]/30 bg-[#c8872f]/10 px-3 py-1.5 text-sm font-semibold text-[#8a5a19]">
          참고 풀이 확인됨
        </span>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm leading-6 text-stone-700">
        <div>
          <dt className="font-semibold text-stone-950">질문</dt>
          <dd className="mt-1">{note.question}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-950">사용자 답변</dt>
          <dd className="mt-1 whitespace-pre-wrap">{note.user_answer}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-950">오답노트</dt>
          <dd className="mt-1 whitespace-pre-wrap">{note.evaluation.wrong_note}</dd>
        </div>
      </dl>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderStars(value: number) {
  return `${"★".repeat(value)}${"☆".repeat(Math.max(0, 5 - value))}`;
}

export default App;
