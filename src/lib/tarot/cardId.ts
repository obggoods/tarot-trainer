const legacyMajorIdMap: Record<string, string> = {
  "major-fool": "major_00_fool",
  "major-magician": "major_01_magician",
  "major-high-priestess": "major_02_high_priestess",
  "major-empress": "major_03_empress",
  "major-emperor": "major_04_emperor",
  "major-hierophant": "major_05_hierophant",
  "major-lovers": "major_06_lovers",
  "major-chariot": "major_07_chariot",
  "major-strength": "major_08_strength",
  "major-hermit": "major_09_hermit",
  "major-wheel-of-fortune": "major_10_wheel_of_fortune",
  "major-justice": "major_11_justice",
  "major-hanged-man": "major_12_hanged_man",
  "major-death": "major_13_death",
  "major-temperance": "major_14_temperance",
  "major-devil": "major_15_devil",
  "major-tower": "major_16_tower",
  "major-star": "major_17_star",
  "major-moon": "major_18_moon",
  "major-sun": "major_19_sun",
  "major-judgement": "major_20_judgement",
  "major-world": "major_21_world",
};

const legacyCourtIdMap: Record<string, string> = {
  pentacles_page: "pentacles_11",
  "pentacles-page": "pentacles_11",
};

export function normalizeCardId(cardId: string) {
  const directId = cardId.trim().toLowerCase();
  const mappedMajorId = legacyMajorIdMap[directId];
  const mappedCourtId = legacyCourtIdMap[directId];

  if (mappedMajorId) {
    return mappedMajorId;
  }

  if (mappedCourtId) {
    return mappedCourtId;
  }

  const legacyMinorMatch = /^(wands|cups|swords|pentacles)-(\d{1,2})$/.exec(directId);

  if (legacyMinorMatch) {
    const [, suit, number] = legacyMinorMatch;
    return `${suit}_${number.padStart(2, "0")}`;
  }

  return directId.split("-").join("_");
}
