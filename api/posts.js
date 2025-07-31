// EdgeOne Pages 云函数标准入口
/**
 * @function onRequest
 * @description EdgeOne Pages 云函数主入口，处理帖子相关API。
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - EdgeOne注入的环境变量（KV、COS等）
 */
export async function onRequest({ request, env }) {
  const { pathname } = new URL(request.url);
  
  // 处理 CORS 预检请求
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
  
  if (pathname === '/api/posts' && request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page')) || 1;
      const size = Number(url.searchParams.get('size')) || 10;
      
      // 从KV获取所有帖子数据
      let posts = [];
      if (env.bugdex_kv) {
        let cursor;
        do {
          const result = await env.bugdex_kv.list({ prefix: 'post:', cursor });
          for (const key of result.keys) {
            const post = await env.bugdex_kv.get(key.key, { type: 'json' });
            if (post) posts.push(post);
          }
          cursor = result.cursor;
        } while (!result.complete);
      }
      
      console.log(`获取到 ${posts.length} 个帖子`);
      
      posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const pagedPosts = posts.slice((page-1)*size, page*size);
      
      return new Response(JSON.stringify({
        total: posts.length,
        data: pagedPosts
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      console.error('获取帖子失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '获取帖子失败: ' + error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
  
  // 帖子POST支持multipart/form-data
  if (pathname === '/api/posts' && request.method === 'POST') {
    try {
      let title, content, image_url, codefile_url, codefile_name;
      let isMultipart = request.headers.get('content-type') && request.headers.get('content-type').includes('multipart/form-data');
      if (isMultipart) {
        const form = await request.formData();
        title = form.get('title');
        content = form.get('content');
        // 处理图片
        const image = form.get('image');
        if (image && image.size > 0) {
          // 添加文件安全检查
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          const maxSize = 5 * 1024 * 1024; // 5MB
          
          if (!allowedTypes.includes(image.type)) {
            return new Response(JSON.stringify({
              success: false,
              message: '不支持的图片格式，请上传 JPG、PNG、GIF 或 WebP 格式'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
          if (image.size > maxSize) {
            return new Response(JSON.stringify({
              success: false,
              message: '图片文件过大，请上传小于 5MB 的图片'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
          // 这里应保存到对象存储或EdgeOne File API，示例直接生成URL
          image_url = `/uploads/${Date.now()}_${image.name}`;
          // 实际应保存文件到存储
        }
        // 处理代码文件
        const codefile = form.get('codefile');
        if (codefile && codefile.size > 0) {
          // 添加代码文件安全检查
          const allowedExtensions = ['.js', '.py', '.java', '.txt', '.ts', '.cpp', '.c', '.json', '.html', '.css'];
          const maxSize = 2 * 1024 * 1024; // 2MB
          
          const fileName = codefile.name.toLowerCase();
          const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
          
          if (!hasValidExtension) {
            return new Response(JSON.stringify({
              success: false,
              message: '不支持的代码文件格式，请上传支持的文件类型'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
          if (codefile.size > maxSize) {
            return new Response(JSON.stringify({
              success: false,
              message: '代码文件过大，请上传小于 2MB 的文件'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
          codefile_url = `/uploads/${Date.now()}_${codefile.name}`;
          codefile_name = codefile.name;
        }
      } else {
        const body = await request.json();
        title = body.title;
        content = body.content;
        image_url = body.image_url;
        codefile_url = body.codefile_url;
        codefile_name = body.codefile_name;
      }
      
      // 获取用户信息（从 token）
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 创建帖子
      const postId = `post_${Date.now()}`;
      const post = {
        id: postId,
        title,
        content,
        image_url,
        codefile_url,
        username: userData.username,
        likes_count: 0,
        created_at: new Date().toISOString()
      };
      
      // 保存到KV
      if (env.bugdex_kv) {
        await env.bugdex_kv.put(`post:${postId}`, JSON.stringify(post));
      }
      
      return new Response(JSON.stringify(post), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('发布帖子失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '发布帖子失败: ' + error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname.startsWith('/api/posts/') && pathname.endsWith('/like') && request.method === 'POST') {
    try {
      const postId = pathname.split('/')[3];
      
      // 获取用户信息
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 检查是否已经点赞
      const likeKey = `${postId}:${userData.username}`;
      const existingLike = await env.bugdex_kv.get(`like:${likeKey}`, { type: 'json' });
      
      if (existingLike) {
        return new Response(JSON.stringify({
          success: false,
          message: '已经点赞过了'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 添加点赞记录
      const likeData = {
        post_id: postId,
        username: userData.username,
        created_at: new Date().toISOString()
      };
      
      if (env.bugdex_kv) {
        await env.bugdex_kv.put(`like:${likeKey}`, JSON.stringify(likeData));
      }
      
      // 更新帖子点赞数
      let post = await env.bugdex_kv.get(`post:${postId}`, { type: 'json' });
      
      if (post) {
        post.likes_count = (post.likes_count || 0) + 1;
        if (env.bugdex_kv) {
          await env.bugdex_kv.put(`post:${postId}`, JSON.stringify(post));
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        likes_count: post.likes_count
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('点赞失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '点赞失败: ' + error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname.startsWith('/api/posts/') && pathname.endsWith('/comments') && request.method === 'POST') {
    try {
      const postId = pathname.split('/')[3];
      const { content } = await request.json();
      
      // 获取用户信息
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 创建评论
      const commentId = `comment_${Date.now()}`;
      const comment = {
        id: commentId,
        post_id: postId,
        username: userData.username,
        content,
        created_at: new Date().toISOString()
      };
      
      // 保存到KV
      if (env.bugdex_kv) {
        await env.bugdex_kv.put(`comment:${commentId}`, JSON.stringify(comment));
      }
      
      return new Response(JSON.stringify(comment), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('发表评论失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '发表评论失败: ' + error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname.match(/^\/api\/posts\/[\w-]+\/comments$/) && request.method === 'GET') {
    try {
      const postId = pathname.split('/')[3];
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page')) || 1;
      const size = Number(url.searchParams.get('size')) || 10;
      let comments = [];
      if (env.bugdex_kv) {
        let cursor;
        do {
          const result = await env.bugdex_kv.list({ prefix: 'comment:', cursor });
          for (const key of result.keys) {
            const comment = await env.bugdex_kv.get(key.key, { type: 'json' });
            if (comment && comment.post_id === postId) {
              comments.push(comment);
            }
          }
          cursor = result.cursor;
        } while (!result.complete);
      }
      comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const pagedComments = comments.slice((page-1)*size, page*size);
      return new Response(JSON.stringify({
        total: comments.length,
        data: pagedComments
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      console.error('获取评论失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '获取评论失败: ' + error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
  
  // 搜索帖子
  if (pathname.startsWith('/api/search/posts') && request.method === 'GET') {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword') || '';
    let posts = [];
    if (env.bugdex_kv) {
      let cursor;
      do {
        const result = await env.bugdex_kv.list({ prefix: 'post:', cursor });
        for (const key of result.keys) {
          const post = await env.bugdex_kv.get(key.key, { type: 'json' });
          if (post) posts.push(post);
        }
        cursor = result.cursor;
      } while (!result.complete);
    }
    const lower = keyword.toLowerCase();
    const filtered = posts.filter(post =>
      (post.title && post.title.toLowerCase().includes(lower)) ||
      (post.content && post.content.toLowerCase().includes(lower))
    );
    return new Response(JSON.stringify({
      data: filtered
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  // 删除帖子
  if (pathname.startsWith('/api/posts/') && pathname.endsWith('/delete') && request.method === 'DELETE') {
    try {
      const postId = pathname.split('/')[3];
      
      // 获取用户信息
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 获取帖子信息
      let post = await env.bugdex_kv.get(`post:${postId}`, { type: 'json' });
      
      if (!post) {
        return new Response(JSON.stringify({
          success: false,
          message: '帖子不存在'
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 检查权限：只有帖子作者才能删除
      if (post.username !== userData.username) {
        return new Response(JSON.stringify({
          success: false,
          message: '您没有权限删除此帖子'
        }), {
          status: 403,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 删除帖子
      if (env.bugdex_kv) {
        await env.bugdex_kv.delete(`post:${postId}`);
      }
      
      // 删除相关的评论
      let comments = [];
      if (env.bugdex_kv) {
        let cursor;
        do {
          const result = await env.bugdex_kv.list({ prefix: 'comment:', cursor });
          for (const key of result.keys) {
            const comment = await env.bugdex_kv.get(key.key, { type: 'json' });
            if (comment && comment.post_id === postId) {
              comments.push(comment);
            }
          }
          cursor = result.cursor;
        } while (!result.complete);
      }
      
      // 删除评论
      for (const comment of comments) {
        if (env.bugdex_kv) {
          await env.bugdex_kv.delete(`comment:${comment.id}`);
        }
      }
      
      // 删除相关的点赞记录
      let likes = [];
      if (env.bugdex_kv) {
        let cursor;
        do {
          const result = await env.bugdex_kv.list({ prefix: 'like:', cursor });
          for (const key of result.keys) {
            const like = await env.bugdex_kv.get(key.key, { type: 'json' });
            if (like && like.post_id === postId) {
              likes.push(like);
            }
          }
          cursor = result.cursor;
        } while (!result.complete);
      }
      
      // 删除点赞记录
      for (const like of likes) {
        const likeKey = `${postId}:${like.username}`;
        if (env.bugdex_kv) {
          await env.bugdex_kv.delete(`like:${likeKey}`);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: '帖子删除成功'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('删除帖子失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '删除帖子失败: ' + error.message
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
    message: '接口不存在'
  }), {
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
} 