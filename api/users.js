// Vercel Serverless Function - Gestão e Sincronização de Usuários BNcashback
// Permite que o Painel da Administradora receba e liste os contatos (Nome + WhatsApp) de todos os visitantes

let memoryUsers = [];

export default async function handler(req, res) {
  // Configura cabeçalhos de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Cadastro ou Login de Usuário (salva Nome + WhatsApp)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const user = body?.user;

      if (!user || !user.name || !user.whatsapp) {
        return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
      }

      const cleanPhone = (user.cleanWhatsapp || user.whatsapp).replace(/\D/g, '');
      const existingIdx = memoryUsers.findIndex(u => {
        const uClean = (u.cleanWhatsapp || u.whatsapp || '').replace(/\D/g, '');
        return uClean === cleanPhone;
      });

      if (existingIdx >= 0) {
        // Atualiza usuário existente mantendo data original
        memoryUsers[existingIdx] = {
          ...memoryUsers[existingIdx],
          ...user,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Insere novo usuário no topo
        memoryUsers.unshift({
          ...user,
          createdAt: user.createdAt || new Date().toLocaleDateString('pt-BR'),
          registeredAt: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuário registrado com sucesso!',
        totalUsers: memoryUsers.length
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao processar cadastro de usuário'
      });
    }
  }

  // Lista todos os usuários cadastrados (para visualização no Painel da Administradora)
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      count: memoryUsers.length,
      users: memoryUsers
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

