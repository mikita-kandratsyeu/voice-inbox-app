import type { VoiceRecord } from '@/entities/record';
import { buildBacklinkRecordIds } from '@/features/note-links/lib/buildBacklinksForRecord';
import {
  buildSimilarityContext,
  MIN_HYBRID_SCORE,
  MIN_LEXICAL_ONLY_SCORE,
  rankSimilarRecords,
} from '@/features/related-notes/lib/computeRecordSimilarity';

export type LocalGraphEdgeKind = 'linked' | 'similar';

export type LocalGraphEdge = {
  sourceRecordId: string;
  targetRecordId: string;
  kind: LocalGraphEdgeKind;
  hop: 1 | 2;
};

export type LocalGraphNeighborhood = {
  centerRecordId: string;
  recordIds: string[];
  edges: LocalGraphEdge[];
};

export type BuildLocalGraphNeighborhoodOptions = {
  maxHops: 1 | 2;
  includeSimilar?: boolean;
  similarLimitPerHop?: number;
};

const DEFAULT_SIMILAR_LIMIT = 3;

function collectLinkedNeighborIds(recordId: string, records: readonly VoiceRecord[]): string[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const current = recordsById.get(recordId);
  if (!current) return [];

  const neighbors = new Set<string>();

  for (const linkedId of current.linkedRecordIds ?? []) {
    if (linkedId !== recordId && recordsById.has(linkedId)) {
      neighbors.add(linkedId);
    }
  }

  for (const backlinkId of buildBacklinkRecordIds(recordId, records)) {
    if (recordsById.has(backlinkId)) {
      neighbors.add(backlinkId);
    }
  }

  return [...neighbors];
}

function addUndirectedEdge(
  edges: LocalGraphEdge[],
  edgeKeys: Set<string>,
  sourceRecordId: string,
  targetRecordId: string,
  kind: LocalGraphEdgeKind,
  hop: 1 | 2,
): void {
  const pairKey = [sourceRecordId, targetRecordId].sort().join('|');
  const edgeKey = `${pairKey}:${kind}:${hop}`;
  if (edgeKeys.has(edgeKey)) return;

  edgeKeys.add(edgeKey);
  edges.push({ sourceRecordId, targetRecordId, kind, hop });
}

export function buildLocalGraphNeighborhood(
  centerRecordId: string,
  records: readonly VoiceRecord[],
  options: BuildLocalGraphNeighborhoodOptions,
): LocalGraphNeighborhood {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  if (!recordsById.has(centerRecordId)) {
    return { centerRecordId, recordIds: [], edges: [] };
  }

  const includeSimilar = options.includeSimilar ?? true;
  const similarLimit = options.similarLimitPerHop ?? DEFAULT_SIMILAR_LIMIT;
  const similarityContext = includeSimilar ? buildSimilarityContext([...records]) : null;
  const minSimilarScore = similarityContext?.useEmbeddings
    ? MIN_HYBRID_SCORE
    : MIN_LEXICAL_ONLY_SCORE;

  const visited = new Set<string>([centerRecordId]);
  const depths = new Map<string, number>([[centerRecordId, 0]]);
  const edges: LocalGraphEdge[] = [];
  const edgeKeys = new Set<string>();
  const queue = [centerRecordId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depths.get(currentId) ?? 0;
    if (currentDepth >= options.maxHops) continue;

    const nextHop = (currentDepth + 1) as 1 | 2;

    for (const neighborId of collectLinkedNeighborIds(currentId, records)) {
      addUndirectedEdge(edges, edgeKeys, currentId, neighborId, 'linked', nextHop);

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        depths.set(neighborId, currentDepth + 1);
        queue.push(neighborId);
      }
    }

    if (includeSimilar && currentDepth === 0 && similarityContext) {
      const current = recordsById.get(currentId);
      if (!current) continue;

      const similarRecords = rankSimilarRecords(
        current,
        [...records],
        similarityContext,
        similarLimit,
        minSimilarScore,
      );

      for (const similarRecord of similarRecords) {
        addUndirectedEdge(edges, edgeKeys, currentId, similarRecord.id, 'similar', 1);

        if (!visited.has(similarRecord.id)) {
          visited.add(similarRecord.id);
          depths.set(similarRecord.id, 1);
          queue.push(similarRecord.id);
        }
      }
    }
  }

  const recordIds = [
    centerRecordId,
    ...[...visited].filter((recordId) => recordId !== centerRecordId),
  ];

  return { centerRecordId, recordIds, edges };
}
