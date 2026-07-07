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
import { sanitizeInlineText, sanitizeList, sanitizeText } from "./lib/ai/evaluationSanitizer";
import { loadWrongNotes, saveWrongNote } from "./lib/storage/wrongNotes";
import { resolveConceptGraph, type ConceptGraphResolution } from "./lib/tarot/conceptGraphResolver";
import { getCard, getCardMeaning } from "./lib/tarot/getCard";
import { composeHintInterpretation, composePositionHint, composeReflectionQuestions, composeTraditionalHint } from "./lib/tarot/hintComposer";
import { getTrainingHint } from "./lib/tarot/trainingHints";
import type {
  CardOrientationMeaning,
  EvaluationResult,
  TarotCard,
  TarotCategory,
  TarotQuestion,
  TarotSuit,
  WrongNote,
} from "./types/tarot";

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
  correct: "잘 읽음",
  partial: "흐름 확인",
  incorrect: "보완 필요",
};

const gradeClass: Record<EvaluationResult["grade"], string> = {
  correct: "border-moss/30 bg-moss/10 text-moss",
  partial: "border-[#c8872f]/30 bg-[#c8872f]/10 text-[#8a5a19]",
  incorrect: "border-wine/30 bg-wine/10 text-wine",
};

const debugSampleCases: Array<{ label: string; question: TarotQuestion }> = [
  {
    label: "마법사 역방향 / 재회 장애물",
    question: {
      question_id: "debug_magician_reversed_reunion_obstacle",
      card_id: "major_01_magician",
      orientation: "reversed",
      spread: "재회",
      position: "재회를 어렵게 만드는 흐름",
      difficulty: "beginner",
      category: "reunion",
      question: "현재 두 사람 사이에서 재회를 어렵게 만드는 가장 큰 흐름은 무엇일까요?",
      persona: {
        age: "30대 여성",
        background: "반년 전 헤어진 연인과 최근 다시 연락이 닿았습니다. 상대는 안부를 묻지만 과거 갈등이나 앞으로의 관계에 대해서는 말을 피하고 있습니다.",
        concern: "상대가 단순히 안부를 묻는 것인지, 다시 만날 가능성이 남아 있는지 흐름을 알고 싶어합니다.",
      },
    },
  },
  {
    label: "소드 7 정방향 / 파트너십 조건",
    question: {
      question_id: "debug_swords_07_upright_business_partner",
      card_id: "swords_07",
      orientation: "upright",
      spread: "사업운",
      position: "파트너십에서 확인할 조건",
      difficulty: "beginner",
      category: "business",
      question: "이 파트너십에서 반드시 확인해야 할 조건은 무엇일까요?",
      persona: {
        age: "30대 남성",
        background: "지인이 공동 사업을 제안했지만 투자금, 역할 분담, 수익 배분 조건이 아직 명확하지 않습니다. 상대는 빠르게 시작하자고 하지만 계약서는 아직 없습니다.",
        concern: "상대의 의욕보다 실제로 어떤 조건을 확인해야 안전한지 알고 싶어합니다.",
      },
    },
  },
  {
    label: "펜타클 페이지 역방향 / 사업 확장 위험",
    question: {
      question_id: "debug_pentacles_page_reversed_business_expansion",
      card_id: "pentacles_page",
      orientation: "reversed",
      spread: "사업운",
      position: "사업 확장에서 위험한 부분",
      difficulty: "beginner",
      category: "business",
      question: "지금 사업 확장에서 가장 위험하게 작용할 수 있는 부분은 무엇일까요?",
      persona: {
        age: "50대 여성",
        background: "작은 매장을 운영 중이며 최근 새로운 상품 라인을 준비하고 있습니다. 기존 재고도 아직 남아 있고, 직원 한 명을 더 뽑아야 할지 고민하고 있습니다.",
        concern: "확장 자체보다 어떤 부분이 무리로 이어질 수 있는지, 현재 운영에서 먼저 안정시킬 것이 무엇인지 알고 싶어합니다.",
      },
    },
  },
];

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
  const currentGraphPayload = useMemo(
    () =>
      resolveConceptGraph({
        cardId: question.card_id,
        orientation: question.orientation,
        category: question.category,
        position: question.position,
      }),
    [question.card_id, question.category, question.orientation, question.position],
  );

  useEffect(() => {
    setWrongNotes(loadWrongNotes());
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.debug("[TarotTrainer Graph Resolver]", {
      card_id: question.card_id,
      orientation: question.orientation,
      category: question.category,
      position: question.position,
      graph_resolver_payload: currentGraphPayload,
    });
  }, [currentGraphPayload, question.card_id, question.category, question.orientation, question.position]);

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
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col">
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
          <ResultPanel
            evaluation={evaluation}
            isEvaluating={isEvaluating}
            onNext={loadNextQuestion}
            question={question}
            userAnswer={answer}
            viewedAnswer={viewedAnswer}
          />
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
            <span className={answerLength >= 20 ? "ml-2 text-moss" : "ml-2 text-stone-400"}>20자 이상 입력 시 피드백 가능</span>
          </p>
          <Button type="submit" disabled={!canSubmit}>
            {isEvaluating ? <Loader2 className="animate-spin" size={16} /> : <BookOpenCheck size={16} />}
            {isEvaluating ? "피드백 생성 중..." : "AI 피드백"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DebugPanel({
  graphPayload,
  onLoadCase,
  onLogSnapshot,
  isEvaluating,
}: {
  graphPayload: ConceptGraphResolution;
  onLoadCase: (question: TarotQuestion) => void;
  onLogSnapshot: () => void;
  isEvaluating: boolean;
}) {
  return (
    <Card className="border-[#c8872f]/30 bg-[#c8872f]/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#8a5a19]">Development diagnostics</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-950">샘플 힌트/분석/피드백 검수</h2>
        </div>
        <Button type="button" onClick={onLogSnapshot} disabled={isEvaluating}>
          <Sparkles size={16} />
          Log diagnostics
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {debugSampleCases.map((debugCase) => (
          <Button type="button" variant="secondary" onClick={() => onLoadCase(debugCase.question)} disabled={isEvaluating} key={debugCase.label}>
            {debugCase.label}
          </Button>
        ))}
      </div>
      <details className="mt-3 rounded-md border border-[#c8872f]/30 bg-white/70 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#8a5a19]">Resolver diagnostics</summary>
        <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-stone-950 p-3 text-xs leading-5 text-stone-50">
          {JSON.stringify(graphPayload, null, 2)}
        </pre>
      </details>
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

  const trainingHint = getTrainingHint(question, meaning);
  const graphPayload = resolveConceptGraph({
    cardId: question.card_id,
    orientation: question.orientation,
    category: question.category,
    position: question.position,
  });
  const contextText = getQuestionContextText(question, card);
  const hintKeywords = trainingHint?.hint_keywords ?? (meaning.must_include.length > 0 ? meaning.must_include : meaning.keywords);
  const hintInterpretation = composeHintInterpretation({ question, card, meaning });
  const positionHintBody = composePositionHint({ question, card, meaning }) || trainingHint?.hint_body || contextText;
  const traditionalHintBody = composeTraditionalHint({ question, card, meaning });
  const reflectionQuestions = composeReflectionQuestions({ question, card, meaning });

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
          {hintKeywords.map((keyword) => (
            <span className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700" key={keyword}>
              {keyword}
            </span>
          ))}
        </div>
      ) : null}

      {hintLevel >= 2 ? (
        <ResultSection title={trainingHint?.hint_title ?? `${question.position}에서 보기`} tone="plain">
          {trainingHint?.answer_seed ? `${positionHintBody}\n\n답변에 바로 쓸 표현: ${trainingHint.answer_seed}` : positionHintBody}
        </ResultSection>
      ) : null}

      {hintLevel >= 3 ? (
        <ResultSection title={`${card.meta.name_ko} ${orientationLabel[question.orientation]} 정통 의미`} tone="plain">
          {traditionalHintBody}
        </ResultSection>
      ) : null}

      {hintLevel >= 2 ? <GraphLearningSection graph={graphPayload} interpretationGraph={hintInterpretation} defaultOpen={hintLevel >= 3} /> : null}

      {hintLevel >= 3 ? (
        <ResultSection title="왜 이렇게 읽는가?" tone="plain">
          {hintInterpretation.reasoning_bridge}
        </ResultSection>
      ) : null}

      {hintLevel >= 3 ? <ReflectionQuestionsSection questions={reflectionQuestions} /> : null}
    </section>
  );
}

