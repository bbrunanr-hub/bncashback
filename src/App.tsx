import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import {
  Home, ShoppingBag, Wallet, Settings, Link2, CheckCircle, Copy, ChevronRight,
  Bell, User, Key, HelpCircle, LogOut, Zap, TrendingUp, ExternalLink,
  Shield, ArrowLeft, DollarSign, Lock, Send
} from 'lucide-react'
import './index.css'

type Platform = 'ml' | 'shopee'
type Tab = 'home' | 'purchases' | 'balance' | 'settings' | 'admin'
type ProcessState = 'idle' | 'processing' | 'done' | 'error'

// ---- Official Affiliate Credentials ----
const ML_AFFILIATE_TAG = 'bbrunanr'
const ML_MATT_TOOL = '68798236'
const SHOPEE_AFFILIATE_ID = 'an_18335281102'
const SHOPEE_CAMPAIGN_ID = 'id_52MZIjcVHTp'

// ---- Category & Proportional Commission Structure ----
// Proporção de divisão da comissão: 65% para você (monetização) e 35% para o usuário (cashback)
export const USER_COMMISSION_SHARE = 0.35 // 35% para o usuário
export const OWNER_COMMISSION_SHARE = 0.65 // 65% seu lucro líquido

export interface CategoryCommission {
  key: string
  name: string
  icon: string
  mlCommission: number      // % paga pelo Mercado Livre
  shopeeCommission: number  // % paga pela Shopee
  cashbackShare: number     // 35% da comissão para o usuário
}

