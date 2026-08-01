import { Router } from 'express';
import * as jmty from '../actions/jimoty.js';
import { AuthError } from '../actions/jimoty.js';

export const jimotyRouter = Router();

function handleErr(res, next, err) {
  if (err instanceof AuthError) {
    return res.status(401).json({ error: err.code, message: err.message });
  }
  next(err);
}

jimotyRouter.get('/favorites', async (req, res, next) => {
  try {
    const items = await jmty.listFavorites();
    res.json({ data: items });
  } catch (err) { handleErr(res, next, err); }
});

jimotyRouter.get('/messages', async (req, res, next) => {
  try {
    const threads = await jmty.listThreads();
    res.json({ data: threads });
  } catch (err) { handleErr(res, next, err); }
});

jimotyRouter.get('/messages/:id', async (req, res, next) => {
  try {
    const thread = await jmty.getThread(req.params.id);
    res.json({ data: thread });
  } catch (err) { handleErr(res, next, err); }
});

jimotyRouter.post('/messages/:id/reply', async (req, res, next) => {
  try {
    const body = req.body?.body || req.body?.message || '';
    const r = await jmty.replyThread(req.params.id, body);
    res.json({ data: r });
  } catch (err) { handleErr(res, next, err); }
});

// debug：讓前端能看 raw HTML preview（parser 沒抓對時 fallback）
jimotyRouter.get('/raw', async (req, res, next) => {
  try {
    const path = req.query.path || '/my/favorite_article_references';
    const data = await jmty.fetchRaw(path);
    res.json({ data });
  } catch (err) { handleErr(res, next, err); }
});
