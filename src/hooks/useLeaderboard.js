import { useState, useEffect, useCallback } from 'react';
import { GAS_URL } from '../game/constants.js';

export function useLeaderboard() {
  const [scores, setScores] = useState([]);
  const [ready, setReady] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(GAS_URL + '?action=get');
      const data = await r.json();
      setScores(data);
      setReady(true);
    } catch {
      setReady(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const submit = useCallback(async (name, score) => {
    const playerId = localStorage.getItem('sn_id');
    try {
      await fetch(GAS_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score, id: playerId }),
      });
      setTimeout(fetch_, 2000);
    } catch {}
  }, [fetch_]);

  return { scores, ready, submit, refresh: fetch_ };
}
