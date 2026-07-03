import { createApp } from '../server.js';

let appPromise;

const getApp = () => {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
};

export default async function handler(req, res) {
  const app = await getApp();
  app(req, res);
}
