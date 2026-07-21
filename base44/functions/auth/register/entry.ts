import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password, username, display_name } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    // Verificar se email já existe
    const existingCreds = await base44.asServiceRole.entities.UserCredential.list();
    if (existingCreds.some(c => c.email.toLowerCase() === email.toLowerCase())) {
      return Response.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    // Verificar se username já existe (se fornecido)
    if (username && existingCreds.some(c => c.username?.toLowerCase() === username.toLowerCase())) {
      return Response.json({ error: 'Nome de usuário já existe' }, { status: 400 });
    }

    // Hash da senha usando Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Criar usuário no sistema Base44
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === email);

    let user_id;
    if (existingUser) {
      // Usuário já existe (migração do Google)
      user_id = existingUser.id;
      if (display_name && !existingUser.display_name) {
        await base44.asServiceRole.entities.User.update(user_id, { display_name });
      }
    } else {
      // Criar novo usuário
      const newUser = await base44.asServiceRole.entities.User.create({
        email,
        full_name: display_name || email.split('@')[0],
        display_name: display_name || username || email.split('@')[0],
        role: 'user'
      });
      user_id = newUser.id;
    }

    // Criar credencial
    await base44.asServiceRole.entities.UserCredential.create({
      user_id,
      email: email.toLowerCase(),
      username: username?.toLowerCase() || null,
      password_hash
    });

    return Response.json({ 
      success: true, 
      message: 'Usuário cadastrado com sucesso',
      user_id 
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});