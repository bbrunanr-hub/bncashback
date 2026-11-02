import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { Home, ShoppingBag, Wallet, Settings, Link2, CheckCircle, Copy, ChevronRight, Bell, User, Key, HelpCircle, LogOut, Zap, TrendingUp } from 'lucide-react'
import './index.css'

type Platform = 'ml' | 'shopee'
type Tab = 'home' | 'purchases' | 'balance' | 'settings'
type ProcessState = 'idle' | 'processing' | 'done' | 'error'

const ML_AFFILIATE_TAG = 'bncashback-20'
const SHOPEE_AFFILIATE_TAG = 'bncashback'
const CASHBACK_RATE = 0.025 // 2.5%
const CASHBACK_RATE_PCT = '2,5%'

interface Purchase {
  id: string
  platform: Platform
  productName: string
  originalLink: string
  affiliateLink: string
  price: number
  cashback: number
  status: 'pending' | 'approved'
  date: string
}

// ---- Affiliate Link Generator ----
function generateAffiliateLink(url: string, platform: Platform): string {
  try {
    const parsed = new URL(url)
    if (platform === 'ml') {
      // Mercado Livre: add tracking param
      parsed.searchParams.set('LID', ML_AFFILIATE_TAG)
      parsed.searchParams.set('affId', ML_AFFILIATE_TAG)
      return parsed.toString()
    } else if (platform === 'shopee') {
      // Shopee: use deep-link redirect format
      return `https://shope.ee/affiliate?url=${encodeURIComponent(url)}&tag=${SHOPEE_AFFILIATE_TAG}`
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
    
    // Estimate price from URL (mock) or use base estimate
    const estimatedPrice = 120 + Math.random() * 380
    const cashback = estimatedPrice * CASHBACK_RATE

    setAffiliateLink(generated)
    setCashbackAmount(cashback)
    setTotalFound(prev => prev + cashback)
    setTotalPending(prev => prev + cashback)
    setProcessState('done')

    // Save to purchases
    const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    const newPurchase: Purchase = {
      id: crypto.randomUUID(),
      platform: activePlatform,
      productName: activePlatform === 'ml' ? 'Produto Mercado Livre' : 'Produto Shopee',
      originalLink: linkInput.trim(),
      affiliateLink: generated,
      price: estimatedPrice,
      cashback,
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

      {/* Result */}
      {processState === 'done' && affiliateLink && (
        <div className="affiliate-result">
          <div className="affiliate-result-header">
            <CheckCircle size={18} />
            Link com cashback gerado!
          </div>
          <div className="affiliate-link-box">{affiliateLink}</div>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? <><CheckCircle size={16} /> Copiado!</> : <><Copy size={16} /> Copiar link de cashback</>}
          </button>
          <div className="cashback-chip">
            <TrendingUp size={14} />
            Cashback estimado: {formatCurrency(cashbackAmount)} ({CASHBACK_RATE_PCT})
          </div>
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

      {/* Info Box */}
      <div className="info-box">
        <div className="info-icon">i</div>
        <div className="info-text">
          Devido à política de entrega dos marketplaces, precisamos esperar a liberação dos valores após as entregas com sucesso. Eles fazem isso dentro de <strong>um mês</strong>.
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
            <div className="purchase-name">{p.productName}</div>
            <div className="purchase-date">{p.date}</div>
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

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    setPurchases(data)
  }, [])

  const totalPending = purchases.filter(p => p.status === 'pending').reduce((a, p) => a + p.cashback, 0)
  const totalApproved = purchases.filter(p => p.status === 'approved').reduce((a, p) => a + p.cashback, 0)
  const totalAll = purchases.reduce((a, p) => a + p.cashback, 0)

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
        onClick={() => toast.info('Saque disponível quando o saldo for aprovado pelos marketplaces (até 30 dias)')}
      >
        💸 Solicitar Saque via PIX
      </button>

      <div className="info-box">
        <div className="info-icon">i</div>
        <div className="info-text">
          O saldo é liberado após a confirmação de entrega dos produtos. Geralmente em <strong>até 30 dias</strong>. Você pode solicitar saque via PIX quando aprovado.
        </div>
      </div>

      {purchases.length === 0 && (
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
function SettingsPage() {
  const handleClearData = () => {
    if (confirm('Deseja apagar todo o histórico de compras? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('bn_purchases')
      toast.success('Histórico apagado com sucesso')
    }
  }

  const items = [
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
      action: () => toast.info('Em breve! Configure sua chave PIX para receber cashback.')
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
      sub: 'Apagar todas as compras salvas',
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
          <div className="header-logo">
            <LogoIcon />
            <div className="logo-text">
              <span className="bn">BN</span><span className="cb">cashback</span>
            </div>
          </div>
          <div className="header-tagline">Compre, ganhe cashback! 🎯</div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'purchases' && <PurchasesPage />}
          {activeTab === 'balance' && <BalancePage />}
          {activeTab === 'settings' && <SettingsPage />}
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
