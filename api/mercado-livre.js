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
  // 1. pdp_filters=item_id:MLB12345678
  const pdpMatch = rawUrl.match(/item_id:(MLB\d+)/i);
  if (pdpMatch) return pdpMatch[1].toUpperCase();

  // 2. wid=MLB12345678
  const widMatch = rawUrl.match(/wid=(MLB\d+)/i);
  if (widMatch) return widMatch[1].toUpperCase();

  // 3. /p/MLB12345 (catálogo)
  const pMatch = rawUrl.match(/\/p\/(MLB\d+)/i);
  if (pMatch) return pMatch[1].toUpperCase();

  // 4. /MLB-12345678
  const directMatch = rawUrl.match(/\/MLB-?(\d+)/i);
  if (directMatch) return `MLB${directMatch[1]}`;

  return null;
}

function extractSlugTitle(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);

    // 1. Formato /nome-do-produto/p/MLB... ou /nome-do-produto/up/MLBU...
    const pIndex = parts.findIndex(p => p.toLowerCase() === 'p' || p.toLowerCase() === 'up');
    if (pIndex > 0) {
      const slug = parts[pIndex - 1];
      const cleaned = slug.replace(/-/g, ' ').trim();
      if (cleaned && cleaned.length > 3) {
        return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    // 2. Formato /MLB-12345678-nome-do-produto-_JM ou /MLB12345678-nome
    for (const part of parts) {
      if (/^MLB[U]?-?\d+$/i.test(part)) continue; // Ignora se for apenas o código numérico
      if (/MLB/i.test(part)) {
        const cleaned = part
          .replace(/^MLB[U]?-?\d+-?/i, '')
          .replace(/-_JM$/i, '')
          .replace(/-/g, ' ')
          .trim();
        if (cleaned && cleaned.length > 3) {
          return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
    }

    // 3. Formato com qualquer slug que não seja 'p', 'up' ou ID
    const textPart = parts.find(p => p !== 'p' && p !== 'up' && !/^MLB[U]?-?\d+$/i.test(p) && p.length > 5);
    if (textPart) {
      const cleaned = textPart.replace(/-/g, ' ').trim();
      if (cleaned) return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  } catch {}
  return 'Produto Mercado Livre';
}

function mapCategoryCommission(categoryName, title) {
  const text = `${categoryName || ''} ${title || ''}`.toLowerCase();

  // 4. Alimentos e Bebidas (0% no Mercado Livre Afiliados)
  if (/alimento|alimentos|bebida|bebidas|cerveja|vinho|whisky|refrigerante|cafe|arroz|feijao|azeite|supermercado/i.test(text)) {
    return { name: 'Alimentos & Bebidas', icon: '🥫', rate: 0 };
  }

  // Móveis e itens de Casa (12% Venda Direta) - Verifica ANTES de moda para não confundir 'guarda-roupa' com 'roupa'
  if (/guarda[- ]?roupa|roupeiro|comoda|armario|sapateira|rack|painel|cabeceira|sofa|poltrona|estante|mesa|cadeira|cama|colchao|beliche|berco|aparador|buffet/i.test(text)) {
    return { name: 'Casa, Móveis & Decoração', icon: '🏠', rate: 12 };
  }

  // Eletrodomésticos (5% Venda Direta)
  if (/geladeira|refrigerador|freezer|lavadora|maquina de lavar|secadora|lava e seca|micro-ondas|microondas|fogao|cooktop|ar-condicionado|ar condicionado|aspirador|ventilador/i.test(text)) {
    return { name: 'Tecnologia & Eletrodomésticos', icon: '📱', rate: 5 };
  }

  // 3. Tecnologia e Eletrônicos (5% Venda Direta)
  if (/celular|smartphone|iphone|samsung|xiaomi|motorola|notebook|computador|pc|gamer|placa|processador|memoria|tv|televisao|monitor|fone|headset|audio|caixa-de-som|console|playstation|xbox|nintendo|tablet|camera|cameras|impressora/i.test(text)) {
    return { name: 'Tecnologia & Eletrodomésticos', icon: '📱', rate: 5 };
  }

  // 1. Moda, Beleza e Cuidados Pessoais, Calçados, Roupas, Bolsas, Esportes e Fitness (16% Venda Direta)
  if (/vestido|\broupa\b|\broupas\b|calcado|tenis|sapato|sandalia|camisa|camiseta|calca|bermuda|moda|beleza|perfume|maquiagem|cosmetico|skincare|cabelo|bolsa|bolsas|esporte|fitness|academia|bicicleta|patins|whey|creatina|suplemento|chuteira|legging|treino/i.test(text)) {
    return { name: 'Moda, Beleza & Esportes', icon: '👗', rate: 16 };
  }

  // 2. Casa, Móveis, Decoração, Construção, Ferramentas, Brinquedos, Bebês, Games, Joias, Relógios, Livros e Revistas, Acessórios para Veículos (12% Venda Direta)
  if (/livro|revista|kam|key account|leitura|kindle/i.test(text)) {
    return { name: 'Livros & Revistas', icon: '📚', rate: 12 };
  }
  if (/ferramenta|furadeira|parafusadeira|serra|martelo|esmerilhadeira|chave|alicate|construcao|tinta/i.test(text)) {
    return { name: 'Ferramentas & Construção', icon: '🛠️', rate: 12 };
  }
  if (/casa|cozinha|panela|airfryer|fritadeira|decoracao|moveis|sofa|cama|mesa|banho|colchao|luminaria|tapete|cortina|varal|lixeira/i.test(text)) {
    return { name: 'Casa, Móveis & Decoração', icon: '🏠', rate: 12 };
  }
  if (/brinquedo|bebe|infantil|carrinho|boneca|lego|game|jogos|jogo/i.test(text)) {
    return { name: 'Brinquedos, Bebês & Games', icon: '🧸', rate: 12 };
  }
  if (/carro|moto|pneu|oleo|automotivo|veiculo|peca|capacete|retrovisor|espelho|farol|palheta|amortecedor|escapamento|volante/i.test(text)) {
    return { name: 'Acessórios para Veículos', icon: '🚗', rate: 12 };
  }
  if (/joia|relogio|bijuteria/i.test(text)) {
    return { name: 'Joias & Relógios', icon: '⌚', rate: 12 };
  }

  // Demais categorias / Variedades em geral no Mercado Livre: 12%
  return { name: 'Casa, Variedades & Outros', icon: '📦', rate: 12 };
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

    // 2. Se não encontrou pelo ID direto, pesquisa pelo título na API oficial de produtos com fallback em camadas
    if (!productPrice && slugTitle && slugTitle !== 'Produto Mercado Livre') {
      const cleanWords = slugTitle
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚãõÃÕâêôÂÊÔçÇ\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !/^(de|da|do|para|com|em)$/i.test(w));

      const searchQueries = [
        slugTitle.slice(0, 60),
        cleanWords.slice(0, 5).join(' '),
        cleanWords.slice(0, 3).join(' ')
      ].filter(Boolean);

      const uniqueQueries = [...new Set(searchQueries)];

      for (const q of uniqueQueries) {
        if (productPrice) break;
        try {
          const encoded = encodeURIComponent(q);
          const searchRes = await fetch(`https://api.mercadolibre.com/products/search?status=active&site_id=MLB&q=${encoded}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const topProducts = (searchData.results || []).slice(0, 10);

            for (const matchedProd of topProducts) {
              if (productPrice) break;
              try {
                // Verificação de similaridade de palavras para evitar pegar produto errado do catálogo (ex: conjunto Neymar para kit 4 camisetas)
                const matchedWords = (matchedProd.name || '').toLowerCase().replace(/[^a-z0-9áéíóúãõâêôç]/gi, ' ').split(/\s+/).filter(w => w.length > 2);
                const slugWords = cleanWords.map(w => w.toLowerCase());
                const setA = new Set(slugWords);
                const setB = new Set(matchedWords);
                const intersection = [...setA].filter(x => setB.has(x)).length;
                const union = new Set([...slugWords, ...matchedWords]).size;
                const jaccard = union > 0 ? (intersection / union) : 0;

                // Só aceita o produto de catálogo se tiver pelo menos 50% de similaridade real no título
                if (jaccard < 0.50) {
                  continue;
                }

                const itemsRes = await fetch(`https://api.mercadolibre.com/products/${matchedProd.id}/items`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (itemsRes.ok) {
                  const itemsData = await itemsRes.json();
                  if (itemsData.results && itemsData.results[0] && itemsData.results[0].price) {
                    productPrice = Number(itemsData.results[0].price) || null;
                    productTitle = matchedProd.name || productTitle;
                    productThumb = matchedProd.pictures?.[0]?.url || productThumb;
                    rawCategoryName = itemsData.results[0].category_id || '';
                    foundViaApi = true;
                    break;
                  }
                }
              } catch {}
            }
          }
        } catch {}
      }
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
