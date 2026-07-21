import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { login, password } = await req.json();

    if (!login || !password) {
      return Response.json({ error: 'Login e senha são obrigatórios' }, { status: 400 });
    }

    // Hash da senha fornecida
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Buscar credencial por email ou username
    const credentials = await base44.asServiceRole.entities.UserCredential.list();
    const credential = credentials.find(c => 
      c.email.toLowerCase() === login.toLowerCase() || 
      c.username?.toLowerCase() === login.toLowerCase()
    );

    if (!credential) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    if (credential.password_hash !== password_hash) {
      return Response.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Buscar dados do usuário
    const user = await base44.asServiceRole.entities.User.list();
    const userData = user.find(u => u.id === credential.user_id);

    return Response.json({ 
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        display_name: userData.display_name,
        full_name: userData.full_name,
        role: userData.role
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});