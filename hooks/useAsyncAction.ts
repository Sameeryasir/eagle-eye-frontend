import { useCallback, useState } from 'react';
import { getErrorMessage } from '../services/api/errors';

export function useAsyncAction<TArgs extends any[], TResult>(
  action: (...args: TArgs) => Promise<TResult>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        return result;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [action]
  );

  return { run, loading, error, setError };
}
