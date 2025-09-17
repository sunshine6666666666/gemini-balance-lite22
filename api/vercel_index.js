import { handleRequest } from "../src/gemini-proxy.js";

export const config = {
  runtime: 'edge' //告诉 Vercel 这是 Edge Function
};

export default async function handler(req) {
  // 🚫 过滤favicon和静态文件请求，避免消耗API配额
  const url = new URL(req.url);
  console.log(`📥 收到请求: ${req.method} ${url.pathname}`);

  if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {
    console.log(`🚫 拦截favicon请求: ${url.pathname} - 返回404避免API调用`);
    return new Response('', { status: 404 });
  }

  // 过滤其他静态文件请求
  if (url.pathname.match(/\.(ico|png|jpg|jpeg|gif|css|js|svg|webp)$/)) {
    console.log(`🚫 拦截静态文件请求: ${url.pathname} - 返回404避免API调用`);
    return new Response('Not Found', { status: 404 });
  }

  console.log(`✅ 处理API请求: ${req.method} ${url.pathname}`);
  return handleRequest(req);
}