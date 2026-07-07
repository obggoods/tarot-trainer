import fs from "node:fs";
import path from "node:path";
import tarotConcepts from "../src/data/tarot/concepts/tarotConcepts.json";
import conceptGraph from "../src/data/tarot/concepts/conceptGraph.json";
import questionGraphRules from "../src/data/tarot/concepts/questionGraphRules.json";
import cardConceptMap from "../src/data/tarot/concepts/cardConceptMap.json";
import { resolveConceptGraph } from "../src/lib/tarot/conceptGraphResolver";
import type { Orientation, TarotCategory } from "../src/types/tarot";

type Concept = { id: string; difficulty?: number };
type GraphRelations = { leads_to?: string[]; supports?: string[]; resolved_by?: string[] };
type Graph = Record<string, GraphRelations>;
type QuestionRules = Record<string, Record<string, string[]>>;
type CardMap = Record<string, Record<Orientation, string[]>>;

const concepts = tarotConcepts as Concept[];
const graph = conceptGraph as Graph;
const questionRules = questionGraphRules as QuestionRules;
const cardMap = cardConceptMap as CardMap;
const conceptIds = new Set(concepts.map((concept) => concept.id));
const errors: string[] = [];

validateConceptDifficulty();
validateGraphReferences();
validateAcyclicLeadsTo();
validateOrphans();
validateQuestionCoverage();
validateResolver();
writeReport();

if (errors.length > 0) {
  console.error("Concept graph validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Concept graph validation passed.");
console.table([buildSummary()]);
console.log(`Report written: ${path.join(process.cwd(), "reports", "concept-graph-report.md")}`);

function validateConceptDifficulty() {
  for (const concept of concepts) {
    if (![1, 2, 3].includes(concept.difficulty ?? 0)) errors.push(`Invalid difficulty for concept: ${concept.id}`);
  }
}

function validateGraphReferences() {
  for (const concept of concepts) {
    if (!graph[concept.id]) errors.push(`Missing graph node: ${concept.id}`);
  }

  for (const [source, relations] of Object.entries(graph)) {
    if (!conceptIds.has(source)) errors.push(`Graph has unknown source concept: ${source}`);
    for (const [relation, targets] of Object.entries(relations)) {
      for (const target of targets ?? []) {
        if (!conceptIds.has(target)) errors.push(`Graph ${source}.${relation} references missing concept: ${target}`);
      }
    }
  }
}

function validateAcyclicLeadsTo() {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const concept of concepts) {
    visit(concept.id, visiting, visited, []);
  }
}

function visit(id: string, visiting: Set<string>, visited: Set<string>, stack: string[]) {
  if (visited.has(id)) return;
  if (visiting.has(id)) {
    errors.push(`Cycle detected in leads_to: ${[...stack, id].join(" -> ")}`);
    return;
  }

  visiting.add(id);
  for (const target of graph[id]?.leads_to ?? []) visit(target, visiting, visited, [...stack, id]);
  visiting.delete(id);
  visited.add(id);
}

function validateOrphans() {
  const connected = new Set<string>();
  for (const [source, relations] of Object.entries(graph)) {
    if (edgeCount(relations) > 0) connected.add(source);
    for (const target of allTargets(relations)) connected.add(target);
  }

  for (const concept of concepts) {
    if (!connected.has(concept.id)) errors.push(`Orphan concept: ${concept.id}`);
  }
}

function validateQuestionCoverage() {
  const rules = Object.entries(questionRules).flatMap(([category, positions]) => Object.entries(positions).map(([position, ids]) => ({ category, position, ids })));
  if (rules.length < 12) errors.push(`Question graph rules must cover at least 12 rules, got ${rules.length}.`);

  for (const rule of rules) {
    if (rule.ids.length === 0) errors.push(`Question graph rule is empty: ${rule.category}.${rule.position}`);
    for (const conceptId of rule.ids) {
      if (!conceptIds.has(conceptId)) errors.push(`Question graph rule ${rule.category}.${rule.position} references missing concept: ${conceptId}`);
    }
  }
}

