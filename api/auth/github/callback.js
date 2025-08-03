// githubCallback.js
/**
 * @function onRequest
 * @description GitHub OAuth 回调处理，获取用户信息并完成登录
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - EdgeOne注入的环境变量
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // 强制使用环境变量
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('GitHub OAuth not configured');
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

  if (!code) {
    console.error('No authorization code received');
    return new Response(JSON.stringify({
      success: false,
      message: 'GitHub授权失败，未收到授权码'
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  

  try {
    console.log('Exchanging code for token...');
    
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });
    
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenRes.status} ${errorText}`);
    }
    
    const tokenData = await tokenRes.json();
    console.log('Token response:', tokenData);
    
    if (tokenData.error) {
      throw new Error(`GitHub error: ${tokenData.error_description || tokenData.error}`);
    }
    
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('No access token received from GitHub');
    }

    console.log('Fetching GitHub user info...');
    
    // 2. Fetch GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'BugDex-Forum',
        'Accept': 'application/vnd.github.v3+json'
      },
    });
    
    if (!userRes.ok) {
      const errorText = await userRes.text();
      console.error('Failed to fetch GitHub user:', errorText);
      throw new Error(`Failed to fetch GitHub user: ${userRes.status} ${errorText}`);
    }
    
    const githubUser = await userRes.json();
    console.log('GitHub user:', githubUser);

    if (!githubUser || !githubUser.login) {
      throw new Error('Invalid GitHub user data received');
    }

    // 3. Check or create user in KV storage
    const username = `gh_${githubUser.login}`;
    let user = null;
    
    if (env.bugdexKV) {
      const userKey = `user:${username}`;
      user = await env.bugdexKV.get(userKey, { type: 'json' });
    }
    
    if (!user) {
      user = {
        username,
        email: githubUser.email || `${githubUser.login}@github.local`,
        bio: githubUser.bio || `GitHub用户 ${githubUser.login}`,
        avatar_url: githubUser.avatar_url,
        github_id: githubUser.id,
        created_at: new Date().toISOString()
      };
    } else {
      // 更新现有用户信息
      user.avatar_url = githubUser.avatar_url;
      user.bio = githubUser.bio || user.bio;
    }
    
    // 保存用户信息到KV
    if (env.bugdexKV) {
      const userKey = `user:${username}`;
      await env.bugdexKV.put(userKey, JSON.stringify(user));
    }

    // 4. Create a token compatible with existing system
    const payload = { 
      username, 
      exp: Date.now() + 86400000,
      iat: Date.now(),
      iss: 'bugdex-forum',
      avatar_url: githubUser.avatar_url
    };
    const token = btoa(JSON.stringify(payload)) + '.' + btoa(Date.now().toString());

    console.log('Login successful for user:', username);

    // 5. Redirect to index.html with query params
    const baseUrl = new URL(request.url).origin;
    const redirectUrl = `${baseUrl}/?token=${encodeURIComponent(token)}&username=${encodeURIComponent(username)}`;

    return Response.redirect(redirectUrl, 302);
    
  } catch (error) {
    console.error('GitHub callback error:', error);
    
    // 重定向到首页并显示错误信息
    const baseUrl = new URL(request.url).origin;
    const errorUrl = `${baseUrl}/?error=${encodeURIComponent('GitHub登录失败: ' + error.message)}`;
    
    return Response.redirect(errorUrl, 302);
  }
}
