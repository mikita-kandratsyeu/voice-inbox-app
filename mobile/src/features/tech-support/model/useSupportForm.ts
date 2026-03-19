import { useCallback, useState } from 'react';

import { submitSupportIssue } from '../api/submitSupportIssue';
import { collectSupportDiagnostics } from '../lib/collectSupportDiagnostics';

const MESSAGE_MIN = 10;

export function useSupportForm() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [appLogs, setAppLogs] = useState('');
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
      const result = await submitSupportIssue({
        email,
        subject,
        message: trimmed,
        appLogs,
        diagnostics,
      });

      if (result.ok) {
        setSuccessId(result.id);
        setMessage('');
        setAppLogs('');
        setSubject('');
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [appLogs, email, message, subject]);

  return {
    email,
    setEmail,
    subject,
    setSubject,
    message,
    setMessage,
    appLogs,
    setAppLogs,
    loading,
    error,
    successId,
    submit,
    reset,
    messageMin: MESSAGE_MIN,
  };
}