function validateResolver() {
  const rules = Object.entries(questionRules).flatMap(([category, positions]) => Object.keys(positions).map((position) => ({ category, position })));
  for (const [cardId, orientations] of Object.entries(cardMap)) {
    for (const orientation of Object.keys(orientations) as Orientation[]) {
      for (const rule of rules) {
        const result = resolveConceptGraph({ cardId, orientation, category: rule.category as TarotCategory, position: rule.position });
        if (result.primaryConcepts.length === 0) errors.push(`Graph resolver primaryConcepts empty: ${cardId}.${orientation}.${rule.category}.${rule.position}`);
        if (result.reasoningPath.length < 2) errors.push(`Graph resolver reasoningPath too short: ${cardId}.${orientation}.${rule.category}.${rule.position}`);
        if (result.recommendedChecks.length < 3) errors.push(`Graph resolver recommendedChecks too short: ${cardId}.${orientation}.${rule.category}.${rule.position}`);
      }
    }
  }
}

function writeReport() {
  const reportPath = path.join(process.cwd(), "reports", "concept-graph-report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(), "utf8");
}

function buildReport() {
  const summary = buildSummary();
  const difficulty = difficultyDistribution();
  const questionCoverage = Object.values(questionRules).reduce((count, positions) => count + Object.keys(positions).length, 0);
  const sample = resolveConceptGraph({ cardId: "swords_07", orientation: "upright", category: "relationship", position: "partnership_check" });
  const oldTokens = 346;
  const graphTokens = estimateTokens(JSON.stringify({
    primaryConcepts: sample.primaryConcepts,
    secondaryConcepts: sample.secondaryConcepts,
    reasoningPath: sample.reasoningPath,
    recommendedChecks: sample.recommendedChecks,
    recommendedActions: sample.recommendedActions,
  }).length);

  return [
    "# Concept Graph Report",
    "",
    `- Concept count: ${summary.Concepts}`,
    `- Edge count: ${summary.Edges}`,
    `- Average edge: ${summary["Average Edge"]}`,
    `- Orphan: ${summary.Orphans}`,
    `- Question coverage: ${questionCoverage}`,
    `- Difficulty 1: ${difficulty[1] ?? 0}`,
    `- Difficulty 2: ${difficulty[2] ?? 0}`,
    `- Difficulty 3: ${difficulty[3] ?? 0}`,
    "",
    "## Prompt Token Impact",
    "",
    `- Previous resolver payload estimate: ${oldTokens} tokens`,
    `- Graph resolver payload estimate: ${graphTokens} tokens`,
    `- Reasoning retention: primary concepts, secondary concepts, reasoning path, recommended checks, recommended actions are all generated by code before the prompt.`,
    "",
    "## Sample Reasoning Path",
    "",
    sample.reasoningPath.map((step) => `- ${step}`).join("\n"),
    "",
  ].join("\n");
}

function buildSummary() {
  const edges = Object.values(graph).reduce((sum, relations) => sum + edgeCount(relations), 0);
  const orphans = concepts.filter((concept) => edgeCount(graph[concept.id] ?? {}) === 0 && !hasIncoming(concept.id)).length;
  return {
    Concepts: concepts.length,
    Edges: edges,
    "Average Edge": Number((edges / concepts.length).toFixed(2)),
    Orphans: orphans,
    "Question Rules": Object.values(questionRules).reduce((count, positions) => count + Object.keys(positions).length, 0),
  };
}

function difficultyDistribution() {
  return concepts.reduce<Record<number, number>>((acc, concept) => {
    const difficulty = concept.difficulty ?? 0;
    acc[difficulty] = (acc[difficulty] ?? 0) + 1;
    return acc;
  }, {});
}

function edgeCount(relations: GraphRelations) {
  return allTargets(relations).length;
}

function allTargets(relations: GraphRelations) {
  return [...(relations.leads_to ?? []), ...(relations.supports ?? []), ...(relations.resolved_by ?? [])];
}

function hasIncoming(id: string) {
  return Object.values(graph).some((relations) => allTargets(relations).includes(id));
}

function estimateTokens(chars: number) {
  return Math.ceil(chars / 4);
}
