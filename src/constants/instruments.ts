export interface Member {
  name: string;
  parts: string[];
}

export const MEMBERS: Member[] = [
  { name: "수진", parts: ["보컬"] },
  { name: "예지", parts: ["보컬"] },
  { name: "범근", parts: ["보컬"] },
  { name: "성진", parts: ["기타"] },
  { name: "평규", parts: ["드럼"] },
  { name: "효인", parts: ["드럼"] },
  { name: "지훈", parts: ["기타"] },
  { name: "상균", parts: ["기타"] },
  { name: "영진", parts: ["베이스"] },
  { name: "민섭", parts: ["베이스"] },
  { name: "기정", parts: ["베이스"] },
  { name: "지혜", parts: ["건반"] },
];

export const INSTRUMENT_ICONS: Record<string, string> = {
  보컬: "🎤",
  드럼: "🥁",
  기타: "🎸",
  베이스: "🎸",
  건반: "🎹",
};

export const INSTRUMENT_CATEGORIES = [
  { key: "보컬", label: "보컬", icon: "🎤" },
  { key: "드럼", label: "드럼", icon: "🥁" },
  { key: "기타", label: "기타", icon: "🎸" },
  { key: "베이스", label: "베이스", icon: "🎸" },
  { key: "건반", label: "건반", icon: "🎹" },
] as const;

/**
 * Get instrument parts for a given voter name.
 * Searches member list for exact match or substring match.
 */
export function getPartsByVoterName(voterName?: string): string[] {
  if (!voterName || !voterName.trim()) return [];
  const cleanName = voterName.trim();

  // 1. Direct or partial member match
  for (const m of MEMBERS) {
    if (
      cleanName === m.name ||
      cleanName.includes(m.name) ||
      m.name.includes(cleanName)
    ) {
      return m.parts;
    }
  }

  // 2. Check if name explicitly mentions instrument in parentheses, e.g. "홍길동(드럼)"
  const matchedParts: string[] = [];
  for (const cat of INSTRUMENT_CATEGORIES) {
    if (cleanName.includes(cat.key) || cleanName.includes(cat.label)) {
      matchedParts.push(cat.key);
    }
  }

  return matchedParts;
}

export interface PartSummaryItem {
  category: string;
  label: string;
  icon: string;
  voters: { name: string; parts: string[] }[];
}

/**
 * Group voters for a song option into instrument categories.
 */
export function getBandPartsSummary(voterNames: string[]): {
  summaries: PartSummaryItem[];
  filledCount: number;
  totalCategories: number;
  unmappedVoters: string[];
} {
  const categoryMap: Record<string, { name: string; parts: string[] }[]> = {};
  INSTRUMENT_CATEGORIES.forEach((cat) => {
    categoryMap[cat.key] = [];
  });

  const unmappedVoters: string[] = [];

  voterNames.filter(Boolean).forEach((name) => {
    const parts = getPartsByVoterName(name);
    if (parts.length === 0) {
      if (!unmappedVoters.includes(name)) {
        unmappedVoters.push(name);
      }
    } else {
      parts.forEach((part) => {
        let targetKey = part;
        if (!categoryMap[targetKey] && part.startsWith("기타") && categoryMap["기타"]) {
          targetKey = "기타";
        }
        if (categoryMap[targetKey]) {
          if (!categoryMap[targetKey].some((v) => v.name === name)) {
            categoryMap[targetKey].push({ name, parts });
          }
        }
      });
    }
  });


  const summaries: PartSummaryItem[] = INSTRUMENT_CATEGORIES.map((cat) => ({
    category: cat.key,
    label: cat.label,
    icon: cat.icon,
    voters: categoryMap[cat.key] || [],
  }));

  const filledCount = summaries.filter((s) => s.voters.length > 0).length;

  return {
    summaries,
    filledCount,
    totalCategories: INSTRUMENT_CATEGORIES.length,
    unmappedVoters,
  };
}
