import _ from 'lodash';
import { Node, Edge, MergedNode, MergedEdge } from '../types';
import { getNodeSVGString } from '../ui/template/node';
import { ServerMapProps } from '../ui';
type GroupBySource = { [key: string]: string[] };

// Reject keys that could be used to pollute Object.prototype when an
// untrusted string is used in bracket-notation assignment such as
// `obj[key] = value`. Server map node/edge data originates from a backend
// API, so the `source`, `target`, and `type` fields must be treated as
// untrusted input. See CWE-1321 (Prototype Pollution).
const UNSAFE_OBJECT_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype']);
const isSafeObjectKey = (key: unknown): key is string =>
  typeof key === 'string' && !UNSAFE_OBJECT_KEYS.has(key);

// Create a dictionary-style object with no prototype chain so that even if
// a prototype-polluting key slipped past validation, it could not reach
// `Object.prototype`.
const createSafeDict = <T>(): { [key: string]: T } =>
  Object.create(null) as { [key: string]: T };

const mergeNodes = ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
  const { single, multi } = groupEndNodesByTargetCount(nodes, edges);
};

const mergeSingleTargetedNodes = (singles: string[], edges: Edge[]) => {
  const a = groupSingleTargetsBySource(singles, edges);
};

const mergeMultiTargetedNodes = (multies: string[]) => {};

// { single: [t4, t5], multi: [t1, t2, t3] }
const groupEndNodesByTargetCount = (nodes: Node[], edges: Edge[]) => {
  const targetNodeIds = edges.map((edge) => edge.target);

  // [ t1, t1, t1, t2, t2, t3, t3, t3, t3, t4, t5 ]
  const EndNodesIds = targetNodeIds.filter((id) => {
    return !edges.some((edge) => edge.source === id);
  });

  const shouldMergeNodeIds = EndNodesIds.filter((id) => {
    return !nodes.find((node) => id === node.id)?.shouldNotMerge?.();
  });

  // { t1: 3, t2: 2, t3: 4, t4: 1, t5: 1 }
  const targetIdAndCount = shouldMergeNodeIds.reduce<{ [key: string]: number }>((prev, curr) => {
    if (!isSafeObjectKey(curr)) {
      return prev;
    }
    if (prev[curr]) {
      return { ...prev, [curr]: prev[curr] + 1 };
    } else {
      return { ...prev, [curr]: 1 };
    }
  }, createSafeDict<number>());

  return Object.entries(targetIdAndCount).reduce<{ single: string[]; multi: string[] }>(
    (prev, [key, count]) => {
      const arr = { ...prev };
      count > 1 ? arr.multi.push(key) : arr.single.push(key);
      return arr;
    },
    { single: [], multi: [] },
  );
};

// { source1: [t4, t5], source2: [t1, t2], source: [t3]}
const groupSingleTargetsBySource = (singleTargets: string[], edges: Edge[]) => {
  return singleTargets.reduce<{ [key: string]: string[] }>((prev, curr) => {
    const { source } = edges.find((edge) => edge.target === curr)!;

    if (!isSafeObjectKey(source)) {
      return prev;
    }
    if (prev[source]) {
      prev[source].push(curr);
    } else {
      prev[source] = [curr];
    }
    return prev;
  }, createSafeDict<string[]>());
};

// { source1: [t4, t5], source2: [t1, t2], source: [t3]}
const groupMultiTargetsBySource = (multiTargets: string[], edges: Edge[]) => {
  return multiTargets.reduce<{ [key: string]: string[] }>((prev, curr) => {
    const sourcesKey = edges
      .filter((edge) => edge.target === curr)
      .map((edge) => edge.source)
      .sort()
      .toString();

    if (!isSafeObjectKey(sourcesKey)) {
      return prev;
    }
    if (prev[sourcesKey]) {
      prev[sourcesKey].push(curr);
    } else {
      prev[sourcesKey] = [curr];
    }
    return prev;
  }, createSafeDict<string[]>());
};