export const CATEGORIES: Record<string, CategoryCommission> = {
  fashion: {
    key: 'fashion',
    name: 'Moda, Calçados & Beleza',
    icon: '👗',
    mlCommission: 12,
    shopeeCommission: 14,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  home: {
    key: 'home',
    name: 'Casa, Decoração & Cozinha',
    icon: '🏠',
    mlCommission: 9,
    shopeeCommission: 10,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  tools: {
    key: 'tools',
    name: 'Ferramentas & Construção',
    icon: '🛠️',
    mlCommission: 8,
    shopeeCommission: 8,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  toys_sports: {
    key: 'toys_sports',
    name: 'Brinquedos, Bebês & Esportes',
    icon: '🧸',
    mlCommission: 8,
    shopeeCommission: 9,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  electronics: {
    key: 'electronics',
    name: 'Celulares & Eletrônicos',
    icon: '📱',
    mlCommission: 4,
    shopeeCommission: 4,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  general: {
    key: 'general',
    name: 'Variedades & Outros',
    icon: '📦',
    mlCommission: 7,
    shopeeCommission: 7,
    cashbackShare: USER_COMMISSION_SHARE,
  },
}

function detectCategory(url: string): CategoryCommission {
  const lower = url.toLowerCase()

  if (/vestido|roupa|calcado|tenis|sapato|sandalia|camisa|camiseta|calca|bermuda|moda|beleza|perfume|maquiagem|cosmetico|relogio|joia|bijuteria|skincare|cabelo/i.test(lower)) {
    return CATEGORIES.fashion
  }
  if (/ferramenta|furadeira|parafusadeira|serra|martelo|esmerilhadeira|chave|alicate|construcao|tinta/i.test(lower)) {
    return CATEGORIES.tools
  }
  if (/casa|cozinha|panela|airfryer|fritadeira|decoracao|moveis|sofa|cama|mesa|banho|colchao|luminaria|tapete|cortina/i.test(lower)) {
    return CATEGORIES.home
  }
  if (/celular|smartphone|iphone|samsung|xiaomi|motorola|notebook|computador|pc|gamer|placa|processador|memoria|tv|televisao|monitor|fone|headset|audio|caixa-de-som|console|playstation|xbox|nintendo|tablet/i.test(lower)) {
    return CATEGORIES.electronics
  }
  if (/brinquedo|bebe|infantil|carrinho|boneca|lego|esporte|fitness|academia|bicicleta|patins|whey|creatina|suplemento/i.test(lower)) {
    return CATEGORIES.toys_sports
  }
  return CATEGORIES.general
}

export interface Purchase {
  id: string
  platform: Platform
  productName: string
  originalLink: string
  affiliateLink: string
  price: number
  totalCommission: number   // 100% da comissão gerada pelo marketplace
  ownerProfit: number       // 65% seu lucro
  cashback: number          // 35% cashback do usuário
  cashbackRatePct: string
  categoryName: string
  categoryIcon: string
  status: 'pending' | 'approved'
  date: string
}

export interface WithdrawalRequest {
  id: string
  userName: string
  pixKey: string
  pixType: 'cpf' | 'email' | 'phone' | 'random'
  amount: number
  status: 'pending' | 'paid' | 'rejected'
  createdAt: string
  paidAt?: string
}

// ---- Affiliate Link Generator ----
function generateAffiliateLink(url: string, platform: Platform): string {
  try {
    const parsed = new URL(url)
    if (platform === 'ml') {
      // Mercado Livre: official affiliate tracking parameters
      parsed.searchParams.set('matt_tool', ML_MATT_TOOL)
      parsed.searchParams.set('matt_word', ML_AFFILIATE_TAG)
      parsed.searchParams.set('forceInApp', 'true')
      parsed.searchParams.set('LID', ML_AFFILIATE_TAG)
      parsed.searchParams.set('affId', ML_AFFILIATE_TAG)
      return parsed.toString()
    } else if (platform === 'shopee') {
      // Shopee: official partner tracking parameters
      parsed.searchParams.set('mmp_pid', SHOPEE_AFFILIATE_ID)
      parsed.searchParams.set('utm_source', SHOPEE_AFFILIATE_ID)
      parsed.searchParams.set('utm_medium', 'affiliates')
      parsed.searchParams.set('utm_campaign', SHOPEE_CAMPAIGN_ID)
      parsed.searchParams.set('share_channel_code', '1')
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}

function detectPlatform(url: string): Platform | null {
  if (/mercadolivre\.com\.br|mercadolibre\.|ml\.com/i.test(url)) return 'ml'
  if (/shopee\.com\.br/i.test(url)) return 'shopee'
  return null
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

// ---- Logo SVG ----
function LogoIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="22" fill="url(#grad1)"/>
      <path d="M12 28L20 14L26 22L30 17L34 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 14L34 14L34 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B"/>
          <stop offset="1" stopColor="#F97316"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// ---- ML Icon ----
function MLIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#FFE600"/>
      <path d="M7 14C7 14 8 10 12 10C16 10 17 14 17 14" stroke="#3483FA" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="8" cy="14" r="1.5" fill="#3483FA"/>
      <circle cx="16" cy="14" r="1.5" fill="#3483FA"/>
    </svg>
  )
}

// ---- Shopee Icon ----
function ShopeeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#EE4D2D"/>
      <path d="M8 10V9C8 6.79 9.79 5 12 5C14.21 5 16 6.79 16 9V10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <rect x="6" y="10" width="12" height="9" rx="2" fill="white"/>
      <path d="M10 14C10 14 10.5 16 12 16C13.5 16 14 14 14 14" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ---- Home Page ----
function HomePage() {
  const [platform, setPlatform] = useState<Platform>('ml')
  const [linkInput, setLinkInput] = useState('')
  const [processState, setProcessState] = useState<ProcessState>('idle')
  const [affiliateLink, setAffiliateLink] = useState('')
  const [cashbackAmount, setCashbackAmount] = useState(0)
  const [detectedCategory, setDetectedCategory] = useState<CategoryCommission>(CATEGORIES.general)
  const [cashbackRatePct, setCashbackRatePct] = useState('3,5%')
  const [copied, setCopied] = useState(false)
  const [totalPending, setTotalPending] = useState(0)
  const [totalFound, setTotalFound] = useState(0)

  // Load stats from localStorage
  useEffect(() => {
    const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    const pending = purchases.filter(p => p.status === 'pending').reduce((a, p) => a + p.cashback, 0)
    const found = purchases.reduce((a, p) => a + p.cashback, 0)
    setTotalPending(pending)
    setTotalFound(found)
  }, [])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setLinkInput(text.trim())
      // Auto detect platform
      const detected = detectPlatform(text)
      if (detected) setPlatform(detected)
    } catch {
      toast.error('Permita o acesso à área de transferência para colar')
    }
  }

  const handleGenerate = async () => {
    if (!linkInput.trim()) {
      toast.error('Cole um link do Mercado Livre ou Shopee primeiro!')
      return
    }

    const detected = detectPlatform(linkInput)
    if (detected && detected !== platform) {
      setPlatform(detected)
    }

    const activePlatform = detected || platform

    // Validate URL
    try { new URL(linkInput) } catch {
      toast.error('Link inválido. Certifique-se de colar o link completo.')
      return
    }

    setProcessState('processing')
    setAffiliateLink('')

    // Simulate processing delay (robot working)
    await new Promise(r => setTimeout(r, 1800))

    const generated = generateAffiliateLink(linkInput.trim(), activePlatform)
    const category = detectCategory(linkInput.trim())
    const marketplaceRate = activePlatform === 'ml' ? category.mlCommission : category.shopeeCommission

    // Estima o valor do produto
    const estimatedPrice = 120 + Math.random() * 380

    // 1) Primeiro valor gerado: comissão bruta total do marketplace (100%)
    const totalCommission = (estimatedPrice * marketplaceRate) / 100

    // 2) Separação fixa e segura: 65% seu lucro e 35% cashback do usuário
    const ownerProfit = totalCommission * OWNER_COMMISSION_SHARE // 65%
    const userCashback = totalCommission * USER_COMMISSION_SHARE // 35%

    // 3) Porcentagem final do cashback que aparece para o usuário
    const userRatePct = `${((userCashback / estimatedPrice) * 100).toFixed(1).replace('.', ',')}%`

    setDetectedCategory(category)
    setCashbackRatePct(userRatePct)
    setAffiliateLink(generated)
    setCashbackAmount(userCashback)
    setTotalFound(prev => prev + userCashback)
    setTotalPending(prev => prev + userCashback)
    setProcessState('done')

    // Save to purchases
    const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    const newPurchase: Purchase = {
      id: crypto.randomUUID(),
      platform: activePlatform,
      productName: activePlatform === 'ml' ? `Produto Mercado Livre (${category.name})` : `Produto Shopee (${category.name})`,
      originalLink: linkInput.trim(),
      affiliateLink: generated,
      price: estimatedPrice,
      totalCommission,
      ownerProfit,
      cashback: userCashback,
      cashbackRatePct: userRatePct,
      categoryName: category.name,
      categoryIcon: category.icon,
      status: 'pending',
      date: new Date().toLocaleDateString('pt-BR')
    }
    purchases.unshift(newPurchase)
    localStorage.setItem('bn_purchases', JSON.stringify(purchases))

    toast.success('Link com cashback gerado com sucesso! 🎉')
  }

  const handleCopy = () => {
    if (!affiliateLink) return
    navigator.clipboard.writeText(affiliateLink)
    setCopied(true)
    toast.success('Link copiado! Agora use-o para comprar e ganhar cashback 💰')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleReset = () => {
    setLinkInput('')
    setProcessState('idle')
    setAffiliateLink('')
    setCashbackAmount(0)
  }

  return (
    <div className="page">
      {/* Platform Selector */}
      <div className="platform-tabs">
        <button
          className={`platform-tab ${platform === 'ml' ? 'active' : ''}`}
          onClick={() => setPlatform('ml')}
        >
          <MLIcon />
          Mercado Livre
        </button>
        <button
          className={`platform-tab ${platform === 'shopee' ? 'active-shopee' : ''}`}
          onClick={() => setPlatform('shopee')}
        >
          <ShopeeIcon />
          Shopee
        </button>
      </div>

      {/* Link Input */}
      <div className="link-card">
        <div className="link-card-label">
          <Link2 size={18} color="var(--primary)" />
          Cole o link aqui
        </div>
        <div className="link-input-wrap">
          <input
            className="link-input"
            type="url"
            placeholder={platform === 'ml' ? 'Ex: https://www.mercadolivre.com.br/...' : 'Ex: https://shopee.com.br/...'}
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleGenerate()
            }}
            disabled={processState === 'processing'}
          />
          <button className="paste-btn" onClick={handlePaste} disabled={processState === 'processing'}>
            Colar
          </button>
        </div>
        <button
          className="generate-btn"
          onClick={processState === 'done' ? handleReset : handleGenerate}
          disabled={processState === 'processing'}
        >
          {processState === 'processing' ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Processando...</>
          ) : processState === 'done' ? (
            <><Zap size={18} /> Gerar outro link</>
          ) : (
            <><Zap size={18} /> Gerar link com cashback</>
          )}
        </button>
      </div>

      {/* Processing State */}
      {processState === 'processing' && (
        <div className="processing-box">
          <div className="spinner" />
          <div className="processing-text">Processando...</div>
          <div className="processing-sub">O robô está convertendo seu link ✨</div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="result-grid">
        <div className="result-card blue">
          <div className="result-card-header">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5"/><path d="M5 7h4M7 5v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Valor Encontrado
          </div>
          <div className="result-card-value">{formatCurrency(totalFound)}</div>
        </div>
        <div className="result-card orange">
          <div className="result-card-header">
            <Wallet size={14} />
            Saldo Aguardando
          </div>
          <div className="result-card-value">{formatCurrency(totalPending)}</div>
        </div>
      </div>

      {/* Link com Cashback - Card para Copiar */}
      <div className={`cashback-link-card ${affiliateLink ? 'has-link' : ''}`}>
        <div className="cashback-link-label">
          <div className="cashback-link-title">
            <Link2 size={18} color="var(--primary)" />
            <span>Link com cashback</span>
          </div>
          {affiliateLink && (
            <span className="cashback-badge-ready">Pronto para copiar! ✨</span>
          )}
        </div>

        {affiliateLink ? (
          <>
            {/* Category & Final Cashback Info */}
            <div className="category-info-box">
              <div className="category-badge">
                <span className="category-icon">{detectedCategory.icon}</span>
                <span className="category-name">{detectedCategory.name}</span>
              </div>
              <div className="user-cashback-badge">
                💰 Seu Cashback: <strong>{cashbackRatePct} de volta</strong> ({formatCurrency(cashbackAmount)})
              </div>
            </div>

            <div className="link-input-wrap">
              <input
                className="link-input link-readonly"
                type="text"
                readOnly
                value={affiliateLink}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                className={`paste-btn copy-action-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <><CheckCircle size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
              </button>
            </div>

            <div className="cashback-result-actions">
              <a
                href={affiliateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="open-store-btn"
              >
                <ExternalLink size={14} />
                {platform === 'ml' ? 'Abrir no Mercado Livre' : 'Abrir na Shopee'}
              </a>
              <div className="cashback-chip">
                <TrendingUp size={14} />
                Cashback estimado: {formatCurrency(cashbackAmount)} ({cashbackRatePct})
              </div>
            </div>
          </>
        ) : (
          <div className="link-placeholder-box">
            <div className="link-placeholder-text">
              {processState === 'processing'
                ? 'Convertendo e gerando seu link com cashback...'
                : 'Cole o link do produto acima para copiar seu link com cashback aqui.'}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <div className="info-icon">i</div>
        <div className="info-text">
          Devido à política de entrega dos marketplaces, precisamos esperar a liberação dos valores após o período de entrega do produto e o direito de arrependimento ou devolução do comprador. Eles fazem isso dentro de <strong>60 dias</strong>.
        </div>
      </div>

      {/* CTA */}
      <div className="cta-banner">
        <div className="cta-gift">🎁</div>
        <div className="cta-text">
          Mas não deixe de gerar <span className="highlight">seu saldo!</span>
        </div>
      </div>
    </div>
  )
}

// ---- My Purchases Page ----
function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    setPurchases(data)
  }, [])

  if (purchases.length === 0) {
    return (
      <div className="page">
        <div className="section-title">Minhas Compras</div>
        <div className="section-subtitle">Histórico de links gerados</div>
        <div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <div className="empty-state-title">Nenhuma compra ainda</div>
          <div className="empty-state-text">
            Cole um link do Mercado Livre ou Shopee na aba Início para gerar seu cashback!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="section-title">Minhas Compras</div>
      <div className="section-subtitle">{purchases.length} link{purchases.length !== 1 ? 's' : ''} gerado{purchases.length !== 1 ? 's' : ''}</div>
      {purchases.map(p => (
        <div key={p.id} className="purchase-item">
          <div className={`purchase-icon ${p.platform}`}>
            {p.platform === 'ml' ? <MLIcon /> : <ShopeeIcon />}
          </div>
          <div className="purchase-info">
            <div className="purchase-name">{p.categoryIcon ? `${p.categoryIcon} ` : ''}{p.productName}</div>
            <div className="purchase-date">{p.date}{p.cashbackRatePct ? ` • ${p.cashbackRatePct} cashback` : ''}</div>
          </div>
          <div className="purchase-cashback">
            <div className="cashback-amount">+{formatCurrency(p.cashback)}</div>
            <div className={`cashback-status ${p.status === 'pending' ? 'status-pending' : 'status-approved'}`}>
              {p.status === 'pending' ? 'Aguardando' : 'Aprovado'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Balance Page ----
function BalancePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [pixName, setPixName] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixType, setPixType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    const wData = JSON.parse(localStorage.getItem('bn_withdrawals') || '[]') as WithdrawalRequest[]
    setPurchases(data)
    setWithdrawals(wData)
  }, [])

  const totalPending = purchases.filter(p => p.status === 'pending').reduce((a, p) => a + p.cashback, 0)
  const totalApproved = purchases.filter(p => p.status === 'approved').reduce((a, p) => a + p.cashback, 0)
  const totalAll = purchases.reduce((a, p) => a + p.cashback, 0)

  const handleRequestWithdrawal = () => {
    if (!pixName.trim()) {
      toast.error('Informe seu nome completo')
      return
    }
    if (!pixKey.trim()) {
      toast.error('Informe a sua chave PIX')
      return
    }
    const amountNum = parseFloat(withdrawAmount.replace(',', '.'))
    if (!amountNum || amountNum <= 0) {
      toast.error('Informe um valor válido para o saque')
      return
    }
    if (amountNum > totalAll && totalAll > 0) {
      toast.error(`Valor máximo disponível: ${formatCurrency(totalAll)}`)
      return
    }

    const newRequest: WithdrawalRequest = {
      id: crypto.randomUUID(),
      userName: pixName.trim(),
      pixKey: pixKey.trim(),
      pixType,
      amount: amountNum,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const updated = [newRequest, ...withdrawals]
    setWithdrawals(updated)
    localStorage.setItem('bn_withdrawals', JSON.stringify(updated))
    setIsWithdrawModalOpen(false)
    setPixKey('')
    setWithdrawAmount('')
    toast.success('Solicitação de saque via PIX enviada! A administradora processará o pagamento em breve. 🎉')
  }

  return (
    <div className="page">
      <div className="balance-card">
        <div className="balance-label">💰 Saldo Total Acumulado</div>
        <div className="balance-amount">{formatCurrency(totalAll)}</div>
        <div className="balance-chips">
          <div className="balance-chip">✅ Aprovado: {formatCurrency(totalApproved)}</div>
          <div className="balance-chip">⏳ Aguardando: {formatCurrency(totalPending)}</div>
        </div>
      </div>

      <button
        className="withdraw-btn"
        onClick={() => {
          setWithdrawAmount(totalAll > 0 ? totalAll.toFixed(2).replace('.', ',') : '10,00')
          setIsWithdrawModalOpen(true)
        }}
      >
        💸 Solicitar Saque via PIX
      </button>

      {/* Modal de Solicitação de Saque PIX */}
      {isWithdrawModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWithdrawModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Send size={18} color="var(--primary)" />
                Solicitar Saque via PIX
              </div>
              <button className="modal-close-btn" onClick={() => setIsWithdrawModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <label className="form-label">Nome Completo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Bruna Nunes"
                value={pixName}
                onChange={e => setPixName(e.target.value)}
              />

              <label className="form-label">Tipo de Chave PIX</label>
              <select
                className="form-input"
                value={pixType}
                onChange={e => setPixType(e.target.value as any)}
              >
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone / Celular</option>
                <option value="random">Chave Aleatória</option>
              </select>

              <label className="form-label">Chave PIX</label>
              <input
                type="text"
                className="form-input"
                placeholder="Digite sua chave PIX aqui"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
              />

              <label className="form-label">Valor do Saque (R$)</label>
              <input
                type="text"
                className="form-input"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
              />

              <div className="modal-hint">
                💡 O valor solicitado será analisado e enviado para a sua chave PIX assim que liberado.
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setIsWithdrawModalOpen(false)}>
                Cancelar
              </button>
              <button className="modal-confirm-btn" onClick={handleRequestWithdrawal}>
                Confirmar Saque PIX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Solicitações do Usuário */}
      {withdrawals.length > 0 && (
        <div className="user-withdrawals-section">
          <div className="section-title">Minhas Solicitações de Saque</div>
          {withdrawals.map(w => (
            <div key={w.id} className="user-withdrawal-item">
              <div className="uw-info">
                <div className="uw-amount">{formatCurrency(w.amount)}</div>
                <div className="uw-key">PIX ({w.pixType.toUpperCase()}): {w.pixKey}</div>
                <div className="uw-date">{w.createdAt}</div>
              </div>
              <div className={`uw-status ${w.status === 'paid' ? 'paid' : 'pending'}`}>
                {w.status === 'paid' ? 'Pago via PIX ✅' : 'Aguardando Pagamento ⏳'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="info-box">
        <div className="info-icon">i</div>
        <div className="info-text">
          O saldo é liberado após o período de entrega do produto e o direito de arrependimento ou devolução do comprador. Geralmente em <strong>até 60 dias</strong>. Você pode solicitar saque via PIX quando aprovado.
        </div>
      </div>

      {purchases.length === 0 && withdrawals.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Sem histórico ainda</div>
          <div className="empty-state-text">Gere links de cashback na aba Início para acumular saldo!</div>
        </div>
      )}
    </div>
  )
}

// ---- Settings Page ----
function SettingsPage({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const handleClearData = () => {
    if (confirm('Deseja apagar todo o histórico de compras? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('bn_purchases')
      localStorage.removeItem('bn_withdrawals')
      toast.success('Histórico apagado com sucesso')
    }
  }

  const items = [
    {
      icon: <Shield size={20} color="#EA580C" />,
      bg: '#FFF7ED',
      label: 'Painel da Administradora',
      sub: 'Gestão de saques PIX, comissões e métricas',
      action: onOpenAdmin
    },
    {
      icon: <User size={20} color="#3B82F6" />,
      bg: '#EFF6FF',
      label: 'Minha Conta',
      sub: 'Gerenciar perfil e dados pessoais',
      action: () => toast.info('Em breve!')
    },
    {
      icon: <Key size={20} color="#8B5CF6" />,
      bg: '#F5F3FF',
      label: 'Chave PIX',
      sub: 'Cadastrar chave para receber saques',
      action: () => toast.info('Configure sua chave ao solicitar saque na aba Meu Saldo.')
    },
    {
      icon: <Bell size={20} color="#F59E0B" />,
      bg: '#FFFBEB',
      label: 'Notificações',
      sub: 'Alertas de cashback aprovado',
      action: () => toast.info('Em breve!')
    },
    {
      icon: <HelpCircle size={20} color="#10B981" />,
      bg: '#ECFDF5',
      label: 'Ajuda & FAQ',
      sub: 'Como funciona o cashback?',
      action: () => toast.info('O BNcashback converte links de produtos do ML e Shopee em links com rastreamento de afiliado, gerando cashback para você!')
    },
    {
      icon: <LogOut size={20} color="#EF4444" />,
      bg: '#FEF2F2',
      label: 'Limpar Histórico',
      sub: 'Apagar compras e saques salvos',
      action: handleClearData
    },
  ]

  return (
    <div className="page">
      <div className="section-title">Configurações</div>
      <div className="section-subtitle">Gerencie sua conta e preferências</div>

      <div className="settings-section">
        {items.map((item, i) => (
          <div key={i} className="settings-item" onClick={item.action}>
            <div className="settings-icon" style={{ background: item.bg }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div className="settings-label">{item.label}</div>
              <div className="settings-sublabel">{item.sub}</div>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>BNcashback v1.0</div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>Compre, ganhe cashback! 🚀</div>
      </div>
    </div>
  )
}

// ---- Admin Page (Painel da Administradora) ----
function AdminPage({ onBack }: { onBack: () => void }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [adminTab, setAdminTab] = useState<'withdrawals' | 'commissions' | 'automation'>('withdrawals')

  useEffect(() => {
    const isAuth = sessionStorage.getItem('bn_admin_auth') === 'true'
    if (isAuth) setIsAuthenticated(true)
    const p = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    const w = JSON.parse(localStorage.getItem('bn_withdrawals') || '[]') as WithdrawalRequest[]
    setPurchases(p)
    setWithdrawals(w)
  }, [])

  const handleLogin = () => {
    if (password === 'admin4128') {
      setIsAuthenticated(true)
      sessionStorage.setItem('bn_admin_auth', 'true')
      toast.success('Acesso de Administradora autenticado! 👑')
    } else {
      toast.error('Senha incorreta!')
    }
  }

  // Cálculos Financeiros
  const totalGrossCommissions = purchases.reduce((acc, p) => acc + (p.totalCommission || (p.cashback / USER_COMMISSION_SHARE)), 0)
  const totalOwnerProfit = purchases.reduce((acc, p) => acc + (p.ownerProfit || ((p.totalCommission || (p.cashback / USER_COMMISSION_SHARE)) * OWNER_COMMISSION_SHARE)), 0)
  const totalUserCashback = purchases.reduce((acc, p) => acc + p.cashback, 0)
  
  const totalPaid = withdrawals.filter(w => w.status === 'paid').reduce((acc, w) => acc + w.amount, 0)
  const pendingList = withdrawals.filter(w => w.status === 'pending')
  const totalPendingAmount = pendingList.reduce((acc, w) => acc + w.amount, 0)

  const handleMarkAsPaid = (id: string) => {
    const updated = withdrawals.map(w => {
      if (w.id === id) {
        return {
          ...w,
          status: 'paid' as const,
          paidAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      }
      return w
    })
    setWithdrawals(updated)
    localStorage.setItem('bn_withdrawals', JSON.stringify(updated))
    toast.success('Saque marcado como PAGO via PIX! ✅')
  }

  const handleApproveCommission = (purchaseId: string) => {
    const updated = purchases.map(p => {
      if (p.id === purchaseId) {
        return { ...p, status: 'approved' as const }
      }
      return p
    })
    setPurchases(updated)
    localStorage.setItem('bn_purchases', JSON.stringify(updated))
    toast.success('Saldo do usuário aprovado para saque! 🎉')
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Tela de Login com Senha / PIN
  if (!isAuthenticated) {
    return (
      <div className="page">
        <button className="admin-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar ao App
        </button>

        <div className="admin-login-card">
          <div className="admin-lock-icon">
            <Lock size={32} color="var(--primary)" />
          </div>
          <div className="admin-login-title">Painel da Administradora</div>
          <div className="admin-login-sub">
            Área restrita para controle de comissões e pagamentos de saques via PIX.
          </div>

          <div className="admin-login-form">
            <input
              type="password"
              className="link-input"
              placeholder="Digite a senha de administradora"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button className="generate-btn" onClick={handleLogin}>
              <Shield size={18} /> Entrar no Painel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Top Header Admin */}
      <div className="admin-topbar">
        <button className="admin-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar ao App
        </button>
        <div className="admin-badge-live">
          <Shield size={14} /> Modo Admin Ativo
        </div>
      </div>

      <div className="section-title">Painel Administrativo</div>
      <div className="section-subtitle">Gestão de Lucro (65%), Cashback (35%) e Saques PIX</div>

      {/* Grid de Métricas Financeiras */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card green">
          <div className="am-label">💼 Seu Lucro Líquido (65%)</div>
          <div className="am-value">{formatCurrency(totalOwnerProfit)}</div>
          <div className="am-sub">Baseado em {purchases.length} compra(s)</div>
        </div>

        <div className="admin-metric-card blue">
          <div className="am-label">🎁 Cashback Usuários (35%)</div>
          <div className="am-value">{formatCurrency(totalUserCashback)}</div>
          <div className="am-sub">Comissões totais: {formatCurrency(totalGrossCommissions)}</div>
        </div>

        <div className="admin-metric-card orange">
          <div className="am-label">⏳ Saques PIX Pendentes</div>
          <div className="am-value">{formatCurrency(totalPendingAmount)}</div>
          <div className="am-sub">{pendingList.length} solicitação(ões) aguardando</div>
        </div>

        <div className="admin-metric-card purple">
          <div className="am-label">💸 Total Pago via PIX</div>
          <div className="am-value">{formatCurrency(totalPaid)}</div>
          <div className="am-sub">Transferências concluídas</div>
        </div>
      </div>

      {/* Abas do Admin */}
      <div className="platform-tabs">
        <button
          className={`platform-tab ${adminTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setAdminTab('withdrawals')}
        >
          <DollarSign size={16} />
          Saques PIX ({pendingList.length})
        </button>
        <button
          className={`platform-tab ${adminTab === 'commissions' ? 'active' : ''}`}
          onClick={() => setAdminTab('commissions')}
        >
          <ShoppingBag size={16} />
          Vendas ({purchases.length})
        </button>
        <button
          className={`platform-tab ${adminTab === 'automation' ? 'active' : ''}`}
          onClick={() => setAdminTab('automation')}
        >
          <Zap size={16} />
          Automação PIX
        </button>
      </div>

      {/* Conteúdo da Aba 1: Saques PIX */}
      {adminTab === 'withdrawals' && (
        <div className="admin-section">
          {withdrawals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💸</div>
              <div className="empty-state-title">Nenhum pedido de saque ainda</div>
              <div className="empty-state-text">
                Assim que um usuário solicitar saque na aba Meu Saldo, ele aparecerá aqui com a chave PIX pronta para você pagar!
              </div>
            </div>
          ) : (
            withdrawals.map(w => (
              <div key={w.id} className={`admin-payout-card ${w.status === 'paid' ? 'paid' : 'pending'}`}>
                <div className="ap-header">
                  <div className="ap-user-info">
                    <span className="ap-name">{w.userName}</span>
                    <span className="ap-date">{w.createdAt}</span>
                  </div>
                  <div className={`ap-status-badge ${w.status === 'paid' ? 'paid' : 'pending'}`}>
                    {w.status === 'paid' ? 'Pago ✅' : 'Pendente ⏳'}
                  </div>
                </div>

                <div className="ap-amount-row">
                  <span className="ap-amount-label">Valor a transferir:</span>
                  <span className="ap-amount-val">{formatCurrency(w.amount)}</span>
                  <button
                    className="copy-mini-btn"
                    onClick={() => copyText(w.amount.toFixed(2), 'Valor')}
                    title="Copiar valor"
                  >
                    <Copy size={13} /> Copiar R$
                  </button>
                </div>

                <div className="ap-pix-box">
                  <div className="ap-pix-label">
                    Chave PIX ({w.pixType.toUpperCase()}):
                  </div>
                  <div className="ap-pix-key">{w.pixKey}</div>
                  <button
                    className="copy-mini-btn primary"
                    onClick={() => copyText(w.pixKey, 'Chave PIX')}
                  >
                    <Copy size={14} /> Copiar Chave PIX
                  </button>
                </div>

                {w.status === 'pending' ? (
                  <button
                    className="pay-confirm-btn"
                    onClick={() => handleMarkAsPaid(w.id)}
                  >
                    <CheckCircle size={16} /> Confirmar Pagamento Realizado
                  </button>
                ) : (
                  <div className="ap-paid-time">
                    Pago em: {w.paidAt}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Comissões e Links */}
      {adminTab === 'commissions' && (
        <div className="admin-section">
          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Nenhuma compra registrada</div>
              <div className="empty-state-text">Gere links na aba Início para ver as comissões divididas aqui.</div>
            </div>
          ) : (
            purchases.map(p => {
              const gross = p.totalCommission || (p.cashback / USER_COMMISSION_SHARE)
              const owner = p.ownerProfit || (gross * OWNER_COMMISSION_SHARE)
              return (
                <div key={p.id} className="admin-sale-card">
                  <div className="as-header">
                    <span className="as-platform">{p.platform === 'ml' ? 'Mercado Livre' : 'Shopee'}</span>
                    <span className="as-date">{p.date}</span>
                  </div>

                  <div className="as-product">
                    {p.categoryIcon} {p.productName}
                  </div>

                  <div className="as-split-grid">
                    <div className="as-split-item gross">
                      <span className="as-s-label">Comissão Total (100%)</span>
                      <span className="as-s-val">{formatCurrency(gross)}</span>
                    </div>
                    <div className="as-split-item owner">
                      <span className="as-s-label">Seu Lucro (65%)</span>
                      <span className="as-s-val">{formatCurrency(owner)}</span>
                    </div>
                    <div className="as-split-item user">
                      <span className="as-s-label">Cashback Usuário (35%)</span>
                      <span className="as-s-val">{formatCurrency(p.cashback)}</span>
                    </div>
                  </div>

                  <div className="as-footer">
                    <span className={`as-status ${p.status === 'approved' ? 'approved' : 'pending'}`}>
                      {p.status === 'approved' ? 'Status: Aprovado ✅' : 'Status: Aguardando 60 dias ⏳'}
                    </span>
                    {p.status === 'pending' && (
                      <button
                        className="as-approve-btn"
                        onClick={() => handleApproveCommission(p.id)}
                      >
                        Aprovar Saldo
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: Automação de Pagamentos */}
      {adminTab === 'automation' && (
        <div className="admin-automation-card">
          <div className="aa-icon">⚡</div>
          <div className="aa-title">Automação de Pagamentos PIX</div>
          <div className="aa-desc">
            Atualmente, o processo funciona de forma <strong>semiautomática e segura</strong>:
            o usuário pede o saque, você copia a chave PIX dele com 1 clique e faz a transferência pelo seu banco.
          </div>

          <div className="aa-steps">
            <div className="aa-step-item">
              <span className="step-num">1</span>
              <div>
                <strong>Etapa Atual (Manual Segura):</strong> Você confere os pedidos na aba Saques, copia a chave PIX e confirma após transferir.
              </div>
            </div>
            <div className="aa-step-item">
              <span className="step-num">2</span>
              <div>
                <strong>Próxima Etapa (Automação 100%):</strong> Conexão com API PIX (como <em>Mercado Pago</em>, <em>Asaas</em> ou <em>EFI Bank</em>). O app fará o PIX sozinho diretamente para a conta da pessoa sem você precisar abrir o banco!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Main App ----
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  const navItems = [
    { id: 'home' as Tab, icon: <Home size={22} />, label: 'Início' },
    { id: 'purchases' as Tab, icon: <ShoppingBag size={22} />, label: 'Minhas Compras' },
    { id: 'balance' as Tab, icon: <Wallet size={22} />, label: 'Meu Saldo' },
    { id: 'settings' as Tab, icon: <Settings size={22} />, label: 'Configurações' },
  ]

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="header-logo-container">
            <div className="header-logo">
              <LogoIcon />
              <div className="logo-text">
                <span className="bn">BN</span><span className="cb">cashback</span>
              </div>
            </div>
            {/* Atalho discreto de Admin */}
            <button
              className="admin-header-btn"
              onClick={() => setActiveTab('admin')}
              title="Painel da Administradora"
            >
              <Shield size={16} />
            </button>
          </div>
          <div className="header-tagline">Compre, ganhe cashback! 🎯</div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'purchases' && <PurchasesPage />}
          {activeTab === 'balance' && <BalancePage />}
          {activeTab === 'settings' && <SettingsPage onOpenAdmin={() => setActiveTab('admin')} />}
          {activeTab === 'admin' && <AdminPage onBack={() => setActiveTab('settings')} />}
        </main>

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}
