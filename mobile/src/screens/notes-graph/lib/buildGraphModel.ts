import type { VoiceRecord } from '@/entities/record';
import {
  buildSimilarityContext,
  computeRecordSimilarity,
  MIN_HYBRID_SCORE,
  MIN_LEXICAL_ONLY_SCORE,
  shouldPrefilterSimilarityPair,
} from '@/features/related-notes/lib/computeRecordSimilarity';

import { similarEdgeLayoutWeight } from './graphEdgeWeight';
import { graphNodeSearchText } from './graphNodeSearchText';
import type { GraphEdge, GraphFilters, GraphModel, GraphNode } from './graphTypes';
import { recordNodeId, taskNodeId } from './graphTypes';

export const MAX_RECORDS_FOR_SIMILAR_EDGES = 100;
const MAX_SIMILAR_EDGES_PER_RECORD = 3;
const MAX_TAG_EDGES_PER_RECORD = 5;
const MAX_FOLDER_MESH_SIZE = 20;

function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

function filterRecords(records: VoiceRecord[], filters: GraphFilters): VoiceRecord[] {
  let result = records;

  if (filters.folderIds.length > 0) {
    const wanted = new Set(filters.folderIds);
    result = result.filter((r) => r.folderId != null && wanted.has(r.folderId));
  }

  if (filters.tags.length > 0) {
    const wanted = new Set(filters.tags.map(normalizeTag));
    result = result.filter((r) => (r.tags ?? []).some((tag) => wanted.has(normalizeTag(tag))));
  }

  if (!filters.showArchived) {
    result = result.filter((r) => r.status !== 'archived');
  }

  return result;
}

export function countFilteredGraphRecords(
  allRecords: VoiceRecord[],
  filters: GraphFilters,
): number {
  return filterRecords(allRecords, filters).length;
}

export function countGraphNodes(allRecords: VoiceRecord[], filters: GraphFilters): number {
  const filtered = filterRecords(allRecords, filters);
  let count = filtered.length;

  if (filters.showTasks) {
    for (const record of filtered) {
      if (filters.showCompletedTasks) {
        count += record.tasks?.length ?? 0;
      } else {
        count += record.tasks?.filter((task) => !task.isDone).length ?? 0;
      }
    }
  }

  return count;
}

function addSimilarEdges(records: VoiceRecord[], edges: GraphEdge[]): void {
  if (records.length === 0) return;

  const context = buildSimilarityContext(records);
  const minScore = context.useEmbeddings ? MIN_HYBRID_SCORE : MIN_LEXICAL_ONLY_SCORE;
  const edgeCountByRecord = new Map<string, number>();
  const addedPairs = new Set<string>();

  const maxRecordsForSimilarity = Math.min(records.length, 80);
  const recordsToProcess = records.slice(0, maxRecordsForSimilarity);

  for (const current of recordsToProcess) {
    const candidates = records.filter(
      (other) => other.id !== current.id && shouldPrefilterSimilarityPair(current, other),
    );

    const scored = candidates
      .map((other) => ({
        other,
        score: computeRecordSimilarity(current, other, context),
      }))
      .filter(({ score }) => score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SIMILAR_EDGES_PER_RECORD);

    for (const { other, score } of scored) {
      const pairKey = [current.id, other.id].sort().join('|');
      if (addedPairs.has(pairKey)) continue;

      const currentCount = edgeCountByRecord.get(current.id) ?? 0;
      const otherCount = edgeCountByRecord.get(other.id) ?? 0;
      if (currentCount >= MAX_SIMILAR_EDGES_PER_RECORD) break;
      if (otherCount >= MAX_SIMILAR_EDGES_PER_RECORD) continue;

      addedPairs.add(pairKey);
      edgeCountByRecord.set(current.id, currentCount + 1);
      edgeCountByRecord.set(other.id, otherCount + 1);

      edges.push({
        id: `similar:${pairKey}`,
        kind: 'similar',
        sourceId: recordNodeId(current.id),
        targetId: recordNodeId(other.id),
        weight: similarEdgeLayoutWeight(score, minScore),
      });
    }
  }
}

function addSharedTagEdges(records: VoiceRecord[], edges: GraphEdge[]): void {
  const tagToRecords = new Map<string, VoiceRecord[]>();

  for (const record of records) {
    for (const tag of record.tags ?? []) {
      const key = normalizeTag(tag);
      if (!key) continue;
      const list = tagToRecords.get(key) ?? [];
      list.push(record);
      tagToRecords.set(key, list);
    }
  }

  const edgeCountByRecord = new Map<string, number>();
  const addedPairs = new Set<string>();

  for (const [tag, taggedRecords] of tagToRecords) {
    if (taggedRecords.length < 2) continue;

    const maxPairsForTag = Math.min(taggedRecords.length, 50);
    for (let i = 0; i < maxPairsForTag; i++) {
      for (let j = i + 1; j < maxPairsForTag; j++) {
        const a = taggedRecords[i]!;
        const b = taggedRecords[j]!;
        const pairKey = [a.id, b.id].sort().join('|');
        if (addedPairs.has(pairKey)) continue;

        const aCount = edgeCountByRecord.get(a.id) ?? 0;
        const bCount = edgeCountByRecord.get(b.id) ?? 0;
        if (aCount >= MAX_TAG_EDGES_PER_RECORD || bCount >= MAX_TAG_EDGES_PER_RECORD) continue;

        addedPairs.add(pairKey);
        edgeCountByRecord.set(a.id, aCount + 1);
        edgeCountByRecord.set(b.id, bCount + 1);

        edges.push({
          id: `tag:${tag}:${pairKey}`,
          kind: 'sharedTag',
          sourceId: recordNodeId(a.id),
          targetId: recordNodeId(b.id),
          label: tag,
        });
      }
    }
  }
}

