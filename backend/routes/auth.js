import { Router } from 'express';
import { SITES } from '../auth/sites.js';
import { checkStatus, clearState } from '../auth/session-store.js';

export const authRouter = Router();

// 所有站別的 session 狀態
authRouter.get('/status', async (req, res, next) => {
  try {
    const results = await Promise.all(
      Object.keys(SITES).map(async (id) => {
        const s = await checkStatus(id);
        return { ...s, label: SITES[id].label };
      })
    );
    res.json({ data: results });
  } catch (err) { next(err); }
});

// 登出（僅刪本地 session 檔）
authRouter.delete('/session/:site', async (req, res, next) => {
  try {
    if (!SITES[req.params.site]) return res.status(404).json({ error: 'unknown_site' });
    await clearState(req.params.site);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
});
