import tarotConcepts from "../../data/tarot/concepts/tarotConcepts.json";
import cardConceptMap from "../../data/tarot/concepts/cardConceptMap.json";
import questionConceptRules from "../../data/tarot/concepts/questionConceptRules.json";
import type { Orientation, TarotCategory } from "../../types/tarot";

export type TarotConcept = {
  id: string;
  name_ko: string;
  aliases: string[];
  definition: string;
  real_world_issues: string[];
  concrete_checks: string[];
  bad_readings: string[];
  difficulty?: number;
};

export type ResolvedConcept = {
  id: string;
  name_ko: string;
};

export type ConceptResolution = {
  selectedConcepts: ResolvedConcept[];
  reasoningPath: string[];
  realWorldIssues: string[];
  concreteChecks: string[];
};

type CardConceptMap = Record<string, Record<Orientation, string[]>>;
type QuestionConceptRules = Record<string, Record<string, { preferred: string[] }>>;

const conceptList = tarotConcepts as TarotConcept[];
const conceptsById = new Map(conceptList.map((concept) => [concept.id, concept]));
const mapByCard = cardConceptMap as CardConceptMap;
const rules = questionConceptRules as QuestionConceptRules;

export function resolveConcepts({
  cardId,
  orientation,
  category,
  position,
}: {
  cardId: string;
  orientation: Orientation;
  category: TarotCategory | string;
  position: string;
}): ConceptResolution {
  const cardConceptIds = mapByCard[cardId]?.[orientation] ?? [];
  const preferredIds = rules[category]?.[position]?.preferred ?? [];
  const selectedIds = unique([...preferredIds.filter((id) => cardConceptIds.includes(id)), ...cardConceptIds]).slice(0, 2);
  const selectedConcepts = selectedIds.map((id) => conceptsById.get(id)).filter(isConcept);

  return {
    selectedConcepts: selectedConcepts.map(({ id, name_ko }) => ({ id, name_ko })),
    reasoningPath: [
      `card:${cardId}.${orientation}`,
      `card_concepts:${cardConceptIds.join(",") || "none"}`,
      `question_rule:${category}.${position}`,
      `preferred:${preferredIds.join(",") || "none"}`,
      `selected:${selectedConcepts.map((concept) => concept.id).join(",") || "none"}`,
    ],
    realWorldIssues: unique(selectedConcepts.flatMap((concept) => concept.real_world_issues)).slice(0, 3),
    concreteChecks: unique(selectedConcepts.flatMap((concept) => concept.concrete_checks)),
  };
}

export function getTarotConcept(id: string): TarotConcept | undefined {
  return conceptsById.get(id);
}

export function getAllTarotConcepts(): TarotConcept[] {
  return conceptList;
}

export function getCardConceptIds(cardId: string, orientation: Orientation): string[] {
  return mapByCard[cardId]?.[orientation] ?? [];
}

export function getQuestionRulePreferredConceptIds(category: string, position: string): string[] {
  return rules[category]?.[position]?.preferred ?? [];
}

export function getConceptEngineCoverage() {
  return {
    concepts: conceptList.length,
    cards: Object.keys(mapByCard).length,
    orientationMappings: Object.values(mapByCard).reduce((count, entry) => count + Number(Array.isArray(entry.upright)) + Number(Array.isArray(entry.reversed)), 0),
    questionRules: Object.values(rules).reduce((count, categoryRules) => count + Object.keys(categoryRules).length, 0),
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isConcept(value: TarotConcept | undefined): value is TarotConcept {
  return Boolean(value);
}
