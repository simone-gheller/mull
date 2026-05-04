const DEPTH_ICONS = ["▣", "◈", "◇"];

export function buildAppTree(flatList) {
  const map = {};
  flatList.forEach(node => {
    map[node.id] = { ...node, icon: DEPTH_ICONS[Math.min(node.depth ?? 0, 2)], children: [] };
  });
  const roots = [];
  flatList.forEach(node => {
    if (node.parentId && map[node.parentId]) {
      map[node.parentId].children.push(map[node.id]);
    } else {
      roots.push(map[node.id]);
    }
  });
  return roots;
}
