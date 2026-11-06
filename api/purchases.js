// Vercel Serverless Function - Gestão e Sincronização em Nuvem de Compras e Links
// Conectado com o banco de dados oficial na nuvem (Supabase)

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

  // Salvar ou atualizar compra / link gerado
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const purchase = body?.purchase;

      if (!purchase || !purchase.id) {
        return res.status(400).json({ error: 'Dados da compra são obrigatórios' });
      }

      const row = {
        id: purchase.id,
        platform: purchase.platform,
        product_name: purchase.productName,
        original_link: purchase.originalLink || null,
        affiliate_link: purchase.affiliateLink,
        price: Number(purchase.price) || 0,
        total_commission: Number(purchase.totalCommission) || 0,
        owner_profit: Number(purchase.ownerProfit) || 0,
        cashback: Number(purchase.cashback) || 0,
        cashback_rate_pct: purchase.cashbackRatePct || null,
        category_name: purchase.categoryName || null,
        category_icon: purchase.categoryIcon || null,
        status: purchase.status,
        date: purchase.date,
        user_name: purchase.userName || null,
        user_whatsapp: purchase.userWhatsapp || null,
        primary_user_name: purchase.primaryUserName || null,
        primary_user_whatsapp: purchase.primaryUserWhatsapp || null,
        primary_bonus_amount: Number(purchase.primaryBonusAmount) || 0,
        is_referral_bonus: Boolean(purchase.isReferralBonus),
        referred_buyer_name: purchase.referredBuyerName || null
      };

      await fetch(`${SUPABASE_URL}/rest/v1/bn_purchases`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(row)
      });

      return res.status(200).json({
        success: true,
        message: 'Compra registrada com sucesso no banco de dados!'
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao processar compra'
      });
    }
  }

  // Listar compras
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bn_purchases?select=*&order=created_at.desc`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });

      const raw = await response.json();
      const purchases = (Array.isArray(raw) ? raw : []).map(r => ({
        id: r.id,
        platform: r.platform,
        productName: r.product_name,
        originalLink: r.original_link || '',
        affiliateLink: r.affiliate_link,
        price: Number(r.price) || 0,
        totalCommission: Number(r.total_commission) || 0,
        ownerProfit: Number(r.owner_profit) || 0,
        cashback: Number(r.cashback) || 0,
        cashbackRatePct: r.cashback_rate_pct || '',
        categoryName: r.category_name || '',
        categoryIcon: r.category_icon || '',
        status: r.status,
        date: r.date,
        userName: r.user_name || undefined,
        userWhatsapp: r.user_whatsapp || undefined,
        primaryUserName: r.primary_user_name || undefined,
        primaryUserWhatsapp: r.primary_user_whatsapp || undefined,
        primaryBonusAmount: Number(r.primary_bonus_amount) || 0,
        isReferralBonus: Boolean(r.is_referral_bonus),
        referredBuyerName: r.referred_buyer_name || undefined
      }));

      return res.status(200).json({
        success: true,
        count: purchases.length,
        purchases
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao consultar compras'
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

