export const NOOK_ITEMS = [
  { id: "rug", name: "软软的地毯", cost: 0 },
  { id: "plant", name: "窗边小植物", cost: 8 },
  { id: "lamp", name: "暖黄台灯", cost: 16 },
  { id: "telescope", name: "看星星的望远镜", cost: 28 },
  { id: "mobile", name: "星光吊饰", cost: 40 },
] as const;

export function unlockedItems(stars: number) {
  return NOOK_ITEMS.filter((item) => stars >= item.cost);
}

export function justUnlocked(before: number, after: number) {
  return NOOK_ITEMS.filter((item) => before < item.cost && after >= item.cost);
}
