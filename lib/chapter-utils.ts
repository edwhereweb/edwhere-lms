type SortableChapter = {
  id: string;
  position: number;
  moduleId: string | null;
  module?: { position: number } | null;
};

export function sortChapters<T extends SortableChapter>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => {
    // Both have modules
    if (a.moduleId && b.moduleId) {
      if (a.moduleId === b.moduleId) return a.position - b.position;

      const moduleAPos = a.module?.position ?? 0;
      const moduleBPos = b.module?.position ?? 0;

      if (moduleAPos !== moduleBPos) {
        return moduleAPos - moduleBPos;
      }
      // If module positions are tied, fallback to ID comparison to keep them grouped
      return a.moduleId.localeCompare(b.moduleId);
    }

    // One has module, one doesn't
    if (a.moduleId && !b.moduleId) return -1; // Module chapters come first
    if (!a.moduleId && b.moduleId) return 1;

    // Neither has module
    return a.position - b.position;
  });
}
