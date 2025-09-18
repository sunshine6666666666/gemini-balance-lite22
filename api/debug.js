export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    console.log(`Debug: ${req.method} ${url.pathname}`);
    
    if (req.method === 'GET') {
      return new Response('Debug endpoint working!', {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    if (req.method === 'POST') {
      const body = await req.text();
      console.log('Debug POST body:', body);
      
      return new Response(JSON.stringify({
        message: 'Debug POST working',
        receivedBody: body,
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Method not allowed', { status: 405 });
    
  } catch (error) {
    console.error('Debug error:', error);
    return new Response(`Debug error: ${error.message}`, { status: 500 });
  }
}
