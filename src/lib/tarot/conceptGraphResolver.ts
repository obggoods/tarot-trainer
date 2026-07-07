import conceptGraph from "../../data/tarot/concepts/conceptGraph.json";
import questionGraphRules from "../../data/tarot/concepts/questionGraphRules.json";
import type { Orientation, TarotCategory } from "../../types/tarot";
import { getTarotConcept, resolveConcepts, type ResolvedConcept } from "./conceptResolver";

type GraphRelations = {
  leads_to?: string[];
  supports?: string[];
  resolved_by?: string[];
};

type GraphRules = Record<string, Record<string, string[]>>;

export type ReasoningGraphEdge = {
  from: ResolvedConcept;
  relation: "leads_to" | "supports" | "resolved_by";
  to: ResolvedConcept;
};

export type ConceptGraphResolution = {
  primaryConcepts: ResolvedConcept[];
  secondaryConcepts: ResolvedConcept[];
  reasoningGraph: ReasoningGraphEdge[];
  reasoningPath: string[];
  realWorldIssues: string[];
  recommendedChecks: string[];
  recommendedActions: string[];
};

const graph = conceptGraph as Record<string, GraphRelations>;
const rules = questionGraphRules as GraphRules;

export function resolveConceptGraph({
  cardId,
  orientation,
  category,
  position,
}: {
  cardId: string;
  orientation: Orientation;
  category: TarotCategory | string;
  position: string;
}): ConceptGraphResolution {
  const base = resolveConcepts({ cardId, orientation, category, position });
  const primaryConcepts = base.selectedConcepts;
  const questionPriority = rules[category]?.[position] ?? [];
  const edges = buildEdges(primaryConcepts, questionPriority);
  const secondaryConcepts = uniqueConcepts(
    edges
      .filter((edge) => edge.relation !== "resolved_by")
      .map((edge) => edge.to)
      .filter((concept) => !primaryConcepts.some((primary) => primary.id === concept.id)),
  ).slice(0, 4);
  const actionConcepts = uniqueConcepts(edges.filter((edge) => edge.relation === "resolved_by").map((edge) => edge.to));
  const reasoningPath = buildReasoningPath(primaryConcepts, secondaryConcepts, actionConcepts);
  const realWorldIssues = uniqueStrings([
    ...primaryConcepts.flatMap((concept) => getTarotConcept(concept.id)?.real_world_issues ?? []),
    ...secondaryConcepts.flatMap((concept) => getTarotConcept(concept.id)?.real_world_issues ?? []),
  ]).slice(0, 5);
  const recommendedChecks = uniqueStrings([...base.concreteChecks, ...secondaryConcepts.flatMap((concept) => getTarotConcept(concept.id)?.concrete_checks ?? [])]).slice(0, 10);
  const recommendedActions = uniqueStrings(
    actionConcepts.flatMap((concept) => {
      const full = getTarotConcept(concept.id);
      return full ? [full.name_ko, ...full.concrete_checks.slice(0, 2)] : [concept.name_ko];
    }),
  ).slice(0, 8);

  return {
    primaryConcepts,
    secondaryConcepts,
    reasoningGraph: edges.slice(0, 8),
    reasoningPath,
    realWorldIssues,
    recommendedChecks,
    recommendedActions,
  };
}

function buildEdges(primaryConcepts: ResolvedConcept[], questionPriority: string[]): ReasoningGraphEdge[] {
  const edges: ReasoningGraphEdge[] = [];

  for (const concept of primaryConcepts) {
    const relations = graph[concept.id];
    if (!relations) continue;

    for (const relation of ["leads_to", "supports", "resolved_by"] as const) {
      const targets = prioritize(relations[relation] ?? [], questionPriority);
      for (const targetId of targets.slice(0, relation === "resolved_by" ? 2 : 3)) {
        const target = toResolvedConcept(targetId);
        if (target) edges.push({ from: concept, relation, to: target });
      }
    }
  }

  return uniqueEdges(edges);
}

function buildReasoningPath(primaryConcepts: ResolvedConcept[], secondaryConcepts: ResolvedConcept[], actionConcepts: ResolvedConcept[]) {
  return uniqueStrings([
    ...primaryConcepts.map((concept) => concept.name_ko),
    ...secondaryConcepts.slice(0, 3).map((concept) => concept.name_ko),
    ...actionConcepts.slice(0, 2).map((concept) => concept.name_ko),
  ]);
}

function prioritize(values: string[], priority: string[]) {
  return [...values].sort((left, right) => priorityScore(right, priority) - priorityScore(left, priority));
}

function priorityScore(value: string, priority: string[]) {
  const index = priority.indexOf(value);
  return index === -1 ? 0 : priority.length - index;
}

function toResolvedConcept(id: string): ResolvedConcept | undefined {
  const concept = getTarotConcept(id);
  return concept ? { id: concept.id, name_ko: concept.name_ko } : undefined;
}

function uniqueConcepts(concepts: ResolvedConcept[]) {
  const seen = new Set<string>();
  return concepts.filter((concept) => {
    if (seen.has(concept.id)) return false;
    seen.add(concept.id);
    return true;
  });
}

function uniqueEdges(edges: ReasoningGraphEdge[]) {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.from.id}:${edge.relation}:${edge.to.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
