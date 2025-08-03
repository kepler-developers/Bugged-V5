// ä¸´æ—¶å†…å­˜å­˜å‚¨ï¼ˆç”¨äºŽ KV å­˜å‚¨æœªç”³è¯·æ—¶çš„æµ‹è¯•ï¼‰
/**
 * @function onRequest
 * @description EdgeOne Pages äº‘å‡½æ•°ä¸»å…¥å£ï¼Œå¤„ç†è®¤è¯/ç™»å½•/æ³¨å†Œç›¸å…³APIã€‚
 * @param {Request} request - HTTPè¯·æ±‚å¯¹è±¡
 * @param {Object} env - EdgeOneæ³¨å…¥çš„çŽ¯å¢ƒå˜é‡ï¼ˆKVã€COSç­‰ï¼‰
 */
export async function onRequest({ request, env }) {
  const { pathname } = new URL(request.url);
  
  // å¤„ç† CORS é¢„æ£€è¯·æ±‚
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

const tempStorage = {
  users: new Map(),
  codes: new Map()
};

// æ·»åŠ æµ‹è¯•ç”¨æˆ·æ•°æ®
tempStorage.users.set('admin', {
  username: 'admin',
  email: 'admin@test.com',
  password: 'admin123',
  bio: 'ç®¡ç†å‘˜è´¦å·'
});

tempStorage.users.set('test', {
  username: 'test',
  email: 'test@test.com',
  password: 'test123',
  bio: 'æµ‹è¯•è´¦å·'
});

tempStorage.users.set('user', {
  username: 'user',
  email: 'user@test.com',
  password: 'user123',
  bio: 'æ™®é€šç”¨æˆ·è´¦å·'
});

  
  // é‚®ä»¶å‘é€å‡½æ•°
  async function sendEmail(to, subject, content) {
    // ä¼˜å…ˆä½¿ç”¨ SendGrid
    if (env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: env.SENDGRID_FROM_EMAIL },
            subject: subject,
            content: [{ type: 'text/html', value: content }],
          }),
        });
        
        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        console.error('SendGrid error:', error);
      }
    }
    
    // å¤‡ç”¨æ–¹æ¡ˆï¼šResend
    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL,
            to: [to],
            subject: subject,
            html: content,
          }),
        });
        
        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        console.error('Resend error:', error);
      }
    }
    
    return { success: false, error: 'No email service configured' };
  }
  
  if (pathname === '/api/login' && request.method === 'POST') {
    try {
      const { username, password } = await request.json();
      
      // ä¼˜å…ˆä»Žä¸´æ—¶å­˜å‚¨èŽ·å–ç”¨æˆ·ä¿¡æ¯ï¼ˆæµ‹è¯•è´¦å·ï¼‰
      let user = tempStorage.users.get(username);
      
      // å¦‚æžœä¸´æ—¶å­˜å‚¨ä¸­æ²¡æœ‰ï¼Œå°è¯•ä»Ž KV èŽ·å–
      if (!user && env.bugdex_kv) {
        const userKey = `user:${username}`;
        user = await env.bugdex_kv.get(userKey, { type: 'json' });
      }
      
      if (user && user.password === password) {
        // æ”¹è¿›JWT tokenç”Ÿæˆï¼ˆç®€åŒ–ç‰ˆï¼Œç”Ÿäº§çŽ¯å¢ƒåº”ä½¿ç”¨çœŸæ­£çš„JWTåº“ï¼‰
        const payload = { 
          username, 
          exp: Date.now() + 86400000,
          iat: Date.now(),
          iss: 'bugdex-forum'
        };
        const token = btoa(JSON.stringify(payload)) + '.' + btoa(Date.now().toString());
        
        return new Response(JSON.stringify({
          success: true,
          token,
          user: { username: user.username, bio: user.bio }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        message: 'ç”¨æˆ·åæˆ–å¯†ç é”™è¯¯'
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: 'è¯·æ±‚æ ¼å¼é”™è¯¯'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/register' && request.method === 'POST') {
    try {
      const { username, email, password, code } = await request.json();
      
      // éªŒè¯é‚®ç®±éªŒè¯ç 
      let codeData = tempStorage.codes.get(email);
      
      // å¦‚æžœä¸´æ—¶å­˜å‚¨ä¸­æ²¡æœ‰ï¼Œå°è¯•ä»Ž KV èŽ·å–
      if (!codeData && env.bugdex_kv) {
        const codeKey = `email_code:${email}`;
        codeData = await env.bugdex_kv.get(codeKey, { type: 'json' });
      }
      
      if (!codeData || codeData.code !== code) {
        return new Response(JSON.stringify({
          success: false,
          message: 'éªŒè¯ç é”™è¯¯æˆ–å·²è¿‡æœŸ'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // æ£€æŸ¥éªŒè¯ç æ˜¯å¦è¿‡æœŸï¼ˆ5åˆ†é’Ÿï¼‰
      if (Date.now() > codeData.expires_at) {
        return new Response(JSON.stringify({
          success: false,
          message: 'éªŒè¯ç å·²è¿‡æœŸ'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // æ£€æŸ¥ç”¨æˆ·æ˜¯å¦å·²å­˜åœ¨
      let existingUser = tempStorage.users.get(username);
      
      // å¦‚æžœä¸´æ—¶å­˜å‚¨ä¸­æ²¡æœ‰ï¼Œå°è¯•ä»Ž KV èŽ·å–
      if (!existingUser && env.bugdex_kv) {
        const userKey = `user:${username}`;
        existingUser = await env.bugdex_kv.get(userKey);
      }
      
      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          message: 'ç”¨æˆ·åå·²å­˜åœ¨'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // ä¿å­˜ç”¨æˆ·ä¿¡æ¯
      const userData = {
        username,
        email,
        password,
        bio: 'è¿™æ˜¯ä½ çš„ä¸ªäººç®€ä»‹ï¼Œå¯ä»¥åœ¨"ç”¨æˆ·ä¸­å¿ƒ"ç¼–è¾‘ã€‚',
        created_at: new Date().toISOString()
      };
      
      // ä¼˜å…ˆä¿å­˜åˆ°ä¸´æ—¶å­˜å‚¨
      tempStorage.users.set(username, userData);
      
      // å¦‚æžœ KV å¯ç”¨ï¼Œä¹Ÿä¿å­˜åˆ° KV
      if (env.bugdex_kv) {
        const userKey = `user:${username}`;
        await env.bugdex_kv.put(userKey, JSON.stringify(userData));
      }
      
      // åˆ é™¤å·²ä½¿ç”¨çš„éªŒè¯ç 
      tempStorage.codes.delete(email);
      if (env.bugdex_kv) {
        const codeKey = `email_code:${email}`;
        await env.bugdex_kv.delete(codeKey);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'æ³¨å†ŒæˆåŠŸ'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: 'æ³¨å†Œå¤±è´¥'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/send_email_code' && request.method === 'POST') {
    try {
      const { email } = await request.json();
      
      // ç”ŸæˆéªŒè¯ç 
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // ä¿å­˜éªŒè¯ç åˆ°ä¸´æ—¶å­˜å‚¨
      const codeData = {
        code,
        created_at: Date.now(),
        expires_at: Date.now() + 300000 // 5åˆ†é’Ÿè¿‡æœŸ
      };
      
      tempStorage.codes.set(email, codeData);
      
      // å¦‚æžœ KV å¯ç”¨ï¼Œä¹Ÿä¿å­˜åˆ° KV
      if (env.bugdex_kv) {
        await env.bugdex_kv.put(`email_code:${email}`, JSON.stringify(codeData));
      }
      
      // å‘é€é‚®ä»¶
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">BugDex éªŒè¯ç </h2>
          <p>æ‚¨å¥½ï¼</p>
          <p>æ‚¨çš„éªŒè¯ç æ˜¯ï¼š</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">
            ${code}
          </div>
          <p>éªŒè¯ç æœ‰æ•ˆæœŸä¸º 5 åˆ†é’Ÿï¼Œè¯·å°½å¿«ä½¿ç”¨ã€‚</p>
          <p>å¦‚æžœè¿™ä¸æ˜¯æ‚¨çš„æ“ä½œï¼Œè¯·å¿½ç•¥æ­¤é‚®ä»¶ã€‚</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">æ­¤é‚®ä»¶ç”± BugDex è®ºå›ç³»ç»Ÿè‡ªåŠ¨å‘é€</p>
        </div>
      `;
      
      const emailResult = await sendEmail(email, 'BugDex éªŒè¯ç ', emailContent);
      
      if (emailResult.success) {
        return new Response(JSON.stringify({
          success: true,
          message: 'éªŒè¯ç å·²å‘é€åˆ°æ‚¨çš„é‚®ç®±'
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        // å¦‚æžœé‚®ä»¶å‘é€å¤±è´¥ï¼Œè¿”å›žæ¨¡æ‹ŸæˆåŠŸï¼ˆå¼€å‘é˜¶æ®µï¼‰
        return new Response(JSON.stringify({
          success: true,
          message: 'éªŒè¯ç å·²å‘é€ï¼ˆæ¨¡æ‹Ÿï¼‰',
          debug: 'é‚®ä»¶æœåŠ¡æœªé…ç½®ï¼Œä½¿ç”¨æ¨¡æ‹Ÿå‘é€',
          code: code // ä¸´æ—¶æ˜¾ç¤ºéªŒè¯ç ç”¨äºŽæµ‹è¯•
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: 'å‘é€éªŒè¯ç å¤±è´¥'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  return new Response(JSON.stringify({
    success: false,
    message: 'æŽ¥å£ä¸å­˜åœ¨'
  }), {
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
