import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { buildShareText, type ShareBriefTemplate } from '@/features/share-record';

import { fetchPublishedRecordStatus, publishRecord, unpublishRecord } from '../api/publishRecord';
import { isPublishContentStale } from '../lib/isPublishContentStale';
import {
  deletePublishedNoteStateByRecordId,
  getPublishedNoteState,
  upsertPublishedNoteState,
} from '../lib/publishedNoteStorage';
import { sharePublishedNoteLink } from '../lib/sharePublishedNoteLink';
import { notifyPublishedNoteInboxChanged } from './publishedNoteInboxSync';
import type { PublishedNoteState, PublishExpiryPreset } from './types';

type PublishState = {
  current: PublishedNoteState | null;
  loading: boolean;
  stale: boolean;
};

export function usePublishRecord(record: VoiceRecord) {
  const [state, setState] = useState<PublishState>({ current: null, loading: false, stale: false });
  const publishInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const local = await getPublishedNoteState(record.id);
      if (!local) {
        setState((prev) => ({ ...prev, current: null, stale: false }));
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
        setState((prev) => ({
          ...prev,
          current: next,
          stale: isPublishContentStale(record, next),
        }));
        notifyPublishedNoteInboxChanged();
        return;
      }

      if (remote.ok && !remote.active) {
        await deletePublishedNoteStateByRecordId(record.id);
        setState((prev) => ({ ...prev, current: null, stale: false }));
        notifyPublishedNoteInboxChanged();
        return;
      }

      setState((prev) => ({ ...prev, current: local, stale: false }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [record]);

  useEffect(() => {
    void (async () => {
      const local = await getPublishedNoteState(record.id);
      if (!local) return;
      setState({
        current: local,
        loading: false,
        stale: isPublishContentStale(record, local),
      });
    })();
  }, [record]);

  const doPublish = useCallback(
    async (template: ShareBriefTemplate, expiresIn: PublishExpiryPreset) => {
      if (publishInFlightRef.current) return;
      publishInFlightRef.current = true;
      setState((prev) => ({ ...prev, loading: true }));
      try {
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
        notifyPublishedNoteInboxChanged();
        return next;
      } catch (error) {
        setState((prev) => ({ ...prev, loading: false }));
        throw error;
      } finally {
        publishInFlightRef.current = false;
      }
    },
    [record],
  );

  const doUnpublish = useCallback(async () => {
    if (publishInFlightRef.current) return;
    publishInFlightRef.current = true;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const result = await unpublishRecord(record.id);
      if (!result.ok) throw new Error(result.error);
      await deletePublishedNoteStateByRecordId(record.id);
      setState({ current: null, loading: false, stale: false });
      notifyPublishedNoteInboxChanged();
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }));
      throw error;
    } finally {
      publishInFlightRef.current = false;
    }
  }, [record.id]);

  const shareLink = useCallback(
    async (title: string) => {
      await refresh();
      const local = await getPublishedNoteState(record.id);
      const url = local?.shareUrl?.trim();
      if (!url) return;
      await sharePublishedNoteLink({
        url,
        title,
        expiresAt: local?.expiresAt ?? null,
      });
    },
    [record.id, refresh],
  );

  return {
    published: state.current,
    publishLoading: state.loading,
    isStale: state.stale,
    publish: doPublish,
    unpublish: doUnpublish,
    refreshPublishStatus: refresh,
    shareLink,
  };
}
