import { useCallback, useEffect, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { buildShareText, type ShareBriefTemplate } from '@/features/share-record';

import { fetchPublishedRecordStatus, publishRecord, unpublishRecord } from '../api/publishRecord';
import { computeShareContentHash } from '../lib/computeShareContentHash';
import {
  deletePublishedNoteStateByRecordId,
  getPublishedNoteState,
  upsertPublishedNoteState,
} from '../lib/publishedNoteStorage';
import type { PublishExpiryPreset, PublishedNoteState } from './types';

type PublishState = {
  current: PublishedNoteState | null;
  loading: boolean;
  stale: boolean;
};

export function usePublishRecord(record: VoiceRecord) {
  const [state, setState] = useState<PublishState>({ current: null, loading: false, stale: false });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const local = await getPublishedNoteState(record.id);
    if (!local) {
      setState({ current: null, loading: false, stale: false });
      return;
    }

    const remote = await fetchPublishedRecordStatus(record.id);
    if (remote.ok && remote.active) {
      const next: PublishedNoteState = {
        recordId: record.id,
        shareToken: remote.token,
        shareUrl: remote.url,
        template: remote.template,
        contentHash: remote.contentHash,
        publishedAt: remote.publishedAt,
        expiresAt: remote.expiresAt,
        updatedAt: new Date().toISOString(),
      };
      await upsertPublishedNoteState(next);
      setState({
        current: next,
        loading: false,
        stale: computeShareContentHash(buildShareText(record, next.template, { forEmail: true })) !== next.contentHash,
      });
      return;
    }

    if (remote.ok && !remote.active) {
      await deletePublishedNoteStateByRecordId(record.id);
    }

    setState({ current: local, loading: false, stale: false });
  }, [record]);

  useEffect(() => {
    void (async () => {
      const local = await getPublishedNoteState(record.id);
      if (!local) return;
      setState({
        current: local,
        loading: false,
        stale: computeShareContentHash(buildShareText(record, local.template, { forEmail: true })) !== local.contentHash,
      });
    })();
  }, [record]);

  const doPublish = useCallback(
    async (template: ShareBriefTemplate, expiresIn: PublishExpiryPreset) => {
      const markdown = buildShareText(record, template, { forEmail: true });
      const result = await publishRecord({
        recordId: record.id,
        title: record.title,
        template,
        markdown,
        expiresIn,
      });
      if (!result.ok) throw new Error(result.error);

      const next: PublishedNoteState = {
        recordId: record.id,
        shareToken: result.token,
        shareUrl: result.url,
        template: result.template,
        contentHash: result.contentHash,
        publishedAt: result.publishedAt,
        expiresAt: result.expiresAt,
        updatedAt: new Date().toISOString(),
      };
      await upsertPublishedNoteState(next);
      setState({ current: next, loading: false, stale: false });
      return next;
    },
    [record],
  );

  const doUnpublish = useCallback(async () => {
    const result = await unpublishRecord(record.id);
    if (!result.ok) throw new Error(result.error);
    await deletePublishedNoteStateByRecordId(record.id);
    setState({ current: null, loading: false, stale: false });
  }, [record.id]);

  return {
    published: state.current,
    publishLoading: state.loading,
    isStale: state.stale,
    publish: doPublish,
    unpublish: doUnpublish,
    refreshPublishStatus: refresh,
  };
}
