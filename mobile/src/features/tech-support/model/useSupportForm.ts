import { useCallback, useEffect, useState } from 'react';

import { readAppLogTail } from '@/shared/lib/appLogger';

import { submitSupportIssue } from '../api/submitSupportIssue';
import { collectSupportDiagnostics } from '../lib/collectSupportDiagnostics';

const MESSAGE_MIN = 10;

export function useSupportForm() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [appLogs, setAppLogs] = useState('');
  const [attachLogs, setAttachLogs] = useState(false);
  const [attachLogsLoading, setAttachLogsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setSuccessId(null);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setSuccessId(null);

    const trimmed = message.trim();
    if (trimmed.length < MESSAGE_MIN) {
      setError('message_too_short');
      return;
    }

    setLoading(true);
    try {
      const diagnostics = await collectSupportDiagnostics();
      const logsToSend = attachLogs ? await readAppLogTail(30_000) : appLogs;
      const result = await submitSupportIssue({
        email,
        subject,
        message: trimmed,
        appLogs: logsToSend,
        diagnostics,
      });

      if (result.ok) {
        setSuccessId(result.reference);
        setMessage('');
        setAppLogs('');
        setSubject('');
        setAttachLogs(false);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [appLogs, attachLogs, email, message, subject]);

  useEffect(() => {
    if (!attachLogs) {
      return;
    }

    let canceled = false;
    setAttachLogsLoading(true);

    void (async () => {
      try {
        const tail = await readAppLogTail(32_000);
        if (!canceled) {
          setAppLogs(tail);
        }
      } finally {
        if (!canceled) {
          setAttachLogsLoading(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [attachLogs]);

  return {
    email,
    setEmail,
    subject,
    setSubject,
    message,
    setMessage,
    appLogs,
    setAppLogs,
    attachLogs,
    setAttachLogs,
    attachLogsLoading,
    loading,
    error,
    successId,
    submit,
    reset,
    messageMin: MESSAGE_MIN,
  };
}
