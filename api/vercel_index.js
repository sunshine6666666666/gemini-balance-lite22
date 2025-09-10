import { handleRequest } from "../src/gemini-handler.js";

export const config = {
  runtime: 'edge' //告诉 Vercel 这是 Edge Function
};

export default async function handler(req) {
  // 🚫 过滤favicon和静态文件请求，避免消耗API配额
  const url = new URL(req.url);

  if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {

    return new Response('', { status: 404 });
  }

  // 过滤其他静态文件请求
  if (url.pathname.match(/\.(ico|png|jpg|jpeg|gif|css|js|svg|webp)$/)) {

    return new Response('Not Found', { status: 404 });
  }

  return handleRequest(req);
}