function ReflectionQuestionsSection({ questions }: { questions: string[] }) {
  const safeQuestions = sanitizeList(questions).slice(0, 3);
  if (safeQuestions.length === 0) return null;

  return (
    <section className="rounded-md border border-[#c8872f]/30 bg-[#c8872f]/10 p-4">
      <h3 className="font-semibold text-stone-950">💭 생각해보기</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">잠깐 정답을 보기 전에 스스로 생각해보세요.</p>
      <ol className="mt-3 grid gap-3 text-sm leading-7 text-stone-700">
        {safeQuestions.map((question, index) => (
          <li className="rounded-md border border-[#c8872f]/20 bg-white/70 p-3" key={question}>
            <span className="mr-2 font-semibold text-[#8a5a19]">{["①", "②", "③"][index]}</span>
            {question}
          </li>
        ))}
      </ol>
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

function GraphLearningSection({
  graph,
  interpretationGraph,
  defaultOpen = false,
}: {
  graph: ConceptGraphResolution;
  interpretationGraph?: EvaluationResult["interpretation_graph"];
  defaultOpen?: boolean;
}) {
  const primaryConcepts = graph.primaryConcepts.map((concept) => concept.name_ko);
  const secondaryConcepts = graph.secondaryConcepts.map((concept) => concept.name_ko);
  const conceptLabels = [...primaryConcepts, ...secondaryConcepts.slice(0, 3)];
  const flow = graph.reasoningPath.slice(0, 6);
  const checks = graph.recommendedChecks.slice(0, 5);
  const actions = graph.recommendedActions.slice(0, 4);

  if (interpretationGraph) {
    return (
      <details className="rounded-md border border-night/15 bg-white/80 p-4" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-500">Graph 학습</p>
            <h3 className="mt-1 font-semibold text-night">해석 사고 흐름</h3>
          </div>
          <ChevronDown className="shrink-0 text-stone-500" size={18} />
        </summary>

        <div className="mt-4 grid gap-2 text-sm leading-6 text-stone-700">
          <GraphFlowStep index={1} label="카드" value={`${interpretationGraph.card} ${orientationLabel[interpretationGraph.orientation]}`} />
          <GraphFlowStep index={2} label="정통 의미" value={interpretationGraph.traditional_meanings.join(" / ")} />
          <GraphFlowStep index={3} label="질문 초점" value={interpretationGraph.question_focus} />
          <GraphFlowStep index={4} label="선택 의미" value={interpretationGraph.selected_meanings.join(" / ")} />
          <GraphFlowStep index={5} label="상담 문장" value={interpretationGraph.counseling_sentence} isLast />
        </div>
      </details>
    );
  }

  return (
    <details className="rounded-md border border-night/15 bg-white/80 p-4" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-500">Graph 학습</p>
          <h3 className="mt-1 font-semibold text-night">해석 흐름</h3>
        </div>
        <ChevronDown className="shrink-0 text-stone-500" size={18} />
      </summary>

      <div className="mt-4 grid gap-4">
        <section>
          <h4 className="text-sm font-semibold text-stone-950">핵심 개념</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {conceptLabels.length > 0 ? (
              conceptLabels.map((concept) => (
                <span className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-700" key={concept}>
                  {concept}
                </span>
              ))
            ) : (
              <span className="text-sm text-stone-500">선택된 개념이 없습니다.</span>
            )}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-stone-950">해석 흐름</h4>
          <ol className="mt-2 grid gap-2 text-sm leading-6 text-stone-700 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
            {flow.length > 0 ? (
              flow.map((step, index) => (
                <li className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2" key={`${step}-${index}`}>
                  <span className="mr-2 font-semibold text-night">{index + 1}</span>
                  {step}
                </li>
              ))
            ) : (
              <li className="text-stone-500">해석 흐름이 없습니다.</li>
            )}
          </ol>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-stone-950">확인할 것</h4>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-stone-700">
            {checks.length > 0 ? checks.map((check) => <li key={check}>- {check}</li>) : <li className="text-stone-500">확인 항목이 없습니다.</li>}
          </ul>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-stone-950">다음 답변에 넣을 표현</h4>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-stone-700">
            {actions.length > 0 ? actions.map((action) => <li key={action}>- {action}</li>) : <li className="text-stone-500">추천 표현이 없습니다.</li>}
          </ul>
        </section>
      </div>
    </details>
  );
}

function GraphFlowStep({ index, label, value, isLast = false }: { index: number; label: string; value: string; isLast?: boolean }) {
  const safeValue = sanitizeInlineText(value);
  if (!safeValue) return null;

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 rounded-md border border-night/10 bg-stone-50 p-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-night text-xs font-semibold text-white">{index}</span>
          <span className="font-semibold text-night">{label}</span>
        </div>
        <span>{safeValue}</span>
      </div>
      {!isLast ? <div className="pl-3 text-lg leading-none text-stone-400">↓</div> : null}
    </div>
  );
}

function ResultPanel({
  evaluation,
  isEvaluating,
  onNext,
  question,
  userAnswer,
  viewedAnswer,
}: {
  evaluation: EvaluationResult | null;
  isEvaluating: boolean;
  onNext: () => void;
  question: TarotQuestion;
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
          <p className="mt-2 max-w-sm leading-7 text-stone-600">답변을 제출하면 해석 흐름, 현실 적용, 모범 답안이 이어서 표시됩니다.</p>
        </div>
      </Card>
    );
  }

  const graphPayload = resolveConceptGraph({
    cardId: question.card_id,
    orientation: question.orientation,
    category: question.category,
    position: question.position,
  });

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
        <GraphLearningSection graph={graphPayload} interpretationGraph={evaluation.interpretation_graph} defaultOpen />

        <ResultSection title="왜 이렇게 읽는가?" tone="plain">
          {evaluation.interpretation_graph.reasoning_bridge}
        </ResultSection>

        <ResultSection title="현실 적용" tone="plain">
          {evaluation.sample_answer}
        </ResultSection>
        <FeedbackList title="잘한 점" items={evaluation.strengths} tone="good" />
        <FeedbackList title="보완하면 좋은 점" items={evaluation.differences} tone="warn" emptyText="큰 보완점이 없습니다." />
        <ResultSection title="모범 답안" tone="good">
          {evaluation.model_answer}
        </ResultSection>
        <ResultSection title="사고과정 피드백" tone="good">
          {evaluation.wrong_note}
        </ResultSection>
        <details className="rounded-md border border-night/15 bg-night/5 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-night">학습 진단 요약 보기</summary>
          <div className="mt-4 grid gap-4">
            <RubricGrid rubric={evaluation.rubric} />
            <ScoreSummary evaluation={evaluation} />
            <ResultSection title="내 답변" tone="plain">
              {userAnswer}
            </ResultSection>
          </div>
        </details>

        <FeedbackList title="핵심 놓친 포인트" items={evaluation.missed_key_points} tone="plain" emptyText="비교할 핵심 포인트가 없습니다." />

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
      <p className="text-sm font-semibold text-stone-500">학습 점수</p>
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
  const safeChildren = sanitizeText(children);
  if (!safeChildren) return null;

  const className = tone === "good" ? "border-moss/30 bg-moss/10" : "border-stone-200 bg-stone-50";

  return (
    <section className={`rounded-md border p-4 ${className}`}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap leading-8 text-stone-700">{safeChildren}</p>
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
  const safeItems = sanitizeList(items);
  const toneClass = {
    good: "border-moss/30 bg-moss/10",
    warn: "border-[#c8872f]/30 bg-[#c8872f]/10",
    plain: "border-stone-200 bg-stone-50",
  }[tone];

  return (
    <section className={`rounded-md border p-4 ${toneClass}`}>
      <h3 className="font-semibold">{title}</h3>
      {safeItems.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {safeItems.map((item) => (
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
          <dd className="mt-1 whitespace-pre-wrap">{sanitizeText(note.evaluation.wrong_note)}</dd>
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