// { source1: { type1: [t4, t5] }, source2: { type:2 [t1]} ...}
const groupByType = (groupBySource: GroupBySource, nodes: Node[]) => {
  return Object.entries(groupBySource).reduce<{ [key: string]: { [key: string]: string[] } }>(
    (prev, [source, targetIds]) => {
      const result = { ...prev };

      if (!isSafeObjectKey(source)) {
        return result;
      }

      targetIds.forEach((id) => {
        const node = nodes.find((n) => n.id === id);
        if (!node?.type || !isSafeObjectKey(node.type)) {
          return;
        }

        if (result[source]) {
          if (result[source][node.type]) {
            result[source][node.type].push(id);
          } else {
            result[source][node.type] = [id];
          }
        } else {
          result[source] = createSafeDict<string[]>();
          result[source][node.type] = [id];
        }
      });
      return result;
    },
    createSafeDict<{ [key: string]: string[] }>(),
  );
};

export const getMergedData = (
  data: { nodes: Node[]; edges: Edge[] },
  renderNode?: ServerMapProps['renderNode'],
) => {
  const { edges, nodes } = data;
  const mergedTypes = new Set<string>();
  const targetNodeIds = edges.map((edge) => edge.target);

  // [ t1, t1, t1, t2, t2, t3, t3, t3, t3, t4, t5 ]
  const leafNodesIds = targetNodeIds.filter((id) => {
    return !edges.some((edge) => edge.source === id);
  });

  const shouldMergeNodeIds = leafNodesIds.filter((id) => {
    return !nodes.find((node) => id === node.id)?.shouldNotMerge?.();
  });

  // { t1: 3, t2: 2, t3: 4, t4: 1, t5: 1 }
  const targetIdAndCount = shouldMergeNodeIds.reduce<{ [key: string]: number }>((prev, curr) => {
    if (!isSafeObjectKey(curr)) {
      return prev;
    }
    if (prev[curr]) {
      return { ...prev, [curr]: prev[curr] + 1 };
    } else {
      return { ...prev, [curr]: 1 };
    }
  }, createSafeDict<number>());

  // { single: [t4, t5], multi: [t1, t2, t3] }
  const groupByTargetCount = Object.entries(targetIdAndCount).reduce<{
    single: string[];
    multi: string[];
  }>(
    (prev, [key, count]) => {
      const arr = { ...prev };
      count > 1 ? arr.multi.push(key) : arr.single.push(key);
      return arr;
    },
    { single: [], multi: [] },
  );

  // { source1: [t4, t5], source2: [t1, t2], source: [t3]}
  const groupBySourceOnSingle = groupByTargetCount.single.reduce<{ [key: string]: string[] }>((prev, curr) => {
    const { source } = edges.find((edge) => edge.target === curr)!;

    if (!isSafeObjectKey(source)) {
      return prev;
    }
    if (prev[source]) {
      prev[source].push(curr);
    } else {
      prev[source] = [curr];
    }
    return prev;
  }, createSafeDict<string[]>());

  // { source1: [t4, t5], source2: [t1, t2], source: [t3]}
  const groupBySourceOnMulti = groupByTargetCount.multi.reduce<{ [key: string]: string[] }>((prev, curr) => {
    const sourcesKey = edges
      .filter((edge) => edge.target === curr)
      .map((edge) => edge.source)
      .sort()
      .toString();

    if (!isSafeObjectKey(sourcesKey)) {
      return prev;
    }
    if (prev[sourcesKey]) {
      prev[sourcesKey].push(curr);
    } else {
      prev[sourcesKey] = [curr];
    }
    return prev;
  }, createSafeDict<string[]>());

  // { source1: { type1: [t4, t5] }, source2: { type:2 [t1]} ...}
  const getGroupByType = (groupBySource: GroupBySource) =>
    Object.entries(groupBySource).reduce<{ [key: string]: { [key: string]: string[] } }>(
      (prev, [source, targetIds]) => {
        const result = { ...prev };

        if (!isSafeObjectKey(source)) {
          return result;
        }

        targetIds.forEach((id) => {
          const node = nodes.find((node) => node.id === id);
          if (!node?.type || !isSafeObjectKey(node.type)) {
            return;
          }

          if (result[source]) {
            if (result[source][node.type]) {
              result[source][node.type].push(id);
            } else {
              result[source][node.type] = [id];
            }
          } else {
            result[source] = createSafeDict<string[]>();
            result[source][node.type] = [id];
          }
        });
        return result;
      },
      createSafeDict<{ [key: string]: string[] }>(),
    );

  const groupByTypeOnSingle = getGroupByType(groupBySourceOnSingle);
  const groupByTypeOnMulti = getGroupByType(groupBySourceOnMulti);

  const mergeSingleNodes = () => {
    // Node edges
    let mergedNodes: MergedNode[] = [...nodes];
    let mergedEdges: MergedEdge[] = [...edges];

    Object.entries(groupByTypeOnSingle).forEach(([source, typeAndTargetIds]) => {
      Object.entries(typeAndTargetIds).forEach(([type, targetIds]) => {
        if (targetIds.length > 1) {
          mergedTypes.add(type);

          const id = `${source}_MergeSingleNodesByServerMap^${type}`;
          const imgPath = mergedNodes.find((node) => node.id === targetIds[0])?.imgPath;

          const [notToMergeNodes, toMergeNodes] = _.partition(mergedNodes, (node) => !targetIds.includes(node.id));

          mergedNodes = [
            ...notToMergeNodes,
            {
              id,
              imgPath,
              type,
              label: `total: ${targetIds.length}`,
              nodes: toMergeNodes,
            },
          ];

          const [notToMergeEdge, toMergeEdge] = _.partition(mergedEdges, (edge) => !targetIds.includes(edge.target));
          mergedEdges = [
            ...notToMergeEdge,
            {
              source,
              target: id,
              id: `${source}~${id}`,
              edges: toMergeEdge,
            },
          ];
        }
      });
    });

    return {
      nodes: mergedNodes,
      edges: mergedEdges,
    };
  };

  const mergedData = mergeSingleNodes();

  const mergeMultieNodes = () => {
    // Node edges
    let mergedNodes: MergedNode[] = [...mergedData.nodes];
    let mergedEdges: MergedEdge[] = [...mergedData.edges];

    Object.entries(groupByTypeOnMulti).forEach(([source, typeAndTargetIds]) => {
      Object.entries(typeAndTargetIds).forEach(([type, targetIds]) => {
        if (targetIds.length > 1) {
          mergedTypes.add(type);

          const id = `${source}_MergeMultiNodesByServerMap^${type}`;
          const imgPath = mergedNodes.find((node) => node.id === targetIds[0])?.imgPath;
          const [notToMergeNodes, toMergeNodes] = _.partition(mergedNodes, (node) => !targetIds.includes(node.id));
          mergedNodes = [
            ...notToMergeNodes,
            {
              id,
              imgPath,
              type,
              label: `total: ${targetIds.length}`,
              nodes: toMergeNodes,
            },
          ];

          const sources = source.split(',');
          //[
          //   e1,e2,e3, => e10 (same source)
          //   e4,e5,e6, => e11 (same source)
          //   e7,e8,e9 => e12 (same source)
          // ]
          const [notToMergeEdge, toMergeEdge] = _.partition(
            mergedEdges,
            (edge) => !(sources.includes(edge.source) && targetIds.includes(edge.target)),
          );
          const newEdges = toMergeEdge.reduce<{ [key: string]: MergedEdge }>((prev, curr, i) => {
            if (!isSafeObjectKey(curr.source)) {
              return prev;
            }
            if (prev[curr.source]) {
              prev[curr.source].edges!.push(curr);
            } else {
              prev[curr.source] = {
                target: id,
                source: curr.source,
                id: `${curr.source}~${id}`,
                edges: [curr],
              };
            }
            return { ...prev };
          }, createSafeDict<MergedEdge>());

          mergedEdges = [...notToMergeEdge, ...Object.values(newEdges)];
        }
      });
    });

    return {
      nodes: mergedNodes,
      edges: mergedEdges,
    };
  };

  const finalData = mergeMultieNodes();

  return {
    nodes: [
      ...finalData.nodes.map((node) => {
        return {
          data: {
            ...node,
            imgArr: [node?.imgPath, getNodeSVGString(node, renderNode)],
          },
        };
      }),
    ],
    edges: [
      ...finalData.edges.map((edge) => ({
        data: {
          ...edge,
        },
      })),
    ],
    mergeInfo: {
      types: Array.from(mergedTypes),
    },
  };
};
