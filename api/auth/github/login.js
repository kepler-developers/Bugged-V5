// githubLogin.js
/**
 * @function onRequest
 * @description GitHub OAuth 登录入口，重定向到 GitHub 授权页
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - EdgeOne注入的环境变量
 */
export async function onRequest({ request, env }) {
  try {
    // 强制使用环境变量，如果没有则返回错误
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('GitHub CLIENT_ID not configured');
      return new Response(JSON.stringify({
        success: false,
        message: 'GitHub登录未配置，请联系管理员'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 动态生成回调地址
    const baseUrl = new URL(request.url).origin;
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/github/callback`);
    
    // 生成state参数用于CSRF保护
    const state = Math.random().toString(36).substring(2);
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;

    console.log('Redirecting to GitHub:', githubAuthUrl);
    return Response.redirect(githubAuthUrl, 302);
  } catch (error) {
    console.error('GitHub login error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'GitHub登录初始化失败: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
