import { createApp } from '../server.js';

export const config = {
  runtime: 'nodejs',
};

let appPromise;

const getApp = () => {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
};

export default async function handler(req, res) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (error) {
    console.error('Vercel function handler error:', error);
    res.status(500).json({ error: 'Server initialization failed' });
  }
}
