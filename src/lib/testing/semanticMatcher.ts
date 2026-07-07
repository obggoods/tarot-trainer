import semanticAliases from "../../data/testing/semanticAliases.json";

export type SemanticRequirement = {
  concept: string;
  aliases?: string[];
};

export type SemanticMatch = {
  concept: string;
  matched: boolean;
  matchedText?: string;
  source: "concept" | "fixture-alias" | "global-alias" | "missing";
};

export function matchSemanticConcept(text: string, requirement: SemanticRequirement): SemanticMatch {
  const normalizedText = normalize(text);
  const normalizedConcept = normalize(requirement.concept);

  if (normalizedText.includes(normalizedConcept)) {
    return {
      concept: requirement.concept,
      matched: true,
      matchedText: requirement.concept,
      source: "concept",
    };
  }

  for (const alias of requirement.aliases ?? []) {
    if (normalizedText.includes(normalize(alias))) {
      return {
        concept: requirement.concept,
        matched: true,
        matchedText: alias,
        source: "fixture-alias",
      };
    }
  }

  for (const alias of getGlobalAliases(requirement.concept)) {
    if (normalizedText.includes(normalize(alias))) {
      return {
        concept: requirement.concept,
        matched: true,
        matchedText: alias,
        source: "global-alias",
      };
    }
  }

  return {
    concept: requirement.concept,
    matched: false,
    source: "missing",
  };
}

export function matchSemanticConcepts(text: string, requirements: SemanticRequirement[]) {
  return requirements.map((requirement) => matchSemanticConcept(text, requirement));
}

export function getGlobalAliases(concept: string) {
  const aliases = (semanticAliases as Record<string, string[]>)[concept];
  return Array.isArray(aliases) ? aliases : [];
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
