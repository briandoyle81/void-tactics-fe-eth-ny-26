// RoguelikeNodeMap's data model only stores children (parent -> child
// edges), the opposite direction from CampaignGraphCanvas's depth-column
// layout, which groups nodes by prerequisite depth. This inverts one
// campaign's worth of children edges into a prerequisites list per node so
// the same canvas can lay out both graph shapes. Number-native — callers
// adapt their own bigint/number node ids down to plain numbers first, same
// adapter-boundary rule as CampaignGraph.tsx (see feedback_number_native_
// shared_components memory).
export interface RoguelikeGraphEdgeInput {
  childId: number;
}

export interface RoguelikeGraphNodeInput {
  id: number;
  children: RoguelikeGraphEdgeInput[];
}

export function buildRoguelikePrerequisites(
  nodes: RoguelikeGraphNodeInput[],
): Map<number, number[]> {
  const prerequisites = new Map<number, number[]>();
  nodes.forEach((node) => prerequisites.set(node.id, []));
  nodes.forEach((node) => {
    node.children.forEach((edge) => {
      const list = prerequisites.get(edge.childId);
      if (list && !list.includes(node.id)) list.push(node.id);
    });
  });
  return prerequisites;
}
