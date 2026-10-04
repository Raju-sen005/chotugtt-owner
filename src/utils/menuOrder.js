export const COMBO_CATEGORY = "COMBO";

export function orderCategoryNames(names, savedOrder, includeCombo = false) {
  const present = [];
  const seen = new Set();

  for (const raw of names || []) {
    const name = String(raw || "").trim();

    if (!name || seen.has(name)) continue;

    seen.add(name);
    present.push(name);
  }

  if (includeCombo && !seen.has(COMBO_CATEGORY)) {
    seen.add(COMBO_CATEGORY);
    present.push(COMBO_CATEGORY);
  }

  const saved = [];
  const used = new Set();

  for (const raw of savedOrder || []) {
    const name = String(raw || "").trim();

    if (!name || !seen.has(name) || used.has(name)) continue;

    saved.push(name);
    used.add(name);
  }

  return [...saved, ...present.filter((name) => !used.has(name))];
}

export function sortMenuEntries(entries, categoryOrder) {
  const rank = new Map(
    (categoryOrder || []).map((name, index) => [String(name), index]),
  );

  const categoryOf = (entry) => {
    if (
      entry?.catalogType === "COMBO" ||
      entry?.isCombo ||
      entry?.itemType === "COMBO"
    ) {
      return COMBO_CATEGORY;
    }

    return String(entry?.category || "").trim();
  };

  return [...(entries || [])].sort((a, b) => {
    const leftRank = rank.has(categoryOf(a)) ? rank.get(categoryOf(a)) : 100000;
    const rightRank = rank.has(categoryOf(b))
      ? rank.get(categoryOf(b))
      : 100000;

    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftOrder = Number.isFinite(Number(a?.sortOrder))
      ? Number(a.sortOrder)
      : 100000;
    const rightOrder = Number.isFinite(Number(b?.sortOrder))
      ? Number(b.sortOrder)
      : 100000;

    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    const leftTime = new Date(a?.createdAt || 0).getTime();
    const rightTime = new Date(b?.createdAt || 0).getTime();

    if (leftTime !== rightTime) return rightTime - leftTime;

    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
}
