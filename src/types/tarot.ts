export type Orientation = "upright" | "reversed";

export type TarotCategory =
  | "love"
  | "reunion"
  | "crush"
  | "career"
  | "business"
  | "money"
  | "health"
  | "relationship"
  | "family"
  | "path"
  | "job_change"
  | "exam"
  | "general";

export type TarotDifficulty = "beginner" | "intermediate" | "advanced" | "practice";

export type ConsultationPersona = {
  age: string;
  background: string;
  concern: string;
};

export type ConsultationQuestion = {
  question_id: string;
  spread: string;
  position: string;
  difficulty: TarotDifficulty;
  category: TarotCategory;
  question: string;
  persona: ConsultationPersona;
};

export type TarotSuit = "major" | "wands" | "cups" | "swords" | "pentacles";

export type CardOrientationMeaning = {
  keywords: string[];
  traditional_meaning: string;
  symbolism?: string[];
  positive_aspect: string;
  warning: string;
  must_include: string[];
  common_mistakes: string[];
  /** Legacy/internal compatibility field. The compact feedback UI uses Graph learning + reality application instead. */
  traditional_correction: string;
  sample_answer: string;
  wrong_note: string;
  /** Legacy fallback only. New cards should prefer Concept Graph map/rules. */
  question_contexts?: TarotQuestionContexts;
  /** Legacy fallback only. New cards should prefer Concept Graph map/rules. */
  training_hints?: TarotTrainingHints;
};

export type TarotTrainingHint = {
  hint_keywords: string[];
  hint_title: string;
  hint_body: string;
  answer_seed?: string;
};

export type TarotTrainingHints = Record<string, Record<string, TarotTrainingHint>>;

export type TarotQuestionContextV2 = {
  selected_meaning: string;
  real_world_issues: string[];
  concrete_checks: string[];
  bad_readings: string[];
  model_logic: string;
};

export type TarotQuestionContexts = Record<string, Record<string, TarotQuestionContextV2>>;

export type CardMeaning = {
  card_id: string;
  upright: CardOrientationMeaning;
  reversed?: Partial<CardOrientationMeaning>;
};

export type TkbOrientationMeaning = Omit<CardOrientationMeaning, "traditional_correction" | "sample_answer" | "wrong_note"> &
  Partial<Pick<CardOrientationMeaning, "traditional_correction" | "sample_answer" | "wrong_note">>;

export type TarotMeaningContext = {
  upright: string;
  reversed: string;
};

export type TarotMeaningContexts = {
  love: TarotMeaningContext;
  reunion: TarotMeaningContext;
  career: TarotMeaningContext;
  business: TarotMeaningContext;
  money: TarotMeaningContext;
  health: TarotMeaningContext;
  relationship: TarotMeaningContext;
  advice: TarotMeaningContext;
  daily: TarotMeaningContext;
};

export type TarotKnowledgeBaseEntry = {
  card_id: string;
  name_ko: string;
  name_en: string;
  arcana?: TarotArcana;
  number?: number;
  suit?: TarotManifestSuit;
  rank?: string;
  meanings: {
    upright: TkbOrientationMeaning;
    reversed: TkbOrientationMeaning;
  };
  contexts: TarotMeaningContexts;
};

export type RawMeaningEntry = CardMeaning | TarotKnowledgeBaseEntry;

export type TarotQuestion = {
  question_id: string;
  card_id: string;
  orientation: Orientation;
  spread: string;
  position: string;
  difficulty: TarotDifficulty;
  category: TarotCategory;
  question: string;
  persona: ConsultationPersona;
};

export type EvaluationResult = {
  score: number;
  grade: "correct" | "partial" | "incorrect";
  rubric: {
    traditionalMeaning: number;
    questionApplication: number;
    counselingExpression: number;
    practicalApplication: number;
    certaintyControl: number;
  };
  interpretation_graph: {
    card: string;
    orientation: Orientation;
    traditional_meanings: string[];
    question_focus: string;
    selected_meanings: string[];
    rejected_meanings: {
      meaning: string;
      reason: string;
    }[];
    reasoning_bridge: string;
    counseling_sentence: string;
  };
  strengths: string[];
  missing_points: string[];
  traditional_correction: string;
  sample_answer: string;
  model_answer: string;
  missed_key_points: string[];
  differences: string[];
  wrong_note: string;
  next_reading_tip: string;
  promptVersion: string;
};

export type WrongNote = {
  id: string;
  created_at: string;
  card_id: string;
  card_name_ko: string;
  orientation: Orientation;
  category: TarotCategory;
  question: string;
  user_answer: string;
  evaluation: EvaluationResult;
  viewedAnswer?: boolean;
};

export type RandomProblemResponse = {
  ok: true;
  problem: TarotQuestion;
};

export type TarotArcana = "major" | "minor";
export type TarotManifestSuit = "wands" | "cups" | "swords" | "pentacles";

export type TarotImagePath = `/cards/${"original" | "optimized"}/${string}`;

export type TarotCardMeta = {
  card_id: string;
  name_ko: string;
  name_en: string;
  arcana: TarotArcana;
  image: TarotImagePath;
  original_image?: TarotImagePath;
  suit?: TarotManifestSuit;
  number?: number;
};

export type TarotManifest = Record<string, TarotCardMeta>;

export type TarotCard = {
  meta: TarotCardMeta;
  meaning: CardMeaning;
  contexts?: TarotMeaningContexts;
};
