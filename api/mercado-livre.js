// Vercel Serverless Function - Mercado Livre Official API Integration
// BNcashback official affiliate tag: matt_tool=68798236, matt_word=bbrunanr

const ML_AFFILIATE_TAG = 'bbrunanr';
const ML_MATT_TOOL = '68798236';

const DEFAULT_CLIENT_ID = '6686394200490654';
const DEFAULT_CLIENT_SECRET = 'Jjf0SlC5UD79ACry5O9xjXIiloQstOFK';

// Cache access token across serverless invocations
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken(clientId, clientSecret) {
  const cId = clientId || DEFAULT_CLIENT_ID;
  const cSecret = clientSecret || DEFAULT_CLIENT_SECRET;

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
      client_id: cId,
      client_secret: cSecret
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

    const clientId = reqClientId || process.env.ML_CLIENT_ID || DEFAULT_CLIENT_ID;
    const clientSecret = reqClientSecret || process.env.ML_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;

    // Ação 1: Testar Conexão Oficial
    if (action === 'test_connection') {
      await getAccessToken(clientId, clientSecret);
      return res.status(200).json({
        success: true,
        message: 'Conexão com a API Oficial do Mercado Livre realizada com sucesso! Autenticação aprovada. 🚀'
      });
    }

    // Ação 2: Consultar Produto
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe a URL do produto do Mercado Livre.'
      });
    }

    let resolvedUrl = url.trim();

    // Se for link encurtado (meli.la ou mercadolivre.com/sec/), segue o redirecionamento
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
    const slugTitle = extractSlugTitle(resolvedUrl);
    const token = await getAccessToken(clientId, clientSecret);

    let productTitle = slugTitle;
    let productPrice = null;
    let productThumb = null;
    let rawCategoryName = '';
    let foundViaApi = false;

    // 1. Tenta buscar como Produto de Catálogo direto
    if (itemId) {
      try {
        const prodRes = await fetch(`https://api.mercadolibre.com/products/${itemId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          productTitle = prodData.name || productTitle;
          productThumb = prodData.pictures?.[0]?.url;

          // Busca as ofertas deste produto para pegar o preço oficial
          const itemsRes = await fetch(`https://api.mercadolibre.com/products/${itemId}/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            if (itemsData.results && itemsData.results[0]) {
              productPrice = Number(itemsData.results[0].price) || null;
              rawCategoryName = itemsData.results[0].category_id || '';
              foundViaApi = true;
            }
          }
        }
      } catch {}
    }

    // 2. Se não encontrou pelo ID direto, pesquisa pelo título na API oficial de produtos
    if (!productPrice && slugTitle && slugTitle !== 'Produto Mercado Livre') {
      try {
        const query = encodeURIComponent(slugTitle.slice(0, 50));
        const searchRes = await fetch(`https://api.mercadolibre.com/products/search?status=active&site_id=MLB&q=${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results[0]) {
            const matchedProd = searchData.results[0];
            productTitle = matchedProd.name || productTitle;
            productThumb = matchedProd.pictures?.[0]?.url || productThumb;

            // Busca preço dos itens deste produto
            const itemsRes = await fetch(`https://api.mercadolibre.com/products/${matchedProd.id}/items`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (itemsRes.ok) {
              const itemsData = await itemsRes.json();
              if (itemsData.results && itemsData.results[0]) {
                productPrice = Number(itemsData.results[0].price) || null;
                rawCategoryName = itemsData.results[0].category_id || '';
                foundViaApi = true;
              }
            }
          }
        }
      } catch {}
    }

    const category = mapCategoryCommission(rawCategoryName, productTitle);
    const affiliateLink = generateAffiliateUrl(resolvedUrl);

    if (productPrice && productPrice > 0) {
      const totalCommission = (productPrice * category.rate) / 100;
      const ownerProfit = totalCommission * 0.60;
      const userCashback = totalCommission * 0.40;
      const userRatePct = `${((userCashback / productPrice) * 100).toFixed(1).replace('.', ',')}%`;

      return res.status(200).json({
        success: true,
        source: 'ml_official_api',
        itemId: itemId || 'MLB_PRODUCT',
        title: productTitle,
        price: productPrice,
        thumbnail: productThumb,
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

    // Fallback: se o produto for anúncio individual que requer preenchimento manual do preço
    return res.status(200).json({
      success: true,
      source: foundViaApi ? 'ml_official_api' : 'slug_analysis',
      itemId: itemId || 'MLB_MANUAL',
      title: productTitle,
      price: null,
      thumbnail: productThumb,
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
