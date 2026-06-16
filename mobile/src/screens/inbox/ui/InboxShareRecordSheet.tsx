import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { usePublishRecord } from '@/features/publish-record';
import type { ShareBriefTemplate, ShareRecordExportFormat } from '@/features/share-record';
import { ShareRecordSheet } from '@/screens/recording-detail/ui/ShareRecordSheet';
import { hapticError, hapticSuccess } from '@/shared/lib';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';

type InboxShareRecordSheetBaseProps = {
  visible: boolean;
  hasAudio: boolean;
  isMeeting: boolean;
  showSpeakerTurnsExport: boolean;
  isSendingEmail: boolean;
  onClose: () => void;
  onShareText: (
    template: ShareBriefTemplate,
    format: ShareRecordExportFormat,
  ) => Promise<void> | void;
  onEmailRecord: (
    email: string,
    template: ShareBriefTemplate,
    format: ShareRecordExportFormat,
  ) => void;
  onShareAudio: () => void;
};

type InboxShareRecordSheetProps = InboxShareRecordSheetBaseProps & {
  record: VoiceRecord | null;
  onPublishStateChanged?: (recordId: string, active: boolean, expiresAt: string | null) => void;
};

function InboxShareRecordSheetWithPublish({
  record,
  onPublishStateChanged,
  ...sheetProps
}: InboxShareRecordSheetBaseProps & {
  record: VoiceRecord;
  onPublishStateChanged?: (recordId: string, active: boolean, expiresAt: string | null) => void;
}) {
  const { t } = useTranslation();
  const { published, isStale, publishLoading, publish, unpublish, refreshPublishStatus } =
    usePublishRecord(record);

  const handlePublishRecord = useCallback(
    (template: ShareBriefTemplate, expiresIn: '1d' | '7d' | '30d' | 'never') => {
      publish(template, expiresIn)
        .then((next) => {
          hapticSuccess();
          onPublishStateChanged?.(record.id, true, next.expiresAt);
          Alert.alert(t('share.publishSuccessTitle'), t('share.publishSuccessBody'));
        })
        .catch((err: unknown) => {
          hapticError();
          Alert.alert(t('share.publishFailedTitle'), toUserFacingFetchErrorFromUnknown(err));
        });
    },
    [onPublishStateChanged, publish, record.id, t],
  );

  const handleUnpublishRecord = useCallback(() => {
    unpublish()
      .then(() => {
        hapticSuccess();
        onPublishStateChanged?.(record.id, false, null);
        Alert.alert(t('share.publishUnpublishedTitle'), t('share.publishUnpublishedBody'));
      })
      .catch((err: unknown) => {
        hapticError();
        Alert.alert(t('share.publishFailedTitle'), toUserFacingFetchErrorFromUnknown(err));
      });
  }, [onPublishStateChanged, record.id, t, unpublish]);

  const handleSharePublishedLink = useCallback((url: string) => {
    Share.share({ message: url, url }).catch(() => {});
  }, []);

  return (
    <ShareRecordSheet
      {...sheetProps}
      publishState={{
        active: Boolean(published),
        url: published?.shareUrl,
        expiresAt: published?.expiresAt ?? null,
        stale: isStale,
      }}
      isPublishing={publishLoading}
      onPublishRecord={handlePublishRecord}
      onUnpublishRecord={handleUnpublishRecord}
      onRefreshPublishStatus={refreshPublishStatus}
      onSharePublishedLink={handleSharePublishedLink}
    />
  );
}

export function InboxShareRecordSheet({
  record,
  onPublishStateChanged,
  ...sheetProps
}: InboxShareRecordSheetProps) {
  if (!record) {
    return <ShareRecordSheet {...sheetProps} />;
  }

  return (
    <InboxShareRecordSheetWithPublish
      record={record}
      onPublishStateChanged={onPublishStateChanged}
      {...sheetProps}
    />
  );
}
