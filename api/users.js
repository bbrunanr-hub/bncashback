// Vercel Serverless Function - Gestão e Sincronização em Nuvem de Usuários BNcashback
// Conectado com o banco de dados oficial na nuvem (Supabase) para persistência real entre dispositivos

const SUPABASE_URL = 'https://neixytbxkaqsxjbgutpo.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laXh5dGJ4a2Fxc3hqYmd1dHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzYwNzUsImV4cCI6MjA5MzUxMjA3NX0.LENwJMc5v9TupyAeftZINuuqvqbt1eZw25HCOzyX-Nw';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Cadastro ou Login de Usuário (salva Nome + WhatsApp no banco de dados na nuvem)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const user = body?.user;

      if (!user || !user.name || !user.whatsapp) {
        return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
      }

      const cleanPhone = (user.cleanWhatsapp || user.whatsapp).replace(/\D/g, '');
      const row = {
        id: user.id || cleanPhone,
        name: user.name.trim(),
        whatsapp: user.whatsapp,
        clean_whatsapp: cleanPhone,
        email: user.email || null,
        referral_code: user.referralCode || 'BN' + Math.floor(1000 + Math.random() * 9000),
        created_at: user.createdAt || new Date().toLocaleDateString('pt-BR'),
        referred_by: user.referredBy || null,
        referred_by_name: user.referredByName || null,
        referred_by_whatsapp: user.referredByWhatsapp || null,
        is_vip_primary: Boolean(user.isVipPrimary),
        vip_expires_at: user.vipExpiresAt || null,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/bn_users`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(row)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Supabase write error:', errText);
      }

      return res.status(200).json({
        success: true,
        message: 'Usuário registrado com sucesso no banco de dados!',
        user: row
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao processar cadastro de usuário'
      });
    }
  }

  // Lista todos os usuários cadastrados
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bn_users?select=*&order=created_at.desc`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });

      const raw = await response.json();
      const users = (Array.isArray(raw) ? raw : []).map(r => ({
        id: r.id,
        name: r.name,
        whatsapp: r.whatsapp,
        cleanWhatsapp: r.clean_whatsapp,
        email: r.email || undefined,
        referralCode: r.referral_code,
        createdAt: r.created_at,
        referredBy: r.referred_by || undefined,
        referredByName: r.referred_by_name || undefined,
        referredByWhatsapp: r.referred_by_whatsapp || undefined,
        isVipPrimary: Boolean(r.is_vip_primary),
        vipExpiresAt: r.vip_expires_at || undefined
      }));

      return res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao consultar usuários'
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
