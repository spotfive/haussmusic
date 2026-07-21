import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const nowISO = now.toISOString();
    
    const scheduledPosts = await base44.asServiceRole.entities.Post.filter({ is_scheduled: true });
    
    let unlocked = 0;
    for (const post of scheduledPosts) {
      if (post.scheduled_datetime && post.scheduled_datetime <= nowISO) {
        await base44.asServiceRole.entities.Post.update(post.id, { is_scheduled: false });
        unlocked++;
      }
    }
    
    return Response.json({ unlocked, checked: scheduledPosts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});