function pickFolderHub(records: VoiceRecord[]): VoiceRecord {
  return records.reduce((best, record) => {
    const bestScore = (best.linkedRecordIds?.length ?? 0) + (best.tags?.length ?? 0);
    const recordScore = (record.linkedRecordIds?.length ?? 0) + (record.tags?.length ?? 0);
    if (recordScore > bestScore) return record;
    if (recordScore < bestScore) return best;
    return record.id.localeCompare(best.id) < 0 ? record : best;
  });
}

function addSameFolderEdges(records: VoiceRecord[], edges: GraphEdge[]): void {
  const folderGroups = new Map<string, VoiceRecord[]>();

  for (const record of records) {
    if (!record.folderId) continue;
    const list = folderGroups.get(record.folderId) ?? [];
    list.push(record);
    folderGroups.set(record.folderId, list);
  }

  const addedPairs = new Set<string>();

  for (const group of folderGroups.values()) {
    if (group.length < 2) continue;

    if (group.length > MAX_FOLDER_MESH_SIZE) {
      const hub = pickFolderHub(group);
      const hubNodeId = recordNodeId(hub.id);

      for (const record of group) {
        if (record.id === hub.id) continue;
        const pairKey = [hub.id, record.id].sort().join('|');
        if (addedPairs.has(pairKey)) continue;
        addedPairs.add(pairKey);

        edges.push({
          id: `folder:${pairKey}`,
          kind: 'sameFolder',
          sourceId: hubNodeId,
          targetId: recordNodeId(record.id),
        });
      }
      continue;
    }

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        const pairKey = [a.id, b.id].sort().join('|');
        if (addedPairs.has(pairKey)) continue;
        addedPairs.add(pairKey);

        edges.push({
          id: `folder:${pairKey}`,
          kind: 'sameFolder',
          sourceId: recordNodeId(a.id),
          targetId: recordNodeId(b.id),
        });
      }
    }
  }
}

function addLinkedEdges(records: VoiceRecord[], edges: GraphEdge[]): void {
  const idSet = new Set(records.map((record) => record.id));
  const addedPairs = new Set<string>();

  for (const record of records) {
    for (const targetId of record.linkedRecordIds ?? []) {
      if (!idSet.has(targetId) || targetId === record.id) continue;

      const pairKey = [record.id, targetId].sort().join('|');
      if (addedPairs.has(pairKey)) continue;
      addedPairs.add(pairKey);

      edges.push({
        id: `linked:${pairKey}`,
        kind: 'linked',
        sourceId: recordNodeId(record.id),
        targetId: recordNodeId(targetId),
      });
    }
  }
}

export function buildGraphModel(allRecords: VoiceRecord[], filters: GraphFilters): GraphModel {
  const filtered = filterRecords(allRecords, filters);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const record of filtered) {
    const recordNode: GraphNode = {
      id: recordNodeId(record.id),
      kind: 'record',
      x: 0,
      y: 0,
      searchText: graphNodeSearchText({ kind: 'record', record }),
      record,
    };
    nodes.push(recordNode);

    if (filters.showTasks) {
      for (const task of record.tasks ?? []) {
        if (!filters.showCompletedTasks && task.isDone) {
          continue;
        }

        const nodeId = taskNodeId(record.id, task.id);
        nodes.push({
          id: nodeId,
          kind: 'task',
          x: 0,
          y: 0,
          searchText: graphNodeSearchText({ kind: 'task', task }),
          task,
          parentRecordId: record.id,
        });

        if (filters.edgeVisibility.contains) {
          edges.push({
            id: `contains:${nodeId}`,
            kind: 'contains',
            sourceId: recordNodeId(record.id),
            targetId: nodeId,
          });
        }
      }
    }
  }

  if (filters.edgeVisibility.similar && filtered.length <= MAX_RECORDS_FOR_SIMILAR_EDGES) {
    addSimilarEdges(filtered, edges);
  }
  if (filters.edgeVisibility.sharedTag) {
    addSharedTagEdges(filtered, edges);
  }
  if (filters.edgeVisibility.sameFolder) {
    addSameFolderEdges(filtered, edges);
  }
  if (filters.edgeVisibility.linked) {
    addLinkedEdges(filtered, edges);
  }

  return {
    nodes,
    edges,
    recordCount: filtered.length,
  };
}

export function collectUniqueTags(records: VoiceRecord[]): string[] {
  const tags = new Set<string>();
  for (const record of records) {
    for (const tag of record.tags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
