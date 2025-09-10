import { handleRequest } from "../src/gemini-handler.js";

export const config = {
  runtime: 'edge' //告诉 Vercel 这是 Edge Function
};

export default async function handler(req) {
  // 添加基本的请求日志
  console.log(`[VERCEL_INDEX] 收到请求: ${req.method} ${req.url}`);

  // 🚫 过滤favicon和静态文件请求，避免消耗API配额
  const url = new URL(req.url);
  console.log(`[VERCEL_INDEX] 解析路径: ${url.pathname}`);

  if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {
    console.log(`[VERCEL_INDEX] 拦截favicon请求`);
    return new Response('', { status: 404 });
  }

  // 过滤其他静态文件请求
  if (url.pathname.match(/\.(ico|png|jpg|jpeg|gif|css|js|svg|webp)$/)) {
    console.log(`[VERCEL_INDEX] 拦截静态文件请求`);
    return new Response('Not Found', { status: 404 });
  }

  console.log(`[VERCEL_INDEX] 路由到主处理器`);
  return handleRequest(req);
}