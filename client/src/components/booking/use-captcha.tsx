import { BASE_URL } from '@/utils/environment-util';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

const SITE_KEY = '6LfhkbUqAAAAALuFGJgvu_EaMxiaz-Lrxy-cCDai';

export const useCaptcha = () => {
  const [valid, setValid] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async (input: string) => {
      const response = await fetch(`${BASE_URL}/api/booking-request/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userResponse: input }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to verify captcha'));
      }

      return await response.json();
    },
    onError: error => {
      console.error(error);
      setValid(false);
    },
    onSuccess: data => {
      setValid(data.success);
    },
  });

  const onVerifyChange = useCallback(
    (value: string | null) => {
      if (value) {
        setValid(!!value);
        mutate(value);
      }
    },
    [mutate]
  );

  return {
    valid,
    setValid,
    onVerifyChange,
    isPending,
    SITE_KEY,
  };
};
