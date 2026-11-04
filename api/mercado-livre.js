// Vercel Serverless Function - Mercado Livre Official API Integration
// BNcashback official affiliate tag: matt_tool=68798236, matt_word=bbrunanr

const ML_AFFILIATE_TAG = 'bbrunanr';
const ML_MATT_TOOL = '68798236';

// Cache access token across serverless invocations
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken(clientId, clientSecret) {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Falha ao autenticar com as credenciais do Mercado Livre');
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + ((data.expires_in || 21600) * 1000);
  return cachedToken;
}

function extractMlbId(rawUrl) {
  if (!rawUrl) return null;
  const match = rawUrl.match(/MLB-?(\d+)/i);
  return match ? `MLB${match[1]}` : null;
}

function extractSlugTitle(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = parts.find(p => /MLB/i.test(p)) || parts[parts.length - 1];
    if (lastPart) {
      const cleaned = lastPart
        .replace(/^MLB-?\d+-?/i, '')
        .replace(/-_JM$/i, '')
        .replace(/-/g, ' ');
      if (cleaned.trim()) {
        return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  } catch {}
  return 'Produto Mercado Livre';
}

function mapCategoryCommission(categoryName, title) {
  const text = `${categoryName || ''} ${title || ''}`.toLowerCase();
  if (/vestido|roupa|calcado|tenis|sapato|sandalia|camisa|camiseta|calca|bermuda|moda|beleza|perfume|maquiagem|cosmetico|relogio|joia|bijuteria|skincare|cabelo|bolsa/i.test(text)) {
    return { name: 'Moda, Calçados & Beleza', icon: '👗', rate: 12 };
  }
  if (/ferramenta|furadeira|parafusadeira|serra|martelo|esmerilhadeira|chave|alicate|construcao|tinta/i.test(text)) {
    return { name: 'Ferramentas & Construção', icon: '🛠️', rate: 8 };
  }
  if (/casa|cozinha|panela|airfryer|fritadeira|decoracao|moveis|sofa|cama|mesa|banho|colchao|luminaria|tapete|cortina/i.test(text)) {
    return { name: 'Casa, Decoração & Cozinha', icon: '🏠', rate: 9 };
  }
  if (/celular|smartphone|iphone|samsung|xiaomi|motorola|notebook|computador|pc|gamer|placa|processador|memoria|tv|televisao|monitor|fone|headset|audio|caixa-de-som|console|playstation|xbox|nintendo|tablet/i.test(text)) {
    return { name: 'Celulares & Eletrônicos', icon: '📱', rate: 4 };
  }
  if (/brinquedo|bebe|infantil|carrinho|boneca|lego|esporte|fitness|academia|bicicleta|patins|whey|creatina|suplemento/i.test(text)) {
    return { name: 'Brinquedos, Bebês & Esportes', icon: '🧸', rate: 8 };
  }
  if (/carro|moto|pneu|oleo|automotivo|veiculo|peca|capacete/i.test(text)) {
    return { name: 'Acessórios para Veículos', icon: '🚗', rate: 7 };
  }
  return { name: 'Variedades & Outros', icon: '📦', rate: 7 };
}

function generateAffiliateUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('matt_tool', ML_MATT_TOOL);
    parsed.searchParams.set('matt_word', ML_AFFILIATE_TAG);
    parsed.searchParams.set('forceInApp', 'true');
    parsed.searchParams.set('LID', ML_AFFILIATE_TAG);
    parsed.searchParams.set('affId', ML_AFFILIATE_TAG);
    return parsed.toString();
  } catch {
    return url;
  }
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.method === 'POST' ? req.body : req.query;
    const { action, url, clientId: reqClientId, clientSecret: reqClientSecret } = body || {};

    const clientId = reqClientId || process.env.ML_CLIENT_ID;
    const clientSecret = reqClientSecret || process.env.ML_CLIENT_SECRET;

    // Ação 1: Testar Conexão com as Credenciais
    if (action === 'test_connection') {
      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          message: 'Informe o App ID (Client ID) e o Client Secret para testar a conexão.'
        });
      }

      await getAccessToken(clientId, clientSecret);
      return res.status(200).json({
        success: true,
        message: 'Conexão com a API Oficial do Mercado Livre realizada com sucesso! 🎉'
      });
    }

    // Ação 2: Consultar Produto e Gerar Link com Cashback
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe a URL do produto do Mercado Livre.'
      });
    }

    let resolvedUrl = url.trim();

    // Se for link encurtado (meli.la ou mercadolivre.com/sec/), tenta resolver o redirecionamento
    if (/meli\.la|mercadolivre\.com\/sec/i.test(resolvedUrl)) {
      try {
        const headRes = await fetch(resolvedUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (headRes.url) {
          resolvedUrl = headRes.url;
        }
      } catch {}
    }

    const itemId = extractMlbId(resolvedUrl);

    // Se tivermos as credenciais do Mercado Livre e um ID de anúncio válido
    if (clientId && clientSecret && itemId) {
      try {
        const token = await getAccessToken(clientId, clientSecret);

        // Busca dados oficiais do item na API
        const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (itemRes.ok) {
          const item = await itemRes.json();
          let rawCategoryName = '';

          // Busca categoria na API
          if (item.category_id) {
            try {
              const catRes = await fetch(`https://api.mercadolibre.com/categories/${item.category_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (catRes.ok) {
                const catData = await catRes.json();
                rawCategoryName = catData.name;
              }
            } catch {}
          }

          const category = mapCategoryCommission(rawCategoryName, item.title);
          const price = Number(item.price) || 0;
          const totalCommission = (price * category.rate) / 100;
          const ownerProfit = totalCommission * 0.60;
          const userCashback = totalCommission * 0.40;
          const userRatePct = price > 0 ? `${((userCashback / price) * 100).toFixed(1).replace('.', ',')}%` : `${(category.rate * 0.40).toFixed(1).replace('.', ',')}%`;

          const affiliateLink = generateAffiliateUrl(item.permalink || resolvedUrl);
          const thumbnail = item.pictures?.[0]?.secure_url || item.thumbnail?.replace('http://', 'https://');

          return res.status(200).json({
            success: true,
            source: 'ml_official_api',
            itemId: item.id,
            title: item.title,
            price,
            thumbnail,
            categoryName: category.name,
            categoryIcon: category.icon,
            marketplaceRate: category.rate,
            totalCommission,
            ownerProfit,
            cashback: userCashback,
            cashbackRatePct: userRatePct,
            affiliateLink,
            originalLink: resolvedUrl
          });
        }
      } catch (apiErr) {
        console.warn('API error, falling back to smart parser:', apiErr.message);
      }
    }

    // Fallback inteligente (se as chaves da API ainda não estiverem configuradas)
    const slugTitle = extractSlugTitle(resolvedUrl);
    const category = mapCategoryCommission('', slugTitle);
    const affiliateLink = generateAffiliateUrl(resolvedUrl);

    return res.status(200).json({
      success: true,
      source: 'slug_analysis',
      itemId: itemId || 'MLB_MANUAL',
      title: slugTitle,
      price: null, // Será informado pelo usuário ou confirmado na compra
      thumbnail: null,
      categoryName: category.name,
      categoryIcon: category.icon,
      marketplaceRate: category.rate,
      cashbackRatePct: `${(category.rate * 0.40).toFixed(1).replace('.', ',')}%`,
      affiliateLink,
      originalLink: resolvedUrl,
      needsPriceInput: true
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erro ao processar consulta do Mercado Livre.'
    });
  }
}
