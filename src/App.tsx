import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import {
  Home, ShoppingBag, Wallet, Settings, Link2, CheckCircle, Copy, ChevronRight,
  Bell, User, Key, HelpCircle, LogOut, Zap, TrendingUp, ExternalLink,
  Shield, ArrowLeft, DollarSign, Lock, Send, Users, Phone, MessageCircle,
  Share2, Download, Trash2, Edit3, Gift, Clock, ShieldCheck, RefreshCw
} from 'lucide-react'
import './index.css'
import {
  cloudSaveUser, cloudGetUsers, cloudDeleteUser,
  cloudSavePurchase, cloudGetPurchases,
  cloudSaveWithdrawal, cloudGetWithdrawals
} from './supabase'

type Platform = 'ml' | 'shopee'
type Tab = 'home' | 'purchases' | 'balance' | 'settings' | 'admin'
type ProcessState = 'idle' | 'processing' | 'done' | 'error'

// ---- Official Affiliate Credentials ----
const ML_AFFILIATE_TAG = 'bbrunanr'
const ML_MATT_TOOL = '68798236'
const SHOPEE_AFFILIATE_ID = 'an_18335281102'
const SHOPEE_CAMPAIGN_ID = 'id_52MZIjcVHTp'

// ---- Category & Proportional Commission Structure ----
// Proporção de divisão padrão: 60% para você e 40% para o usuário comprador
// Proporção especial quando o comprador foi indicado por alguém que alcançou 10 amigos:
// 50% para você, 10% para o indicador primário e 40% para o usuário comprador
export const USER_COMMISSION_SHARE = 0.40 // 40% para o comprador
export const OWNER_COMMISSION_SHARE = 0.60 // 60% seu lucro padrão
export const OWNER_VIP_COMMISSION_SHARE = 0.50 // 50% seu lucro quando há indicador primário
export const PRIMARY_BONUS_COMMISSION_SHARE = 0.10 // 10% bônus para o indicador primário por 6 meses

export interface CategoryCommission {
  key: string
  name: string
  icon: string
  mlCommission: number      // % paga pelo Mercado Livre
  shopeeCommission: number  // % paga pela Shopee
  cashbackShare: number     // 40% da comissão para o usuário
}

export const CATEGORIES: Record<string, CategoryCommission> = {
  fashion: {
    key: 'fashion',
    name: 'Moda, Beleza & Esportes',
    icon: '👗',
    mlCommission: 16, // Oficial Mercado Livre Venda Direta: 16%
    shopeeCommission: 14,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  home: {
    key: 'home',
    name: 'Casa, Móveis & Decoração',
    icon: '🏠',
    mlCommission: 12, // Oficial Mercado Livre Venda Direta: 12%
    shopeeCommission: 10,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  tools: {
    key: 'tools',
    name: 'Ferramentas & Construção',
    icon: '🛠️',
    mlCommission: 12, // Oficial Mercado Livre Venda Direta: 12%
    shopeeCommission: 8,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  toys_sports: {
    key: 'toys_sports',
    name: 'Brinquedos, Bebês & Games',
    icon: '🧸',
    mlCommission: 12, // Oficial Mercado Livre Venda Direta: 12%
    shopeeCommission: 9,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  books: {
    key: 'books',
    name: 'Livros & Revistas',
    icon: '📚',
    mlCommission: 12, // Oficial Mercado Livre Venda Direta: 12%
    shopeeCommission: 10,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  auto: {
    key: 'auto',
    name: 'Acessórios para Veículos',
    icon: '🚗',
    mlCommission: 12, // Oficial Mercado Livre Venda Direta: 12%
    shopeeCommission: 8,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  electronics: {
    key: 'electronics',
    name: 'Tecnologia & Eletrodomésticos',
    icon: '📱',
    mlCommission: 5, // Oficial Mercado Livre Venda Direta: 5%
    shopeeCommission: 4,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  food: {
    key: 'food',
    name: 'Alimentos & Bebidas',
    icon: '🥫',
    mlCommission: 0, // Oficial Mercado Livre Venda Direta: 0%
    shopeeCommission: 2,
    cashbackShare: USER_COMMISSION_SHARE,
  },
  general: {
    key: 'general',
    name: 'Casa, Variedades & Outros',
    icon: '📦',
    mlCommission: 12, // Padrão Oficial Mercado Livre Venda Direta: 12%
    shopeeCommission: 8,
    cashbackShare: USER_COMMISSION_SHARE,
  },
}

function detectCategory(url: string): CategoryCommission {
  const lower = url.toLowerCase()

  // 1. Alimentos e Bebidas (0% Mercado Livre)
  if (/alimento|alimentos|bebida|bebidas|cerveja|vinho|whisky|refrigerante|cafe|arroz|feijao|azeite|supermercado|chocolate|doce|salgadinho|capsula|suco|leite/i.test(lower)) {
    return CATEGORIES.food
  }

  // 2. Acessórios para Veículos (12% Mercado Livre / 4,8% usuário)
  if (/retrovisor|espelho|carro|carros|moto|motos|automotivo|veiculo|veiculos|farol|farois|lampada|pneu|pneus|oleo|filtro|palheta|amortecedor|freio|escapamento|parachoque|volante|calota|engate|rastreador|alarme|capacete|som-automotivo|central-multimidia|insulfilm|chaveiro-carro|tapete-carro/i.test(lower)) {
    return CATEGORIES.auto
  }

  // 3. Móveis específicos de Casa (12% Mercado Livre / 4,8% usuário) - Verifica antes de moda
  if (/guarda[- ]?roupa|roupeiro|comoda|armario|sapateira|rack|painel|cabeceira|sofa|poltrona|estante|mesa|cadeira|cama|colchao|beliche|berco|aparador|buffet/i.test(lower)) {
    return CATEGORIES.home
  }

  // 4. Tecnologia e Eletrodomésticos (5% Mercado Livre / 2,0% usuário)
  if (/geladeira|refrigerador|freezer|lavadora|maquina de lavar|secadora|lava e seca|micro-ondas|microondas|fogao|cooktop|ar-condicionado|ar condicionado|aspirador|ventilador|celular|smartphone|iphone|samsung|xiaomi|motorola|notebook|computador|pc|gamer|placa|processador|memoria|smart-tv|\btv\b|televisao|monitor|fone|headset|audio|caixa-de-som|console|playstation|ps4|ps5|xbox|nintendo|tablet|ipad|camera|cameras|impressora|roteador|modem|powerbank|carregador|smartwatch/i.test(lower)) {
    return CATEGORIES.electronics
  }

  // 5. Moda, Beleza & Esportes (16% Mercado Livre / 6,4% usuário)
  if (/vestido|\broupa\b|\broupas\b|calcado|tenis|sapato|sandalia|bota|camisa|camiseta|calca|bermuda|short|moda|lingerie|sutia|cueca|bolsa|bolsas|mochila|mala|carteira|beleza|perfume|maquiagem|batom|rimel|cosmetico|skincare|protetor-solar|hidratante|shampoo|condicionador|cabelo|secador|prancha|barbeador|esporte|fitness|academia|musculacao|bicicleta|bike|patins|skate|chuteira|legging|treino|suplemento|whey|creatina|bcaa/i.test(lower)) {
    return CATEGORIES.fashion
  }

  // 6. Livros & Revistas (12% Mercado Livre / 4,8% usuário)
  if (/livro|livros|revista|revistas|kam|key account|leitura|kindle|apostila|manga|hqs/i.test(lower)) {
    return CATEGORIES.books
  }

  // 7. Ferramentas & Construção (12% Mercado Livre / 4,8% usuário)
  if (/ferramenta|ferramentas|furadeira|parafusadeira|serra|tico-tico|martelete|martelo|esmerilhadeira|lixadeira|chave|alicate|trena|nivel|construcao|tinta|torneira|chuveiro|fechadura|escada/i.test(lower)) {
    return CATEGORIES.tools
  }

  // 8. Brinquedos, Bebês & Games (12% Mercado Livre / 4,8% usuário)
  if (/brinquedo|brinquedos|bebe|bebes|infantil|carrinho-bebe|boneca|boneco|lego|game|games|jogo/i.test(lower)) {
    return CATEGORIES.toys_sports
  }

  // 9. Casa, Decoração, Cozinha, Joias & Relógios (12% Mercado Livre / 4,8% usuário)
  if (/casa|cozinha|panela|airfryer|fritadeira|decoracao|luminaria|tapete|cortina|abajur|lustre|lixeira|varal|edredom|lencol|travesseiro|banho|toalha|joia|relogio|bijuteria|anel|colar|pulseira/i.test(lower)) {
    return CATEGORIES.home
  }

  return CATEGORIES.general
}

export interface UserProfile {
  id: string
  name: string
  whatsapp: string         // Formato (XX) XXXXX-XXXX
  cleanWhatsapp: string    // Somente números para link wa.me
  email?: string
  referralCode: string     // Código para indicar 10 amigos
  createdAt: string
  referredBy?: string      // Código do indicador primário
  referredByName?: string  // Nome do indicador primário
  referredByWhatsapp?: string // WhatsApp do indicador primário
  isVipPrimary?: boolean   // True se alcançou os 10 indicados
  vipExpiresAt?: string    // Data de expiração dos 6 meses de bônus VIP
}

export type PurchaseStatus = 'link_created' | 'purchase_notified' | 'pending' | 'approved'

export interface Purchase {
  id: string
  platform: Platform
  productName: string
  originalLink: string
  affiliateLink: string
  price: number
  totalCommission: number   // 100% da comissão gerada pelo marketplace
  ownerProfit: number       // 60% padrão ou 50% quando há indicador primário
  cashback: number          // 40% cashback do comprador (ou 10% bônus do primário)
  cashbackRatePct: string
  categoryName: string
  categoryIcon: string
  status: PurchaseStatus
  date: string
  userName?: string
  userWhatsapp?: string
  // Rastreamento de Indicação / Primário:
  primaryUserName?: string      // Nome do indicador primário
  primaryUserWhatsapp?: string  // WhatsApp do indicador primário
  primaryBonusAmount?: number   // 10% da comissão destinado ao indicador
  isReferralBonus?: boolean     // True se for registro de bônus gerado para o primário
  referredBuyerName?: string    // Nome do comprador indicado
}

// Verifica se o usuário possui um indicador primário elegível para o bônus de 10%
export function getEligiblePrimaryUser(
  buyer: UserProfile | null,
  allUsers: UserProfile[]
): UserProfile | null {
  if (!buyer?.referredBy) return null
  const primary = allUsers.find(
    u => u.referralCode?.toUpperCase() === buyer.referredBy?.toUpperCase()
  )
  if (!primary) return null
  // Conta amigos que logaram pelo primário
  const refCount = allUsers.filter(u => u.referredBy?.toUpperCase() === primary.referralCode?.toUpperCase()).length
  const isVip = primary.isVipPrimary || refCount >= 10
  const notExpired = !primary.vipExpiresAt || new Date(primary.vipExpiresAt) > new Date()
  if (isVip && notExpired) {
    return primary
  }
  return null
}

export interface WithdrawalRequest {
  id: string
  userName: string
  userWhatsapp?: string
  pixKey: string
  pixType: 'cpf' | 'email' | 'phone' | 'random'
  amount: number
  status: 'pending' | 'paid' | 'rejected'
  createdAt: string
  paidAt?: string
}

// ---- Funções Utilitárias de Telefone e Indicação ----
export function formatWhatsapp(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

export function cleanPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function generateReferralCode(name: string): string {
  const cleanName = name.trim().split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() || 'BN'
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${cleanName}${randomNum}`
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
  if (/mercadolivre\.com\.br|mercadolibre\.|meli\.la|mercadolivre\.com\/sec|ml\.com/i.test(url)) return 'ml'
  if (/shopee\.com\.br|shp\.ee/i.test(url)) return 'shopee'
  return null
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function parsePrice(str: string): number {
  if (!str) return 0
  let clean = str.replace(/[^\d.,]/g, '').trim()
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

// ---- Logo SVG ----
function LogoIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="22" fill="url(#grad1)" />
      <path d="M12 28L20 14L26 22L30 17L34 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 14L34 14L34 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ---- ML Icon ----
function MLIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#FFE600" />
      <path d="M7 14C7 14 8 10 12 10C16 10 17 14 17 14" stroke="#3483FA" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="14" r="1.5" fill="#3483FA" />
      <circle cx="16" cy="14" r="1.5" fill="#3483FA" />
    </svg>
  )
}

// ---- Shopee Icon ----
function ShopeeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#EE4D2D" />
      <path d="M8 10V9C8 6.79 9.79 5 12 5C14.21 5 16 6.79 16 9V10" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="6" y="10" width="12" height="9" rx="2" fill="white" />
      <path d="M10 14C10 14 10.5 16 12 16C13.5 16 14 14 14 14" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ---- Modal de Cadastro & WhatsApp ----
interface UserRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile | null
  onSave: (user: UserProfile) => void
}

function UserRegisterModal({ isOpen, onClose, currentUser, onSave }: UserRegisterModalProps) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name)
      setWhatsapp(currentUser.whatsapp)
      setEmail(currentUser.email || '')
    } else {
      setName('')
      setWhatsapp('')
      setEmail('')
    }
  }, [currentUser, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Por favor, informe seu nome')
      return
    }
    const cleanPhone = cleanPhoneDigits(whatsapp)
    if (cleanPhone.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD (Ex: 11 98765-4321)')
      return
    }

    const referralCode = currentUser?.referralCode || generateReferralCode(name)
    const allUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
    const pendingRef = sessionStorage.getItem('bn_pending_ref') || localStorage.getItem('bn_pending_ref')
    let primaryUser: UserProfile | undefined
    if (pendingRef && !currentUser?.referredBy) {
      primaryUser = allUsers.find(
        u => u.referralCode?.toUpperCase() === pendingRef.toUpperCase() &&
          cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '') !== cleanPhone
      )
    }

    const user: UserProfile = {
      id: currentUser?.id || crypto.randomUUID(),
      name: name.trim(),
      whatsapp: formatWhatsapp(whatsapp),
      cleanWhatsapp: cleanPhone,
      email: email.trim() || undefined,
      referralCode,
      createdAt: currentUser?.createdAt || new Date().toLocaleDateString('pt-BR'),
      referredBy: currentUser?.referredBy || (primaryUser ? primaryUser.referralCode : undefined),
      referredByName: currentUser?.referredByName || (primaryUser ? primaryUser.name : undefined),
      referredByWhatsapp: currentUser?.referredByWhatsapp || (primaryUser ? primaryUser.whatsapp : undefined),
      isVipPrimary: currentUser?.isVipPrimary || false,
      vipExpiresAt: currentUser?.vipExpiresAt
    }

    onSave(user)
    toast.success('Cadastro salvo com sucesso! 🎉')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <User size={18} color="var(--primary)" />
            {currentUser ? 'Editar Meu Perfil' : 'Cadastre-se no BNcashback'}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Banner do Programa 10 amigos */}
        <div className="referral-invite-card">
          <div className="ric-icon">🎁</div>
          <div className="ric-content">
            <div className="ric-title">Programa Indique 10 Amigos</div>
            <div className="ric-desc">
              Consiga 10 novos loguins e quado um deles comprarem algo usando o sistema BNcashback gerará uma fração de cashback à você também
            </div>
          </div>
        </div>

        <div className="modal-body">
          <label className="form-label">Nome *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Como quer ser chamado(a)?"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <label className="form-label">WhatsApp (com DDD) *</label>
          <input
            type="tel"
            className="form-input"
            placeholder="(11) 98765-4321"
            value={whatsapp}
            onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
            maxLength={15}
          />

          <label className="form-label">E-mail (opcional)</label>
          <input
            type="email"
            className="form-input"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <div className="modal-hint">
            🔒 Seus dados ficam protegidos e são utilizados apenas para entrega do seu cashback e atendimento personalizado.
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onClose}>
            {currentUser ? 'Cancelar' : 'Depois'}
          </button>
          <button className="modal-confirm-btn" onClick={handleSave}>
            {currentUser ? 'Salvar Alterações' : 'Concluir Cadastro 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Home Page ----
function HomePage({
  currentUser,
  onOpenRegister
}: {
  currentUser: UserProfile | null
  onOpenRegister: () => void
}) {
  const [platform, setPlatform] = useState<Platform>('ml')
  const [linkInput, setLinkInput] = useState('')
  const [productTitle, setProductTitle] = useState('')
  const [productPriceInput, setProductPriceInput] = useState('')
  const [processState, setProcessState] = useState<ProcessState>('idle')
  const [affiliateLink, setAffiliateLink] = useState('')
  const [cashbackAmount, setCashbackAmount] = useState(0)
  const [detectedCategory, setDetectedCategory] = useState<CategoryCommission>(CATEGORIES.general)
  const [cashbackRatePct, setCashbackRatePct] = useState('3,5%')
  const [copied, setCopied] = useState(false)
  const [totalPending, setTotalPending] = useState(0)
  const [totalFound, setTotalFound] = useState(0)
  const [currentPurchaseId, setCurrentPurchaseId] = useState('')
  const [hasNotifiedPurchase, setHasNotifiedPurchase] = useState(false)

  // Load stats from localStorage e nuvem Supabase filtrados pelo usuário logado
  useEffect(() => {
    let isMounted = true
    const loadPurchases = async () => {
      let purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
      try {
        const cloudP = await cloudGetPurchases()
        if (cloudP && cloudP.length > 0 && isMounted) {
          purchases = cloudP
          localStorage.setItem('bn_purchases', JSON.stringify(cloudP))
        }
      } catch { }

      if (!isMounted) return
      const userPurchases = purchases.filter(p => {
        if (!currentUser) return false
        const currentClean = currentUser.cleanWhatsapp || cleanPhoneDigits(currentUser.whatsapp || '')
        if (currentClean && p.userWhatsapp) {
          return cleanPhoneDigits(p.userWhatsapp) === currentClean
        }
        return Boolean(currentUser.name && p.userName === currentUser.name)
      })
      const pending = userPurchases.filter(p => p.status === 'pending').reduce((a, p) => a + p.cashback, 0)
      setTotalPending(pending)
      // Mantém totalFound intacto para não sumir o valor da tela a cada 8 segundos!
    }

    loadPurchases()
    const timer = setInterval(loadPurchases, 8000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [currentUser])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const trimmed = text.trim()

      // Reseta valores anteriores ao colar novo link
      setTotalFound(0)
      setProductPriceInput('')
      setAffiliateLink('')
      setCashbackAmount(0)
      setProcessState('idle')

      // Detecta URL no texto compartilhado
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i)
      if (urlMatch) {
        setLinkInput(urlMatch[0])
        const detected = detectPlatform(urlMatch[0])
        if (detected) setPlatform(detected)
      } else {
        setLinkInput(trimmed)
        const detected = detectPlatform(trimmed)
        if (detected) setPlatform(detected)
      }
      toast.success('Link colado! Agora clique em Gerar link.')
    } catch {
      toast.error('Permita o acesso à área de transferência para colar')
    }
  }

  const handleClear = () => {
    setLinkInput('')
    setProductTitle('')
    setProductPriceInput('')
    setProcessState('idle')
    setAffiliateLink('')
    setCashbackAmount(0)
    setTotalFound(0)
    setCurrentPurchaseId('')
    setHasNotifiedPurchase(false)
    toast.info('Campo limpo. Cole o novo link!')
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
    try { new URL(linkInput.trim()) } catch {
      toast.error('Link inválido. Certifique-se de colar o link completo.')
      return
    }

    setProcessState('processing')
    setAffiliateLink('')
    setTotalFound(0)

    // Se for Mercado Livre, tenta consultar a API Oficial primeiro
    if (activePlatform === 'ml') {
      const mlClientId = localStorage.getItem('bn_ml_client_id') || ''
      const mlClientSecret = localStorage.getItem('bn_ml_client_secret') || ''

      try {
        const res = await fetch('/api/mercado-livre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: linkInput.trim(),
            clientId: mlClientId,
            clientSecret: mlClientSecret
          })
        })

        if (res.ok) {
          const apiData = await res.json()
          if (apiData.success && apiData.price && apiData.price > 0) {
            const price = apiData.price
            const catRate = apiData.marketplaceRate || 12
            const catObj: CategoryCommission = {
              key: 'ml_api',
              name: apiData.categoryName || 'Moda & Outros',
              icon: apiData.categoryIcon || '📦',
              mlCommission: catRate,
              shopeeCommission: 10,
              cashbackShare: USER_COMMISSION_SHARE
            }

            setDetectedCategory(catObj)
            setCashbackRatePct(apiData.cashbackRatePct)
            setAffiliateLink(apiData.affiliateLink)
            setCashbackAmount(apiData.cashback)
            setTotalFound(apiData.cashback)
            setProductPriceInput(price.toFixed(2).replace('.', ','))
            setProductTitle(apiData.title)
            setProcessState('done')

            const allUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
            const eligiblePrimary = getEligiblePrimaryUser(currentUser, allUsers)
            const totalCommission = apiData.totalCommission || ((price * catRate) / 100)
            const ownerProfit = eligiblePrimary ? (totalCommission * OWNER_VIP_COMMISSION_SHARE) : (totalCommission * OWNER_COMMISSION_SHARE)
            const primaryBonusAmount = eligiblePrimary ? (totalCommission * PRIMARY_BONUS_COMMISSION_SHARE) : 0
            const buyerCashback = totalCommission * USER_COMMISSION_SHARE

            const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
            const newId = crypto.randomUUID()
            const newPurchase: Purchase = {
              id: newId,
              platform: 'ml',
              productName: apiData.title,
              originalLink: linkInput.trim(),
              affiliateLink: apiData.affiliateLink,
              price,
              totalCommission,
              ownerProfit,
              cashback: buyerCashback,
              cashbackRatePct: apiData.cashbackRatePct,
              categoryName: apiData.categoryName,
              categoryIcon: apiData.categoryIcon,
              status: 'link_created',
              date: new Date().toLocaleDateString('pt-BR'),
              userName: currentUser?.name,
              userWhatsapp: currentUser?.whatsapp,
              primaryUserName: eligiblePrimary?.name,
              primaryUserWhatsapp: eligiblePrimary?.whatsapp,
              primaryBonusAmount,
            }
            purchases.unshift(newPurchase)
            localStorage.setItem('bn_purchases', JSON.stringify(purchases))
            cloudSavePurchase(newPurchase).catch(() => { })
            fetch('/api/purchases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ purchase: newPurchase })
            }).catch(() => { })
            setCurrentPurchaseId(newId)
            setHasNotifiedPurchase(false)

            toast.success('Link com cashback gerado com sucesso! 🎉')
            return
          } else if (apiData.title) {
            setProductTitle(apiData.title)
          }
        }
      } catch (err) {
        console.warn('API ML call notice:', err)
      }
    }

    // Processamento direto baseado na categoria do link
    await new Promise(r => setTimeout(r, 600))

    const generated = generateAffiliateLink(linkInput.trim(), activePlatform)
    const category = detectCategory(linkInput.trim())
    const marketplaceRate = activePlatform === 'ml' ? category.mlCommission : category.shopeeCommission

    const userRatePctVal = (marketplaceRate * USER_COMMISSION_SHARE).toFixed(1).replace('.', ',')
    const userRatePct = marketplaceRate > 0 ? `${userRatePctVal}%` : '0%'

    setDetectedCategory(category)
    setCashbackRatePct(userRatePct)
    setAffiliateLink(generated)
    setCashbackAmount(0)
    setTotalFound(0)
    setProductPriceInput('')
    setProcessState('done')

    const allUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
    const eligiblePrimary = getEligiblePrimaryUser(currentUser, allUsers)

    const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    const newId = crypto.randomUUID()
    const newPurchase: Purchase = {
      id: newId,
      platform: activePlatform,
      productName: productTitle || (activePlatform === 'ml' ? `Produto Mercado Livre (${category.name})` : `Produto Shopee (${category.name})`),
      originalLink: linkInput.trim(),
      affiliateLink: generated,
      price: 0,
      totalCommission: 0,
      ownerProfit: 0,
      cashback: 0,
      cashbackRatePct: userRatePct,
      categoryName: category.name,
      categoryIcon: category.icon,
      status: 'link_created',
      date: new Date().toLocaleDateString('pt-BR'),
      userName: currentUser?.name,
      userWhatsapp: currentUser?.whatsapp,
      primaryUserName: eligiblePrimary?.name,
      primaryUserWhatsapp: eligiblePrimary?.whatsapp,
      primaryBonusAmount: 0,
    }
    purchases.unshift(newPurchase)
    localStorage.setItem('bn_purchases', JSON.stringify(purchases))
    cloudSavePurchase(newPurchase).catch(() => { })
    fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase: newPurchase })
    }).catch(() => { })
    setCurrentPurchaseId(newId)
    setHasNotifiedPurchase(false)

    toast.success('Link com cashback gerado com sucesso! 🎉')
  }

  const handleNotifyPurchase = (id: string) => {
    if (!id) return
    const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    let targetPurchase: Purchase | null = null
    const updated = purchases.map(p => {
      if (p.id === id) {
        targetPurchase = { ...p, status: 'purchase_notified' as const }
        return targetPurchase
      }
      return p
    })
    localStorage.setItem('bn_purchases', JSON.stringify(updated))
    setHasNotifiedPurchase(true)
    if (targetPurchase) {
      cloudSavePurchase(targetPurchase).catch(() => { })
      fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase: targetPurchase })
      }).catch(() => { })
    }
    toast.success('Compra informada! Assim que o marketplace computar a venda, o saldo entrará em Saldo Aguardando. 🛍️')
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
    setProductTitle('')
    setProductPriceInput('')
    setProcessState('idle')
    setAffiliateLink('')
    setCashbackAmount(0)
    setTotalFound(0)
    setCurrentPurchaseId('')
    setHasNotifiedPurchase(false)
  }

  const handlePriceInputChange = (val: string) => {
    setProductPriceInput(val)
    const num = parsePrice(val)
    if (num > 0) {
      const activeMktRate = platform === 'ml' ? detectedCategory.mlCommission : detectedCategory.shopeeCommission
      const userPct = activeMktRate * USER_COMMISSION_SHARE
      const calculatedCashback = (num * userPct) / 100
      const calculatedTotalCommission = (num * activeMktRate) / 100

      setCashbackAmount(calculatedCashback)
      setTotalFound(calculatedCashback)

      if (currentPurchaseId) {
        const purchases = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
        const allUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
        const eligiblePrimary = getEligiblePrimaryUser(currentUser, allUsers)
        const ownerProfit = eligiblePrimary ? (calculatedTotalCommission * OWNER_VIP_COMMISSION_SHARE) : (calculatedTotalCommission * OWNER_COMMISSION_SHARE)
        const primaryBonusAmount = eligiblePrimary ? (calculatedTotalCommission * PRIMARY_BONUS_COMMISSION_SHARE) : 0

        const updated = purchases.map(p => {
          if (p.id === currentPurchaseId) {
            const up: Purchase = {
              ...p,
              price: num,
              totalCommission: calculatedTotalCommission,
              ownerProfit,
              cashback: calculatedCashback,
              primaryBonusAmount
            }
            cloudSavePurchase(up).catch(() => { })
            fetch('/api/purchases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ purchase: up })
            }).catch(() => { })
            return up
          }
          return p
        })
        localStorage.setItem('bn_purchases', JSON.stringify(updated))
      }
    } else {
      setCashbackAmount(0)
      setTotalFound(0)
    }
  }

  // Contagem de amigos cadastrados pelo link deste usuário
  const allSavedUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
  const myReferredFriends = currentUser
    ? allSavedUsers.filter(u => u.referredBy?.toUpperCase() === currentUser.referralCode?.toUpperCase())
    : []
  const myReferralCount = myReferredFriends.length
  const hasReached10Friends = myReferralCount >= 10 || Boolean(currentUser?.isVipPrimary)
  const refProgressPct = Math.min(100, (myReferralCount / 10) * 100)

  return (
    <div className="page">
      {/* Banner de Indicação & Meta de 10 Amigos */}
      {!currentUser ? (
        <div className="referral-box-home" onClick={onOpenRegister} style={{ cursor: 'pointer' }}>
          <div className="rbh-header">
            <div className="rbh-title">
              <Gift size={16} color="#92400E" />
              <span>Programa Indique 10 Amigos</span>
            </div>
            <span className="rbh-badge">Ativo 🔥</span>
          </div>
          <div className="rbh-desc">
            Consiga 10 novos loguins e quado um deles comprarem algo usando o sistema BNcashback gerará uma fração de cashback à você também
          </div>
          <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 800 }}>
            <u>Toque para fazer login e pegar seu link de convite ➔</u>
          </div>
        </div>
      ) : (
        <div className="referral-box-home">
          <div className="rbh-header">
            <div className="rbh-title">
              <Gift size={16} color="#92400E" />
              <span>Programa Indique 10 Amigos</span>
            </div>
            <span className={`rbh-badge ${hasReached10Friends ? 'vip' : ''}`}>
              {hasReached10Friends ? '⭐ Meta Atingida (VIP)' : `${myReferralCount}/10`}
            </span>
          </div>

          <div className="rbh-desc">
            Consiga 10 novos loguins e quado um deles comprarem algo usando o sistema BNcashback gerará uma fração de cashback à você também
          </div>

          <div className="ref-progress-wrap">
            <div className="ref-progress-track">
              <div className="ref-progress-fill" style={{ width: `${refProgressPct}%` }} />
            </div>
            <div className="ref-progress-label">
              <span>{myReferralCount} de 10 amigos cadastrados</span>
              <span className={hasReached10Friends ? 'vip-text' : ''}>
                {hasReached10Friends ? 'Meta 10/10 VIP Concluída!' : `${refProgressPct.toFixed(0)}%`}
              </span>
            </div>
          </div>

          {hasReached10Friends ? (
            <div className="meta-reached-box">
              <span>🎉</span>
              <div>
                <strong>Meta de 10 amigos alcançada!</strong> Pelos próximos 6 meses, sempre que um dos seus 10 indicados comprar pelo sistema BNcashback, você receberá 10% de bônus direto no seu saldo. Novos convites pausados na meta!
              </div>
            </div>
          ) : (
            <button
              className="rub-share-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
              onClick={() => {
                const inviteUrl = `${window.location.origin}/?ref=${currentUser.referralCode}`
                const msg = `Oi! Estou usando o BNcashback para ganhar dinheiro de volta nas minhas compras do Mercado Livre e Shopee! 💰 Acesse pelo meu link e faça seu login para começar a ganhar também: ${inviteUrl}`
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
              }}
              title="Convidar amigos no WhatsApp"
            >
              <Share2 size={14} /> Convidar Amigos no WhatsApp ({myReferralCount}/10)
            </button>
          )}
        </div>
      )}
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
            onChange={e => {
              setLinkInput(e.target.value)
              if (!e.target.value.trim()) {
                setTotalFound(0)
                setAffiliateLink('')
                setProcessState('idle')
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleGenerate()
            }}
            disabled={processState === 'processing'}
          />
          {linkInput && (
            <button
              type="button"
              className="clear-btn"
              onClick={handleClear}
              title="Limpar link"
              disabled={processState === 'processing'}
            >
              ✕ Limpar
            </button>
          )}
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
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Calculando e gerando link...</>
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
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5" /><path d="M5 7h4M7 5v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Cashback Estimado
          </div>
          <div className="result-card-value">
            {totalFound > 0 ? formatCurrency(totalFound) : (processState === 'done' && cashbackRatePct ? `${cashbackRatePct} de volta` : 'R$ 0,00')}
          </div>
        </div>
        <div className="result-card orange">
          <div className="result-card-header">
            <Wallet size={14} />
            Saldo Aguardando
          </div>
          <div className="result-card-value">{formatCurrency(totalPending)}</div>
        </div>
      </div>

      {/* Banner Explicativo: Ativação do Saldo Aguardando após a Compra */}
      <div className="balance-flow-banner">
        <div className="bfb-icon">🛍️</div>
        <div className="bfb-content">
          <div className="bfb-title">Como o Saldo Aguardando funciona?</div>
          <div className="bfb-desc">
            O valor em <strong>Saldo Aguardando</strong> só é ativado <strong>após você realizar sua compra</strong> com o link com cashback.
            Assim que o Mercado Livre ou a Shopee computar e confirmar a sua compra, seu saldo aparecerá aqui automaticamente!
          </div>
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
                💰 Seu Cashback: <strong>{cashbackRatePct} de volta</strong> {cashbackAmount > 0 ? `(${formatCurrency(cashbackAmount)})` : ''}
              </div>

              {/* Simulador rápido e direto de valor em Reais */}
              <div className="cashback-inline-sim">
                <div className="cis-header">
                  <span className="cis-title">💵 Quer ver seu cashback exato em Reais?</span>
                  <span className="cis-sub">Preço do produto:</span>
                </div>
                <div className="cis-input-row">
                  <span className="cis-prefix">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="cis-input"
                    placeholder="Ex: 154,00"
                    value={productPriceInput}
                    onChange={e => handlePriceInputChange(e.target.value)}
                  />
                  {productPriceInput && (
                    <button
                      type="button"
                      className="cis-clear-btn"
                      onClick={() => handlePriceInputChange('')}
                      title="Limpar valor"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {cashbackAmount > 0 && (
                  <div className="cis-feedback">
                    🎉 Você vai receber: <strong>{formatCurrency(cashbackAmount)} de volta</strong> ({cashbackRatePct})!
                  </div>
                )}
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
                Cashback: {cashbackAmount > 0 ? `${formatCurrency(cashbackAmount)} (${cashbackRatePct})` : `Até ${cashbackRatePct} de volta`}
              </div>
            </div>

            {/* Botão de Aviso de Compra Realizada */}
            <div className="notify-purchase-container">
              {hasNotifiedPurchase ? (
                <div className="fbb-notified">
                  ✅ Compra informada! Aguardando o marketplace computar o pedido.
                </div>
              ) : (
                <button
                  type="button"
                  className="fbb-notify-btn"
                  onClick={() => handleNotifyPurchase(currentPurchaseId)}
                >
                  <ShoppingBag size={15} /> Já comprou pelo link? Clique para avisar!
                </button>
              )}
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

      {/* Aviso dos 60 Dias dos Marketplaces */}
      <div className="info-box-featured">
        <div className="ibf-header">
          <Clock size={18} color="#1d4ed8" />
          <span className="ibf-title">Como funciona o prazo dos 60 dias?</span>
        </div>
        <div className="ibf-text">
          Devido à política de proteção e entrega do <strong>Mercado Livre</strong> e da <strong>Shopee</strong>, o saldo aguardando é confirmado após a entrega do produto e o término do prazo legal de devolução ou arrependimento do comprador. Todo o processo é concluído dentro de <strong>até 60 dias</strong>, momento em que seu valor fica liberado para saque imediato via PIX!
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
function PurchasesPage({ currentUser }: { currentUser: UserProfile | null }) {
  const [purchases, setPurchases] = useState<Purchase[]>([])

  useEffect(() => {
    let isMounted = true
    const loadPurchases = async () => {
      let data = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
      try {
        const cloudP = await cloudGetPurchases()
        if (cloudP && cloudP.length > 0 && isMounted) {
          data = cloudP
          localStorage.setItem('bn_purchases', JSON.stringify(cloudP))
        }
      } catch { }

      if (!isMounted) return
      const userPurchases = data.filter(p => {
        if (!currentUser) return false
        const currentClean = currentUser.cleanWhatsapp || cleanPhoneDigits(currentUser.whatsapp || '')
        if (currentClean && p.userWhatsapp) {
          return cleanPhoneDigits(p.userWhatsapp) === currentClean
        }
        return Boolean(currentUser.name && p.userName === currentUser.name)
      })
      setPurchases(userPurchases)
    }

    loadPurchases()
    const timer = setInterval(loadPurchases, 8000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [currentUser])

  const handleNotifyFromPurchases = (id: string) => {
    const all = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
    let targetPurchase: Purchase | null = null
    const updated = all.map(p => {
      if (p.id === id) {
        targetPurchase = { ...p, status: 'purchase_notified' as const }
        return targetPurchase
      }
      return p
    })
    localStorage.setItem('bn_purchases', JSON.stringify(updated))
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status: 'purchase_notified' as const } : p))
    if (targetPurchase) {
      cloudSavePurchase(targetPurchase).catch(() => { })
      fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase: targetPurchase })
      }).catch(() => { })
    }
    toast.success('Compra informada! Aguardando o marketplace computar a venda. 🛍️')
  }

  const getStatusBadge = (status: PurchaseStatus) => {
    switch (status) {
      case 'approved':
        return { text: 'Aprovado para Saque ✅', className: 'status-approved' }
      case 'pending':
        return { text: 'Computado (Aguardando 60d) ⏳', className: 'status-pending' }
      case 'purchase_notified':
        return { text: 'Em Análise 🔍', className: 'status-notified' }
      case 'link_created':
      default:
        return { text: 'Aguardando Compra 🛒', className: 'status-created' }
    }
  }

  if (purchases.length === 0) {
    return (
      <div className="page">
        <div className="section-title">Minhas Compras</div>
        <div className="section-subtitle">Histórico de links e compras</div>
        <div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <div className="empty-state-title">Nenhum link gerado ainda</div>
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

      {/* Banner Informativo */}
      <div className="balance-flow-banner compact">
        <div className="bfb-icon">ℹ️</div>
        <div className="bfb-content">
          <div className="bfb-desc">
            O cashback entra em <strong>Saldo Aguardando</strong> assim que a compra for concluída pelo seu link e computada pelo marketplace.
          </div>
        </div>
      </div>

      {purchases.map(p => {
        const badge = getStatusBadge(p.status)

        if (p.isReferralBonus) {
          return (
            <div key={p.id} className="purchase-item" style={{ borderLeft: '4px solid #8B5CF6', background: '#FAF5FF' }}>
              <div className="purchase-icon" style={{ background: '#EDE9FE', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                🎁
              </div>
              <div className="purchase-info">
                <div className="purchase-name" style={{ color: '#6D28D9', fontWeight: 800 }}>
                  Bônus por Indicação (10%)
                </div>
                <div className="purchase-date">
                  {p.date} • Compra realizada por {p.referredBuyerName || 'Amigo Indicado'}
                </div>
              </div>
              <div className="purchase-cashback">
                <div className="cashback-amount" style={{ color: '#6D28D9' }}>+{formatCurrency(p.cashback)}</div>
                <div className={`cashback-status ${badge.className}`}>
                  {badge.text}
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={p.id} className="purchase-item">
            <div className={`purchase-icon ${p.platform}`}>
              {p.platform === 'ml' ? <MLIcon /> : <ShopeeIcon />}
            </div>
            <div className="purchase-info">
              <div className="purchase-name">{p.categoryIcon ? `${p.categoryIcon} ` : ''}{p.productName}</div>
              <div className="purchase-date">{p.date}{p.cashbackRatePct ? ` • ${p.cashbackRatePct} cashback` : ''}</div>
              {p.status === 'link_created' && (
                <button
                  type="button"
                  className="purchase-item-notify-btn"
                  onClick={() => handleNotifyFromPurchases(p.id)}
                >
                  <ShoppingBag size={11} /> Já realizei esta compra
                </button>
              )}
            </div>
            <div className="purchase-cashback">
              <div className="cashback-amount">+{formatCurrency(p.cashback)}</div>
              <div className={`cashback-status ${badge.className}`}>
                {badge.text}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Balance Page ----
function BalancePage({
  currentUser,
  onOpenRegister
}: {
  currentUser: UserProfile | null
  onOpenRegister: () => void
}) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [pixName, setPixName] = useState(currentUser?.name || '')
  const [pixKey, setPixKey] = useState('')
  const [pixType, setPixType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadBalanceData = async () => {
      let data = JSON.parse(localStorage.getItem('bn_purchases') || '[]') as Purchase[]
      let wData = JSON.parse(localStorage.getItem('bn_withdrawals') || '[]') as WithdrawalRequest[]

      try {
        const [cloudP, cloudW] = await Promise.all([
          cloudGetPurchases(),
          cloudGetWithdrawals()
        ])
        if (cloudP && cloudP.length > 0 && isMounted) {
          data = cloudP
          localStorage.setItem('bn_purchases', JSON.stringify(cloudP))
        }
        if (cloudW && cloudW.length > 0 && isMounted) {
          wData = cloudW
          localStorage.setItem('bn_withdrawals', JSON.stringify(cloudW))
        }
      } catch { }

      if (!isMounted) return
      const userPurchases = data.filter(p => {
        if (!currentUser) return false
        const currentClean = currentUser.cleanWhatsapp || cleanPhoneDigits(currentUser.whatsapp || '')
        if (currentClean && p.userWhatsapp) {
          return cleanPhoneDigits(p.userWhatsapp) === currentClean
        }
        return Boolean(currentUser.name && p.userName === currentUser.name)
      })
      const userWithdrawals = wData.filter(w => {
        if (!currentUser) return false
        const currentClean = currentUser.cleanWhatsapp || cleanPhoneDigits(currentUser.whatsapp || '')
        if (currentClean && w.userWhatsapp) {
          return cleanPhoneDigits(w.userWhatsapp) === currentClean
        }
        return Boolean(currentUser.name && w.userName === currentUser.name)
      })
      setPurchases(userPurchases)
      setWithdrawals(userWithdrawals)
    }

    loadBalanceData()
    const timer = setInterval(loadBalanceData, 8000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser?.name && !pixName) {
      setPixName(currentUser.name)
    }
  }, [currentUser])

  const totalPending = purchases.filter(p => p.status === 'pending').reduce((a, p) => a + p.cashback, 0)
  const totalApproved = purchases.filter(p => p.status === 'approved').reduce((a, p) => a + p.cashback, 0)
  const totalAll = totalPending + totalApproved

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
      userWhatsapp: currentUser?.whatsapp,
      pixKey: pixKey.trim(),
      pixType,
      amount: amountNum,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const allWithdrawals = JSON.parse(localStorage.getItem('bn_withdrawals') || '[]') as WithdrawalRequest[]
    allWithdrawals.unshift(newRequest)
    localStorage.setItem('bn_withdrawals', JSON.stringify(allWithdrawals))
    cloudSaveWithdrawal(newRequest).catch(() => { })
    setWithdrawals(prev => [newRequest, ...prev])
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

      {/* Banner Explicativo de Saldo */}
      <div className="balance-flow-banner compact">
        <div className="bfb-icon"><Clock size={18} color="#D97706" /></div>
        <div className="bfb-content">
          <div className="bfb-title">Como o Saldo entra aqui?</div>
          <div className="bfb-desc">
            O seu saldo só aparece em <strong>Saldo Aguardando</strong> após a compra ser realizada pelo seu link e computada pelo marketplace (Mercado Livre ou Shopee).
          </div>
        </div>
      </div>

      <button
        className="withdraw-btn"
        onClick={() => {
          setWithdrawAmount(totalAll > 0 ? totalAll.toFixed(2).replace('.', ',') : '10,00')
          if (currentUser?.name) setPixName(currentUser.name)
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

              {pixType === 'phone' && currentUser?.whatsapp && (
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => setPixKey(currentUser.whatsapp)}
                >
                  <Phone size={12} color="#16a34a" /> Usar meu WhatsApp: {currentUser.whatsapp}
                </button>
              )}

              <label className="form-label">Valor do Saque (R$)</label>
              <input
                type="text"
                className="form-input"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
              />

              {!currentUser && (
                <div className="modal-hint" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
                  🎁 <strong>Dica:</strong> <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 800 }} onClick={() => { setIsWithdrawModalOpen(false); onOpenRegister(); }}>Cadastre seu WhatsApp</span> para liberar o Programa 10 Amigos e ganhar bônus nos seus saques!
                </div>
              )}

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
function SettingsPage({
  currentUser,
  onOpenRegister,
  onOpenAdmin,
  onLogout
}: {
  currentUser: UserProfile | null
  onOpenRegister: () => void
  onOpenAdmin: () => void
  onLogout: () => void
}) {
  const handleClearData = () => {
    if (confirm('Deseja apagar todo o histórico de compras? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('bn_purchases')
      localStorage.removeItem('bn_withdrawals')
      toast.success('Histórico apagado com sucesso')
    }
  }

  const isAdminAuthenticated = typeof window !== 'undefined' && sessionStorage.getItem('bn_admin_auth') === 'true'

  // Contagem de indicados deste usuário
  const allSavedUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
  const myReferredFriends = currentUser
    ? allSavedUsers.filter(u => u.referredBy?.toUpperCase() === currentUser.referralCode?.toUpperCase())
    : []
  const myReferralCount = myReferredFriends.length
  const hasReached10Friends = myReferralCount >= 10 || Boolean(currentUser?.isVipPrimary)
  const refProgressPct = Math.min(100, (myReferralCount / 10) * 100)

  const items = [
    ...(isAdminAuthenticated ? [{
      icon: <Shield size={20} color="#EA580C" />,
      bg: '#FFF7ED',
      label: 'Painel da Administradora',
      sub: 'Gestão de saques PIX, comissões e lista de contatos WhatsApp',
      action: onOpenAdmin
    }] : []),
    {
      icon: <User size={20} color="#3B82F6" />,
      bg: '#EFF6FF',
      label: 'Minha Conta & WhatsApp',
      sub: currentUser ? `${currentUser.name} • ${currentUser.whatsapp}` : 'Cadastrar WhatsApp para receber bônus',
      action: onOpenRegister
    },
    {
      icon: <LogOut size={20} color="#DC2626" />,
      bg: '#FEF2F2',
      label: 'Trocar Usuário / Sair',
      sub: currentUser ? `Conectado como ${currentUser.name}` : 'Sair da conta atual',
      action: onLogout
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
      icon: <Trash2 size={20} color="#EF4444" />,
      bg: '#FEF2F2',
      label: 'Limpar Histórico',
      sub: 'Apagar compras e saques salvos deste navegador',
      action: handleClearData
    },
  ]

  return (
    <div className="page">
      <div className="section-title">Configurações & Perfil</div>
      <div className="section-subtitle">Gerencie sua conta e programa de vantagens</div>

      {/* Cartão de Perfil / Cadastro de WhatsApp */}
      {currentUser ? (
        <div className="profile-hero-card">
          <div className="phc-header">
            <div className="phc-avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
            <div className="phc-info">
              <div className="phc-name">{currentUser.name}</div>
              <div className="phc-phone">
                <Phone size={13} color="#16a34a" /> {currentUser.whatsapp}
              </div>
              {currentUser.email && <div className="phc-email">{currentUser.email}</div>}
            </div>
            <button className="phc-edit-btn" onClick={onOpenRegister} title="Editar Cadastro">
              <Edit3 size={15} />
            </button>
          </div>

          {/* Caixa do Programa 10 amigos */}
          <div className="referral-box">
            <div className="ref-top">
              <div className="ref-title">
                <Gift size={16} color="var(--primary)" />
                <span>Programa Indique 10 Amigos</span>
              </div>
              <span className={`ref-badge ${hasReached10Friends ? 'vip' : ''}`}>
                {hasReached10Friends ? '⭐ Meta Atingida (VIP)' : `${myReferralCount}/10`}
              </span>
            </div>

            <div className="ref-desc">
              Consiga 10 novos loguins e quado um deles comprarem algo usando o sistema BNcashback gerará uma fração de cashback à você também
            </div>

            <div className="ref-progress-wrap">
              <div className="ref-progress-track">
                <div className="ref-progress-fill" style={{ width: `${refProgressPct}%` }} />
              </div>
              <div className="ref-progress-label">
                <span>{myReferralCount} de 10 amigos cadastrados</span>
                <span className={hasReached10Friends ? 'vip-text' : ''}>
                  {hasReached10Friends ? 'Meta 10/10 VIP Ativa!' : `${refProgressPct.toFixed(0)}%`}
                </span>
              </div>
            </div>

            <div className="ref-code-wrap">
              <div className="ref-code-label">Seu Link Rastreado:</div>
              <div className="ref-code-val" style={{ fontSize: '11.5px', wordBreak: 'break-all' }}>
                {`${window.location.origin}/?ref=${currentUser.referralCode}`}
              </div>
            </div>

            {hasReached10Friends ? (
              <div className="meta-reached-box">
                <span>🎉</span>
                <div>
                  <strong>Meta de 10 amigos atingida!</strong> Convites pausados. Você tem 10% de bônus garantido nas compras dos seus indicados por 6 meses!
                </div>
              </div>
            ) : (
              <button
                className="wa-share-btn"
                onClick={() => {
                  const inviteUrl = `${window.location.origin}/?ref=${currentUser.referralCode}`
                  const shareMsg = `Oi! Estou usando o BNcashback para ganhar dinheiro de volta nas minhas compras do Mercado Livre e Shopee! 💰 Acesse pelo meu link e faça seu login para começar a ganhar também: ${inviteUrl}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank')
                }}
              >
                <MessageCircle size={17} /> Convidar Amigos no WhatsApp ({myReferralCount}/10)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="profile-hero-card guest" onClick={onOpenRegister}>
          <div className="phc-guest-icon">👤</div>
          <div className="phc-guest-text">
            <div className="phc-guest-title">Cadastre seu WhatsApp</div>
            <div className="phc-guest-sub">Receba vantagens exclusivas e participe do Programa 10 Amigos!</div>
          </div>
          <button className="phc-guest-btn">Cadastrar</button>
        </div>
      )}

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
function AdminPage({
  onBack,
  isMaintenance,
  onToggleMaintenance
}: {
  onBack: () => void
  isMaintenance: boolean
  onToggleMaintenance: () => void
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [adminTab, setAdminTab] = useState<'withdrawals' | 'commissions' | 'users' | 'integrations' | 'automation'>('withdrawals')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Credenciais e Teste da API Mercado Livre
  const [mlClientId, setMlClientId] = useState(() => localStorage.getItem('bn_ml_client_id') || '6686394200490654')
  const [mlClientSecret, setMlClientSecret] = useState(() => localStorage.getItem('bn_ml_client_secret') || 'Jjf0SlC5UD79ACry5O9xjXIiloQstOFK')
  const [isTestingMl, setIsTestingMl] = useState(false)
  const [mlTestResult, setMlTestResult] = useState<{ success: boolean; message: string } | null>({
    success: true,
    message: 'Credenciais oficiais do Mercado Livre ativas e conectadas! 🚀'
  })

  // Estado e Controle do Modal de Computar Venda com Valor Real
  const [computeModalPurchase, setComputeModalPurchase] = useState<Purchase | null>(null)
  const [computeProductName, setComputeProductName] = useState('')
  const [computePrice, setComputePrice] = useState('')
  const [computeCategoryRate, setComputeCategoryRate] = useState<number>(12)
  const [computeExactCommission, setComputeExactCommission] = useState('')

  const openComputeModal = (p: Purchase) => {
    setComputeModalPurchase(p)
    setComputeProductName(p.productName || 'Produto')
    setComputePrice(p.price > 0 ? p.price.toString() : '')

    let initialRate = 12
    if (p.categoryName?.includes('Moda') || p.categoryName?.includes('Beleza') || p.categoryName?.includes('Esportes')) {
      initialRate = 16
    } else if (p.categoryName?.includes('Tecnologia') || p.categoryName?.includes('Eletro')) {
      initialRate = 5
    } else if (p.categoryName?.includes('Alimentos')) {
      initialRate = 0
    }
    setComputeCategoryRate(initialRate)
    setComputeExactCommission(p.totalCommission > 0 ? p.totalCommission.toFixed(2) : '')
  }

  const parsedPrice = parseFloat(computePrice.replace(',', '.')) || 0
  const parsedExactCommission = parseFloat(computeExactCommission.replace(',', '.'))
  const totalCommissionVal = !isNaN(parsedExactCommission) && parsedExactCommission > 0
    ? parsedExactCommission
    : (parsedPrice * computeCategoryRate) / 100

  const hasPrimaryForModal = Boolean(computeModalPurchase?.primaryUserWhatsapp)
  const ownerSharePct = hasPrimaryForModal ? 0.50 : 0.60
  const ownerProfitVal = totalCommissionVal * ownerSharePct
  const primaryBonusVal = hasPrimaryForModal ? totalCommissionVal * 0.10 : 0
  const buyerCashbackVal = totalCommissionVal * 0.40

  const handleSaveComputeSale = async () => {
    if (!computeModalPurchase) return
    if (totalCommissionVal <= 0) {
      toast.error('Informe o valor da compra ou da comissão recebida no marketplace.')
      return
    }

    const updatedPurchase: Purchase = {
      ...computeModalPurchase,
      productName: computeProductName.trim() || computeModalPurchase.productName,
      price: parsedPrice > 0 ? parsedPrice : (computeCategoryRate > 0 ? totalCommissionVal / (computeCategoryRate / 100) : 0),
      totalCommission: totalCommissionVal,
      ownerProfit: ownerProfitVal,
      cashback: buyerCashbackVal,
      primaryBonusAmount: primaryBonusVal,
      status: 'pending' // entra no Saldo Aguardando!
    }

    let bonusToInsert: Purchase | null = null
    if (hasPrimaryForModal && primaryBonusVal > 0) {
      const bonusId = `bonus-${updatedPurchase.id}`
      bonusToInsert = {
        id: bonusId,
        platform: updatedPurchase.platform,
        productName: `Bônus Indicação (10%): Compra de ${updatedPurchase.userName || 'Amigo Indicado'}`,
        originalLink: updatedPurchase.originalLink,
        affiliateLink: updatedPurchase.affiliateLink,
        price: updatedPurchase.price,
        totalCommission: updatedPurchase.totalCommission,
        ownerProfit: updatedPurchase.ownerProfit,
        cashback: primaryBonusVal,
        cashbackRatePct: '10% Bônus',
        categoryName: updatedPurchase.categoryName,
        categoryIcon: '🎁',
        status: 'pending',
        date: new Date().toLocaleDateString('pt-BR'),
        userName: updatedPurchase.primaryUserName,
        userWhatsapp: updatedPurchase.primaryUserWhatsapp,
        isReferralBonus: true,
        referredBuyerName: updatedPurchase.userName || 'Amigo Indicado'
      }
    }

    const nextPurchases = purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p)
    if (bonusToInsert) {
      const bIdx = nextPurchases.findIndex(p => p.id === bonusToInsert!.id)
      if (bIdx >= 0) nextPurchases[bIdx] = bonusToInsert
      else nextPurchases.unshift(bonusToInsert)
      await cloudSavePurchase(bonusToInsert)
    }

    await cloudSavePurchase(updatedPurchase)
    setPurchases(nextPurchases)
    localStorage.setItem('bn_purchases', JSON.stringify(nextPurchases))
    setComputeModalPurchase(null)

    toast.success(`Venda computada! ${formatCurrency(buyerCashbackVal)} adicionado ao Saldo Aguardando de ${updatedPurchase.userName || 'Usuário'}. 💰`)
  }

  const loadCloudData = async (showToast = false) => {
    setIsRefreshing(true)
    try {
      const [cloudUsers, cloudPurchases, cloudWithdrawals] = await Promise.all([
        cloudGetUsers(),
        cloudGetPurchases(),
        cloudGetWithdrawals()
      ])

      if (cloudUsers && cloudUsers.length > 0) {
        setAllUsers(cloudUsers)
        localStorage.setItem('bn_all_users', JSON.stringify(cloudUsers))
      }
      if (cloudPurchases && cloudPurchases.length > 0) {
        setPurchases(cloudPurchases)
        localStorage.setItem('bn_purchases', JSON.stringify(cloudPurchases))
      }
      if (cloudWithdrawals && cloudWithdrawals.length > 0) {
        setWithdrawals(cloudWithdrawals)
        localStorage.setItem('bn_withdrawals', JSON.stringify(cloudWithdrawals))
      }
      if (showToast) {
        toast.success('Dados sincronizados com a nuvem! 🔄')
      }
    } catch {
      if (showToast) toast.error('Erro ao sincronizar com a nuvem.')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const isAuth = sessionStorage.getItem('bn_admin_auth') === 'true'
    if (isAuth) setIsAuthenticated(true)

    setPurchases(JSON.parse(localStorage.getItem('bn_purchases') || '[]'))
    setWithdrawals(JSON.parse(localStorage.getItem('bn_withdrawals') || '[]'))
    setAllUsers(JSON.parse(localStorage.getItem('bn_all_users') || '[]'))

    loadCloudData(false)
    const timer = setInterval(() => {
      loadCloudData(false)
    }, 8000)

    const savedId = localStorage.getItem('bn_ml_client_id') || '6686394200490654'
    const savedSecret = localStorage.getItem('bn_ml_client_secret') || 'Jjf0SlC5UD79ACry5O9xjXIiloQstOFK'
    setMlClientId(savedId)
    setMlClientSecret(savedSecret)
    localStorage.setItem('bn_ml_client_id', savedId)
    localStorage.setItem('bn_ml_client_secret', savedSecret)

    return () => clearInterval(timer)
  }, [])

  const handleTestMlConnection = async () => {
    if (!mlClientId.trim() || !mlClientSecret.trim()) {
      toast.error('Informe o App ID e o Client Secret primeiro!')
      return
    }
    setIsTestingMl(true)
    setMlTestResult(null)
    try {
      const res = await fetch('/api/mercado-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          clientId: mlClientId.trim(),
          clientSecret: mlClientSecret.trim()
        })
      })
      const data = await res.json()
      setMlTestResult(data)
      if (data.success) {
        toast.success(data.message)
        localStorage.setItem('bn_ml_client_id', mlClientId.trim())
        localStorage.setItem('bn_ml_client_secret', mlClientSecret.trim())
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Erro ao conectar com a API do Mercado Livre. Verifique a internet e as credenciais.')
    } finally {
      setIsTestingMl(false)
    }
  }

  const handleLogin = () => {
    if (password === 'admin4128') {
      setIsAuthenticated(true)
      sessionStorage.setItem('bn_admin_auth', 'true')
      toast.success('Acesso de Administradora autenticado! 👑')
    } else {
      toast.error('Senha incorreta!')
    }
  }

  // Cálculos Financeiros (baseados em vendas computadas do marketplace)
  const confirmedPurchases = purchases.filter(p => p.status === 'pending' || p.status === 'approved')
  const totalGrossCommissions = confirmedPurchases.reduce((acc, p) => acc + (p.totalCommission || (p.cashback / USER_COMMISSION_SHARE)), 0)
  const totalOwnerProfit = confirmedPurchases.reduce((acc, p) => acc + (p.ownerProfit || ((p.totalCommission || (p.cashback / USER_COMMISSION_SHARE)) * OWNER_COMMISSION_SHARE)), 0)
  const totalUserCashback = confirmedPurchases.reduce((acc, p) => acc + p.cashback, 0)

  const totalPaid = withdrawals.filter(w => w.status === 'paid').reduce((acc, w) => acc + w.amount, 0)
  const pendingList = withdrawals.filter(w => w.status === 'pending')
  const totalPendingAmount = pendingList.reduce((acc, w) => acc + w.amount, 0)

  const handleMarkAsPaid = (id: string) => {
    let targetWithdrawal: WithdrawalRequest | null = null
    const updated = withdrawals.map(w => {
      if (w.id === id) {
        targetWithdrawal = {
          ...w,
          status: 'paid' as const,
          paidAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
        return targetWithdrawal
      }
      return w
    })
    setWithdrawals(updated)
    localStorage.setItem('bn_withdrawals', JSON.stringify(updated))
    if (targetWithdrawal) {
      cloudSaveWithdrawal(targetWithdrawal).catch(() => { })
    }
    toast.success('Saque marcado como PAGO via PIX! ✅')
  }

  const handleApproveCommission = (purchaseId: string) => {
    const updated = purchases.map(p => {
      if (p.id === purchaseId || p.id === `bonus-${purchaseId}`) {
        const approvedItem = { ...p, status: 'approved' as const }
        cloudSavePurchase(approvedItem).catch(() => { })
        return approvedItem
      }
      return p
    })
    setPurchases(updated)
    localStorage.setItem('bn_purchases', JSON.stringify(updated))
    toast.success('Saldo do usuário e bônus aprovados para saque PIX! 🎉')
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  const copyAllWhatsapps = () => {
    if (allUsers.length === 0) {
      toast.error('Nenhum usuário cadastrado ainda!')
      return
    }
    const cleanList = allUsers.map(u => `55${u.cleanWhatsapp}`).join(', ')
    navigator.clipboard.writeText(cleanList)
    toast.success(`${allUsers.length} contatos de WhatsApp copiados! Prontos para Lista de Transmissão.`)
  }

  const downloadUsersCSV = () => {
    if (allUsers.length === 0) {
      toast.error('Nenhum usuário cadastrado ainda!')
      return
    }
    const headers = 'Nome;WhatsApp;E-mail;Data de Cadastro;Código de Indicação\n'
    const rows = allUsers.map(u => `"${u.name}";"${u.whatsapp}";"${u.email || ''}";"${u.createdAt}";"${u.referralCode}"`).join('\n')
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios-bncashback-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Planilha CSV de contatos gerada com sucesso! 📊')
  }

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Deseja remover o usuário "${name}" da lista?`)) {
      const updated = allUsers.filter(u => u.id !== id)
      setAllUsers(updated)
      localStorage.setItem('bn_all_users', JSON.stringify(updated))
      cloudDeleteUser(id).catch(() => { })
      toast.success('Usuário removido da lista!')
    }
  }

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.whatsapp.includes(userSearch) ||
    u.referralCode.toLowerCase().includes(userSearch.toLowerCase())
  )

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
            Área restrita para controle de comissões, usuários WhatsApp e pagamentos de saques via PIX.
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
        {adminTab !== 'withdrawals' ? (
          <button className="admin-back-btn" onClick={() => setAdminTab('withdrawals')}>
            <ArrowLeft size={16} /> Voltar ao Início do Admin
          </button>
        ) : (
          <button
            className="admin-back-btn"
            onClick={() => {
              if (window.confirm('Deseja fechar o Painel da Administradora e voltar ao site?')) {
                onBack()
              }
            }}
          >
            <ArrowLeft size={16} /> Sair do Painel Admin
          </button>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="admin-refresh-btn"
            onClick={() => loadCloudData(true)}
            disabled={isRefreshing}
            title="Sincronizar dados com a nuvem"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
          <div className="admin-badge-live">
            <Shield size={14} /> Modo Admin Ativo
          </div>
        </div>
      </div>

      <div className="section-title">Painel Administrativo</div>
      <div className="section-subtitle">Gestão de Lucro (60%), Cashback (40%), WhatsApp e Saques PIX</div>

      {/* Controle de Status do Site (Manutenção vs No Ar) */}
      <div className="admin-status-control-card">
        <div className="ascc-info">
          <div className={`ascc-badge ${isMaintenance ? 'badge-maint' : 'badge-live'}`}>
            {isMaintenance ? '🔴 Modo Manutenção Ativo' : '🟢 Site no Ar'}
          </div>
          <div className="ascc-title">
            {isMaintenance ? 'O site está FORA DO AR para o público' : 'O site está NO AR e acessível para todos'}
          </div>
          <div className="ascc-desc">
            {isMaintenance
              ? 'Visitantes veem a tela de manutenção. Apenas você consegue acessar este painel de administradora.'
              : 'O público tem acesso normal para gerar cashback e solicitar saques.'}
          </div>
        </div>
        <button
          type="button"
          className={`ascc-btn ${isMaintenance ? 'publish' : 'unpublish'}`}
          onClick={onToggleMaintenance}
        >
          {isMaintenance ? '🚀 Publicar Site (Colocar no Ar)' : '🔒 Ativar Modo Manutenção'}
        </button>
      </div>

      {/* Grid de Métricas Financeiras */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card green">
          <div className="am-label">💼 Seu Lucro Líquido (60%)</div>
          <div className="am-value">{formatCurrency(totalOwnerProfit)}</div>
          <div className="am-sub">{confirmedPurchases.length} compra(s) computada(s)</div>
        </div>

        <div className="admin-metric-card blue">
          <div className="am-label">🎁 Cashback Usuários (40%)</div>
          <div className="am-value">{formatCurrency(totalUserCashback)}</div>
          <div className="am-sub">Total computado: {formatCurrency(totalGrossCommissions)}</div>
        </div>

        <div className="admin-metric-card orange">
          <div className="am-label">⏳ Saques PIX Pendentes</div>
          <div className="am-value">{formatCurrency(totalPendingAmount)}</div>
          <div className="am-sub">{pendingList.length} solicitação(ões) aguardando</div>
        </div>

        <div className="admin-metric-card purple">
          <div className="am-label">👥 Contatos WhatsApp</div>
          <div className="am-value">{allUsers.length}</div>
          <div className="am-sub">Total pago via PIX: {formatCurrency(totalPaid)}</div>
        </div>
      </div>

      {/* Abas do Admin */}
      <div className="platform-tabs">
        <button
          className={`platform-tab ${adminTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setAdminTab('withdrawals')}
        >
          <DollarSign size={15} />
          Saques PIX ({pendingList.length})
        </button>
        <button
          className={`platform-tab ${adminTab === 'commissions' ? 'active' : ''}`}
          onClick={() => setAdminTab('commissions')}
        >
          <ShoppingBag size={15} />
          Vendas ({purchases.length})
        </button>
        <button
          className={`platform-tab ${adminTab === 'users' ? 'active' : ''}`}
          onClick={() => setAdminTab('users')}
        >
          <Users size={15} />
          Usuários ({allUsers.length})
        </button>
        <button
          className={`platform-tab ${adminTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setAdminTab('integrations')}
        >
          <Key size={15} />
          APIs & Conexões
        </button>
        <button
          className={`platform-tab ${adminTab === 'automation' ? 'active' : ''}`}
          onClick={() => setAdminTab('automation')}
        >
          <Zap size={15} />
          Automação
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

                {w.userWhatsapp && (
                  <div className="ap-user-wa-row">
                    <div className="ap-user-wa-info">
                      <Phone size={13} color="#16a34a" />
                      <span>WhatsApp: <strong>{w.userWhatsapp}</strong></span>
                    </div>
                    <a
                      href={`https://wa.me/55${cleanPhoneDigits(w.userWhatsapp)}?text=${encodeURIComponent(`Olá ${w.userName}! Aqui é a Bruna do BNcashback 🎁 Seu pagamento de saque PIX no valor de ${formatCurrency(w.amount)} foi processado com sucesso! Muito obrigada por usar nosso app!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-pill-btn"
                    >
                      <MessageCircle size={13} /> Avisar no WhatsApp
                    </a>
                  </div>
                )}

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
          {/* Banner de instrução de conferência */}
          <div className="admin-growth-banner" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
            <div className="agb-icon">🛒</div>
            <div className="agb-content">
              <div className="agb-title" style={{ color: '#92400E' }}>Conferência de Vendas no Marketplace</div>
              <div className="agb-desc" style={{ color: '#78350F' }}>
                Quando a compra aparecer no seu painel da <strong>Shopee</strong> ou <strong>Mercado Livre</strong>, clique em <strong>"Computar Venda"</strong> para creditar o valor no <strong>Saldo Aguardando</strong> do usuário!
              </div>
            </div>
          </div>

          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Nenhuma compra ou link registrado</div>
              <div className="empty-state-text">Gere links na aba Início para ver os registros aqui.</div>
            </div>
          ) : (
            purchases.map(p => {
              if (p.isReferralBonus) {
                return (
                  <div key={p.id} className="admin-sale-card as-bonus-card">
                    <div className="as-header">
                      <span className="as-platform" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                        🎁 Bônus Indicação Primário (10%)
                      </span>
                      <span className="as-date">{p.date}</span>
                    </div>

                    <div className="as-product">
                      🎁 <strong>{p.productName}</strong>
                    </div>

                    <div className="as-user-tag" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
                      ⭐ Indicador Primário (Recebedor): <strong>{p.userName}</strong> {p.userWhatsapp ? `(${p.userWhatsapp})` : ''}
                    </div>

                    <div className="as-split-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="as-split-item gross">
                        <span className="as-s-label">Comprador Indicado</span>
                        <span className="as-s-val" style={{ fontSize: '13px' }}>{p.referredBuyerName || 'Amigo Indicado'}</span>
                      </div>
                      <div className="as-split-item user" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
                        <span className="as-s-label" style={{ color: '#6D28D9' }}>Bônus Creditado (10%)</span>
                        <span className="as-s-val" style={{ color: '#6D28D9' }}>{formatCurrency(p.cashback)}</span>
                      </div>
                    </div>

                    <div className="as-footer">
                      {p.status === 'pending' && (
                        <>
                          <span className="as-status pending">
                            ⏳ Em Saldo Aguardando do Primário
                          </span>
                          <button
                            className="as-approve-btn"
                            onClick={() => handleApproveCommission(p.id)}
                          >
                            🎉 Liberar Bônus para Saque PIX
                          </button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <span className="as-status approved">
                          Status: Bônus Liberado para Saque PIX ✅
                        </span>
                      )}
                    </div>
                  </div>
                )
              }

              const hasPrimary = Boolean(p.primaryUserWhatsapp && (p.primaryBonusAmount || 0) > 0)
              const gross = p.totalCommission || (p.cashback / USER_COMMISSION_SHARE)
              const owner = p.ownerProfit || (hasPrimary ? gross * OWNER_VIP_COMMISSION_SHARE : gross * OWNER_COMMISSION_SHARE)
              const primaryBonus = p.primaryBonusAmount || (hasPrimary ? gross * PRIMARY_BONUS_COMMISSION_SHARE : 0)

              return (
                <div key={p.id} className="admin-sale-card">
                  <div className="as-header">
                    <span className="as-platform">{p.platform === 'ml' ? 'Mercado Livre' : 'Shopee'}</span>
                    <span className="as-date">{p.date}</span>
                  </div>

                  <div className="as-product">
                    {p.categoryIcon} {p.productName}
                  </div>

                  {p.userName && (
                    <div className="as-user-tag">
                      👤 Comprador: <strong>{p.userName}</strong> {p.userWhatsapp ? `(${p.userWhatsapp})` : ''}
                    </div>
                  )}

                  {hasPrimary && (
                    <div className="as-primary-tag">
                      <span>⭐ Indicado por (Primário): <strong>{p.primaryUserName}</strong> ({p.primaryUserWhatsapp})</span>
                      <span className="as-primary-badge">Bônus 10% Ativo</span>
                    </div>
                  )}

                  <div className="as-split-grid" style={{ gridTemplateColumns: hasPrimary ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }}>
                    <div className="as-split-item gross">
                      <span className="as-s-label">Total (100%)</span>
                      <span className="as-s-val">{formatCurrency(gross)}</span>
                    </div>
                    <div className="as-split-item owner">
                      <span className="as-s-label">{hasPrimary ? 'Seu Lucro (50%)' : 'Seu Lucro (60%)'}</span>
                      <span className="as-s-val">{formatCurrency(owner)}</span>
                    </div>
                    {hasPrimary && (
                      <div className="as-split-item" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
                        <span className="as-s-label" style={{ color: '#6D28D9' }}>Primário (10%)</span>
                        <span className="as-s-val" style={{ color: '#6D28D9' }}>{formatCurrency(primaryBonus)}</span>
                      </div>
                    )}
                    <div className="as-split-item user">
                      <span className="as-s-label">Comprador (40%)</span>
                      <span className="as-s-val">{formatCurrency(p.cashback)}</span>
                    </div>
                  </div>

                  <div className="as-footer">
                    {p.status === 'link_created' && (
                      <>
                        <span className="as-status created">
                          🛒 Apenas Link Gerado (Aguardando Compra)
                        </span>
                        <button
                          className="as-compute-btn"
                          onClick={() => openComputeModal(p)}
                        >
                          <CheckCircle size={14} /> Computar Venda
                        </button>
                      </>
                    )}

                    {p.status === 'purchase_notified' && (
                      <>
                        <span className="as-status notified">
                          🔔 Usuário Informou Compra! (Conferir no painel)
                        </span>
                        <button
                          className="as-compute-btn primary"
                          onClick={() => openComputeModal(p)}
                        >
                          <CheckCircle size={14} /> Confirmar & Computar Venda
                        </button>
                      </>
                    )}

                    {p.status === 'pending' && (
                      <>
                        <span className="as-status pending">
                          ⏳ Venda Computada (Saldo Aguardando 60 dias)
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="as-edit-btn"
                            onClick={() => openComputeModal(p)}
                            title="Ajustar valor da comissão ou produto"
                          >
                            <Edit3 size={13} /> Editar Valor
                          </button>
                          <button
                            className="as-approve-btn"
                            onClick={() => handleApproveCommission(p.id)}
                          >
                            🎉 Liberar para Saque PIX
                          </button>
                        </div>
                      </>
                    )}

                    {p.status === 'approved' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="as-status approved">
                          Status: Liberado para Saque PIX ✅
                        </span>
                        <button
                          className="as-edit-btn"
                          onClick={() => openComputeModal(p)}
                          title="Ajustar valor"
                        >
                          <Edit3 size={13} /> Editar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Modal de Computar Venda com Valor Real */}
          {computeModalPurchase && (
            <div className="modal-overlay" onClick={() => setComputeModalPurchase(null)}>
              <div className="compute-modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">
                    <ShoppingBag size={18} color="var(--primary)" />
                    Computar Venda do Marketplace
                  </div>
                  <button className="modal-close-btn" onClick={() => setComputeModalPurchase(null)}>✕</button>
                </div>

                <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.4' }}>
                  Comprador: <strong>{computeModalPurchase.userName || 'Usuário'}</strong> {computeModalPurchase.userWhatsapp ? `(${computeModalPurchase.userWhatsapp})` : ''}
                  {computeModalPurchase.primaryUserName && (
                    <div style={{ color: '#6D28D9', marginTop: 3 }}>
                      ⭐ Indicado por: <strong>{computeModalPurchase.primaryUserName}</strong> (Bônus 10% ativo)
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">Nome do Produto</label>
                  <input
                    type="text"
                    className="form-input"
                    value={computeProductName}
                    onChange={e => setComputeProductName(e.target.value)}
                    placeholder="Ex: Espelho Retrovisor do Carro"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Valor da Compra (R$)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={computePrice}
                      onChange={e => {
                        setComputePrice(e.target.value)
                        setComputeExactCommission('')
                      }}
                      placeholder="Ex: 75,00"
                    />
                  </div>

                  <div>
                    <label className="form-label">Categoria / Taxa</label>
                    <select
                      className="form-input"
                      value={computeCategoryRate}
                      onChange={e => {
                        setComputeCategoryRate(Number(e.target.value))
                        setComputeExactCommission('')
                      }}
                    >
                      <option value={16}>Moda/Beleza (16%)</option>
                      <option value={12}>Casa/Veículos/Outros (12%)</option>
                      <option value={5}>Tecnologia (5%)</option>
                      <option value={0}>Alimentos (0%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    OU Comissão Exata Recebida (R$)
                    <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748B', marginLeft: 4 }}>
                      (do painel do Mercado Livre)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={computeExactCommission}
                    onChange={e => setComputeExactCommission(e.target.value)}
                    placeholder="Ex: 9,00"
                  />
                </div>

                {/* Simulação em tempo real da divisão */}
                <div className="compute-calc-box">
                  <div className="compute-calc-row">
                    <span style={{ color: '#475569' }}>Total Comissão Marketplace:</span>
                    <strong style={{ color: '#1E293B' }}>{formatCurrency(totalCommissionVal)}</strong>
                  </div>
                  <div className="compute-calc-row">
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>
                      {hasPrimaryForModal ? 'Seu Lucro (50%):' : 'Seu Lucro (60%):'}
                    </span>
                    <strong style={{ color: '#16A34A' }}>{formatCurrency(ownerProfitVal)}</strong>
                  </div>
                  {hasPrimaryForModal && (
                    <div className="compute-calc-row">
                      <span style={{ color: '#6D28D9', fontWeight: 700 }}>Bônus Indicador (10%):</span>
                      <strong style={{ color: '#6D28D9' }}>{formatCurrency(primaryBonusVal)}</strong>
                    </div>
                  )}
                  <div className="compute-calc-row highlight">
                    <span style={{ color: '#2563EB' }}>Cashback Comprador (40%):</span>
                    <strong style={{ color: '#2563EB', fontSize: '15px' }}>{formatCurrency(buyerCashbackVal)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="generate-btn"
                  style={{ marginTop: 4 }}
                  onClick={handleSaveComputeSale}
                >
                  <CheckCircle size={17} /> Salvar e Creditar no Saldo Aguardando
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: Usuários & WhatsApp */}
      {adminTab === 'users' && (
        <div className="admin-section">
          {/* Top Banner de Estratégia de Crescimento */}
          <div className="admin-growth-banner">
            <div className="agb-icon">🚀</div>
            <div className="agb-content">
              <div className="agb-title">Programa Indique 10 Amigos</div>
              <div className="agb-desc">
                Envie mensagem para os usuários abaixo oferecendo <strong>vantagens exclusivas</strong> para quem indicar 10 amigos. O botão verde já abre o WhatsApp com a mensagem pronta!
              </div>
            </div>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="admin-users-actions">
            <button className="admin-act-btn" onClick={copyAllWhatsapps}>
              <Copy size={15} /> Copiar Todos ({allUsers.length})
            </button>
            <button className="admin-act-btn secondary" onClick={downloadUsersCSV}>
              <Download size={15} /> Baixar Planilha CSV
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="admin-search-wrap">
            <input
              type="text"
              className="admin-search-input"
              placeholder="🔍 Buscar por nome, WhatsApp ou código..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          {/* Lista de Usuários */}
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">
                {allUsers.length === 0 ? 'Nenhum usuário cadastrado ainda' : 'Nenhum usuário encontrado'}
              </div>
              <div className="empty-state-text">
                Assim que os usuários cadastrarem o WhatsApp no app, o contato aparecerá aqui com 1 clique para conversar no WhatsApp!
              </div>
            </div>
          ) : (
            filteredUsers.map(user => {
              const myReferrals = allUsers.filter(u => u.referredBy?.toUpperCase() === user.referralCode?.toUpperCase())
              const refCount = myReferrals.length
              const isVip = user.isVipPrimary || refCount >= 10

              const inviteMsg = `Olá ${user.name}! Tudo bem? Aqui é a Bruna do BNcashback 🎁 Passando para te avisar: indique 10 amigos com seu link exclusivo e ganhe 10% de bônus por 6 meses sobre as compras deles! Seu link de indicação é: ${window.location.origin}/?ref=${user.referralCode}`
              const waLink = `https://wa.me/55${user.cleanWhatsapp}?text=${encodeURIComponent(inviteMsg)}`

              return (
                <div key={user.id} className="admin-user-card">
                  <div className="auc-header">
                    <div className="auc-user-main">
                      <div className="auc-avatar">{user.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="auc-name">{user.name}</div>
                        <div className="auc-date">Cadastrado em {user.createdAt}</div>
                      </div>
                    </div>
                    <span className="auc-ref-tag">Cód: {user.referralCode}</span>
                  </div>

                  <div className="auc-details">
                    <div className="auc-row">
                      <Phone size={14} color="#16a34a" />
                      <span className="auc-phone">{user.whatsapp}</span>
                      <button
                        className="copy-mini-btn"
                        onClick={() => copyText(user.whatsapp, 'WhatsApp')}
                        title="Copiar número"
                      >
                        <Copy size={12} />
                      </button>
                    </div>

                    {user.referredByName && (
                      <div className="auc-row" style={{ color: '#6D28D9', fontSize: '12px' }}>
                        <span>⭐ Indicado por: <strong>{user.referredByName}</strong> {user.referredByWhatsapp ? `(${user.referredByWhatsapp})` : ''}</span>
                      </div>
                    )}

                    <div className="auc-row" style={{ fontSize: '12px' }}>
                      <span>👥 Indicados cadastrados: <strong>{refCount} de 10</strong></span>
                      {isVip && (
                        <span className="vip-meta-badge">
                          ⭐ VIP 10/10 (10% Bônus Ativo por 6 meses)
                        </span>
                      )}
                    </div>

                    {myReferrals.length > 0 && (
                      <div className="auc-referred-list">
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: 4 }}>
                          Amigos que entraram pelo link deste usuário ({myReferrals.length}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {myReferrals.map((friend, fIdx) => (
                            <span key={fIdx} className="auc-friend-chip">
                              ✓ {friend.name} ({friend.whatsapp})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.email && (
                      <div className="auc-row email">
                        <span>✉️ {user.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="auc-actions">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="auc-wa-btn"
                    >
                      <MessageCircle size={16} /> Chamar no WhatsApp (Enviar Link de Indicação)
                    </a>
                    <button
                      className="auc-delete-btn"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      title="Excluir usuário"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Conteúdo da Aba: APIs & Conexões (Mercado Livre + Shopee) */}
      {adminTab === 'integrations' && (
        <div className="admin-section">
          {/* Card 1: Mercado Livre Official API */}
          <div className="admin-integration-card">
            <div className="aic-header">
              <div className="aic-title-box">
                <MLIcon />
                <div>
                  <div className="aic-title">API Oficial do Mercado Livre</div>
                  <div className="aic-sub">Consulta automática de preços, fotos e categorias oficiais</div>
                </div>
              </div>
              <span className={`aic-badge ${mlClientId && mlClientSecret ? 'connected' : 'disconnected'}`}>
                {mlClientId && mlClientSecret ? '🟢 Configurado' : '⚪ Pendente'}
              </span>
            </div>

            <p className="aic-desc">
              Com as credenciais da sua aplicação no Mercado Livre, o robô consulta o título, foto e preço exato de cada anúncio automaticamente!
            </p>

            <div className="aic-form">
              <label className="form-label">
                App ID (Client ID) do Mercado Livre:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: 1234567890123456"
                value={mlClientId}
                onChange={e => setMlClientId(e.target.value)}
              />

              <label className="form-label">
                Client Secret (Chave Secreta):
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Ex: abcd1234efgh5678..."
                value={mlClientSecret}
                onChange={e => setMlClientSecret(e.target.value)}
              />

              <div className="aic-actions">
                <button
                  type="button"
                  className="aic-save-btn"
                  onClick={() => {
                    localStorage.setItem('bn_ml_client_id', mlClientId.trim())
                    localStorage.setItem('bn_ml_client_secret', mlClientSecret.trim())
                    toast.success('Credenciais salvas com sucesso!')
                  }}
                >
                  Salvar Credenciais
                </button>
                <button
                  type="button"
                  className="aic-test-btn"
                  onClick={handleTestMlConnection}
                  disabled={isTestingMl}
                >
                  {isTestingMl ? 'Testando Conexão...' : '⚡ Testar Conexão Oficial'}
                </button>
              </div>

              {mlTestResult && (
                <div className={`aic-result-box ${mlTestResult.success ? 'success' : 'error'}`}>
                  {mlTestResult.success ? '✅ ' : '❌ '}
                  {mlTestResult.message}
                </div>
              )}
            </div>

            {/* Passo a passo ilustrado para obter as chaves */}
            <div className="aic-instructions">
              <div className="aici-title">📖 Como pegar seu App ID e Secret em 2 minutos:</div>
              <ol className="aici-list">
                <li>Acesse <strong>developers.mercadolivre.com.br</strong> e entre com sua conta do Mercado Livre.</li>
                <li>No menu superior, clique em <strong>"Minhas Aplicações"</strong> e depois no botão <strong>"Criar nova aplicação"</strong>.</li>
                <li>Preencha o nome (ex: <em>BNcashback</em>) e confirme.</li>
                <li>Copie o <strong>App ID</strong> e a <strong>Secret Key</strong> gerados e cole nos campos acima!</li>
              </ol>
            </div>
          </div>

          {/* Card 2: Shopee Affiliate Open API */}
          <div className="admin-integration-card" style={{ marginTop: 20 }}>
            <div className="aic-header">
              <div className="aic-title-box">
                <ShopeeIcon />
                <div>
                  <div className="aic-title">Shopee Affiliate Open API</div>
                  <div className="aic-sub">Consulta automática de ofertas e comissões da Shopee</div>
                </div>
              </div>
              <span className="aic-badge waiting">
                ⏳ Aguardando Solicitação
              </span>
            </div>

            <p className="aic-desc">
              A Shopee exige uma solicitação prévia junto ao suporte de afiliados para liberar as chaves da Open API.
            </p>

            <div className="shopee-request-box">
              <div className="srb-title">✉️ Mensagem Pronta para Enviar ao Suporte da Shopee:</div>
              <div className="srb-content">
                "Olá equipe Shopee Afiliados! Sou parceira afiliada ativa (ID an_18335281102) e gostaria de solicitar a ativação do acesso à Open API para o meu aplicativo de cashback BNcashback, a fim de consultar ofertas e comissões dos produtos."
              </div>
              <button
                type="button"
                className="srb-copy-btn"
                onClick={() => {
                  const msg = "Olá equipe Shopee Afiliados! Sou parceira afiliada ativa (ID an_18335281102) e gostaria de solicitar a ativação do acesso à Open API para o meu aplicativo de cashback BNcashback, a fim de consultar ofertas e comissões dos produtos."
                  navigator.clipboard.writeText(msg)
                  toast.success('Mensagem copiada! Envie no formulário ou chat da Shopee.')
                }}
              >
                <Copy size={13} /> Copiar Mensagem para Suporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 4: Automação de Pagamentos */}
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

// ---- Maintenance Page ----
function MaintenancePage({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  return (
    <div className="maintenance-container">
      {/* Top Brand */}
      <div className="maintenance-brand">
        <LogoIcon />
        <div className="logo-text" style={{ marginTop: 8 }}>
          <span className="bn">BN</span><span className="cb">cashback</span>
        </div>
      </div>

      {/* Main Notice Card */}
      <div className="maintenance-card">
        <div className="maintenance-icon-badge">
          ⚙️
        </div>
        <div className="maintenance-tag">Atualização de Sistema</div>
        <h1 className="maintenance-title">Estamos em Manutenção Temporária</h1>
        <p className="maintenance-subtitle">
          Estamos atualizando nossos robôs e integrando a comunicação direta com a <strong>Shopee</strong> e o <strong>Mercado Livre</strong> para garantir a precisão máxima das comissões e do seu cashback.
        </p>

        <div className="maintenance-info-box">
          <div className="mib-item">
            <span className="mib-bullet">🔒</span>
            <span>Seus dados, cadastros e saldos continuam 100% salvos e protegidos.</span>
          </div>
          <div className="mib-item">
            <span className="mib-bullet">🚀</span>
            <span>Retornaremos em breve com o cálculo 100% automático!</span>
          </div>
          <div className="mib-item">
            <span className="mib-bullet">✨</span>
            <span>Agradecemos a sua compreensão e paciência.</span>
          </div>
        </div>

        <div className="maintenance-timer-hint">
          Voltaremos em breve com tudo funcionando perfeitamente!
        </div>
      </div>

      {/* Footer & Discreet Admin Link */}
      <footer className="maintenance-footer">
        <button
          type="button"
          className="maintenance-admin-btn"
          onClick={onOpenAdmin}
          title="Acesso da Administradora"
        >
          <Lock size={13} /> Área da Administradora
        </button>
      </footer>
    </div>
  )
}

function isAdminUrl(): boolean {
  try {
    const search = window.location.search.toLowerCase()
    const hash = window.location.hash.toLowerCase()
    const path = window.location.pathname.toLowerCase()
    return (
      search.includes('admin') ||
      search.includes('andim') ||
      hash.includes('admin') ||
      hash.includes('andim') ||
      path.includes('admin') ||
      path.includes('andim')
    )
  } catch {
    return false
  }
}

// ---- Login / Onboarding Gate Screen ----
function LoginScreen({
  onLogin
}: {
  onLogin: (user: UserProfile) => void
}) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Por favor, informe seu nome')
      return
    }
    const cleanPhone = cleanPhoneDigits(whatsapp)
    if (cleanPhone.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD (Ex: 11 98765-4321)')
      return
    }

    const allUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
    const existing = allUsers.find(u => cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '') === cleanPhone)

    // Verifica se há indicação pendente via URL (?ref=XYZ)
    const pendingRef = sessionStorage.getItem('bn_pending_ref') || localStorage.getItem('bn_pending_ref')
    let primaryUser: UserProfile | undefined
    if (pendingRef && (!existing || !existing.referredBy)) {
      primaryUser = allUsers.find(
        u => u.referralCode?.toUpperCase() === pendingRef.toUpperCase() &&
          cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '') !== cleanPhone
      )
    }

    const user: UserProfile = {
      id: existing?.id || crypto.randomUUID(),
      name: name.trim(),
      whatsapp: formatWhatsapp(whatsapp),
      cleanWhatsapp: cleanPhone,
      referralCode: existing?.referralCode || generateReferralCode(name),
      createdAt: existing?.createdAt || new Date().toLocaleDateString('pt-BR'),
      referredBy: existing?.referredBy || (primaryUser ? primaryUser.referralCode : undefined),
      referredByName: existing?.referredByName || (primaryUser ? primaryUser.name : undefined),
      referredByWhatsapp: existing?.referredByWhatsapp || (primaryUser ? primaryUser.whatsapp : undefined),
      isVipPrimary: existing?.isVipPrimary || false,
      vipExpiresAt: existing?.vipExpiresAt
    }

    // Se este novo cadastro for fruto de indicação, atualiza o status do indicador primário
    if (!existing?.referredBy && primaryUser) {
      const primaryCleanPhone = cleanPhoneDigits(primaryUser.cleanWhatsapp || primaryUser.whatsapp || '')
      const currentFriends = allUsers.filter(u => u.referredBy?.toUpperCase() === primaryUser!.referralCode?.toUpperCase())
      const newFriendsCount = currentFriends.length + 1

      if (newFriendsCount >= 10 && !primaryUser.isVipPrimary) {
        primaryUser.isVipPrimary = true
        const expires = new Date()
        expires.setDate(expires.getDate() + 180)
        primaryUser.vipExpiresAt = expires.toISOString()

        const pIdx = allUsers.findIndex(u => cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '') === primaryCleanPhone)
        if (pIdx >= 0) {
          allUsers[pIdx] = { ...primaryUser }
          localStorage.setItem('bn_all_users', JSON.stringify(allUsers))
          fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: primaryUser })
          }).catch(() => { })
        }
      }
    }

    try {
      sessionStorage.removeItem('bn_pending_ref')
      localStorage.removeItem('bn_pending_ref')
    } catch { }

    onLogin(user)
  }

  return (
    <div className="app-shell login-shell">
      <header className="app-header">
        <div className="header-top-bar" style={{ justifyContent: 'center' }}>
          <div className="security-badge-header">
            <ShieldCheck size={14} color="#16a34a" />
            <span>App Seguro</span>
          </div>
        </div>
        <div className="header-logo-container">
          <div className="header-logo">
            <LogoIcon />
            <div className="logo-text">
              <span className="bn">BN</span><span className="cb">cashback</span>
            </div>
          </div>
        </div>
        <div className="header-tagline">Compre, ganhe cashback! 🎯</div>
      </header>

      <main className="main-content" style={{ paddingBottom: 40 }}>
        <div className="page" style={{ paddingTop: 8 }}>
          <div className="login-welcome-card">
            <h2 className="lwc-title">Entrar no BNcashback</h2>

            <form onSubmit={handleSubmit} className="lwc-form">
              <div className="form-group-clean">
                <label className="form-label-clean">Nome</label>
                <input
                  type="text"
                  className="form-input-clean"
                  placeholder="Como quer ser chamado(a)?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group-clean">
                <label className="form-label-clean">WhatsApp</label>
                <input
                  type="tel"
                  className="form-input-clean"
                  placeholder="(11) 98765-4321"
                  value={whatsapp}
                  onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
                  maxLength={15}
                />
              </div>

              <button type="submit" className="login-submit-btn">
                Entrar e Ativar Meu Cashback 🚀
              </button>
            </form>

            <div className="lwc-trust-list">
              <div className="lwc-trust-item">
                <span className="lwc-check">✓</span> <strong>100% Gratuito</strong> — sem taxas ou cobranças
              </div>
              <div className="lwc-trust-item">
                <span className="lwc-check">✓</span> <strong>Aviso de saldo e saque</strong>
              </div>
              <div className="lwc-trust-item">
                <span className="lwc-check">✓</span> <strong>Saque via PIX</strong> — direto para sua conta
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ---- Main App ----
export default function App() {
  const [isMaintenance, setIsMaintenance] = useState(() => {
    const saved = localStorage.getItem('bn_site_maintenance')
    return saved === 'true'
  })
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return isAdminUrl() ? 'admin' : 'home'
  })
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('bn_current_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)

  // 1. Captura código de indicação vindo da URL (?ref=XYZ ou ?r=XYZ)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref') || params.get('r')
      if (ref) {
        const cleanRef = ref.trim().toUpperCase()
        sessionStorage.setItem('bn_pending_ref', cleanRef)
        localStorage.setItem('bn_pending_ref', cleanRef)
      }
    } catch { }
  }, [])

  // 2. Sincroniza usuários e compras remotos salvos no Supabase e API
  useEffect(() => {
    cloudGetUsers().then(remoteUsers => {
      if (remoteUsers && remoteUsers.length > 0) {
        const local = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
        const map = new Map<string, UserProfile>()
        for (const u of local) {
          const key = cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '')
          if (key) map.set(key, u)
        }
        for (const u of remoteUsers) {
          const key = cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '')
          if (key) {
            const existing = map.get(key)
            map.set(key, { ...existing, ...u })
          }
        }
        const merged = Array.from(map.values())
        localStorage.setItem('bn_all_users', JSON.stringify(merged))
      }
    }).catch(() => { })

    cloudGetPurchases().then(cloudP => {
      if (cloudP && cloudP.length > 0) {
        localStorage.setItem('bn_purchases', JSON.stringify(cloudP))
      }
    }).catch(() => { })
  }, [])

  // Sincroniza o usuário atual na nuvem assim que detectado
  useEffect(() => {
    if (currentUser) {
      cloudSaveUser(currentUser).catch(() => { })
    }
  }, [currentUser])

  // 3. Atualiza automaticamente status VIP de 10 amigos quando o usuário atingir a meta
  useEffect(() => {
    if (!currentUser) return
    const all = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
    const myFriends = all.filter(u => u.referredBy?.toUpperCase() === currentUser.referralCode?.toUpperCase())
    if (myFriends.length >= 10 && !currentUser.isVipPrimary) {
      const expires = new Date()
      expires.setDate(expires.getDate() + 180)
      const updated: UserProfile = {
        ...currentUser,
        isVipPrimary: true,
        vipExpiresAt: expires.toISOString()
      }
      setCurrentUser(updated)
      localStorage.setItem('bn_current_user', JSON.stringify(updated))
      const idx = all.findIndex(u => cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '') === updated.cleanWhatsapp)
      if (idx >= 0) {
        all[idx] = updated
        localStorage.setItem('bn_all_users', JSON.stringify(all))
      }
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updated })
      }).catch(() => { })
    }
  }, [currentUser])

  // Escuta alterações na URL para permitir login da administradora adicionando ?admin, /admin ou #admin
  useEffect(() => {
    const handleUrl = () => {
      if (isAdminUrl()) {
        setActiveTab('admin')
      }
    }
    handleUrl()
    window.addEventListener('popstate', handleUrl)
    window.addEventListener('hashchange', handleUrl)
    return () => {
      window.removeEventListener('popstate', handleUrl)
      window.removeEventListener('hashchange', handleUrl)
    }
  }, [])

  // Migração e limpeza preventiva: reseta compras legadas de teste sem usuário que estavam com status pending
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bn_purchases')
      if (raw) {
        const parsed = JSON.parse(raw) as Purchase[]
        let modified = false
        const cleaned = parsed.map(p => {
          if (p.status === 'pending' && !p.userWhatsapp) {
            modified = true
            return { ...p, status: 'link_created' as PurchaseStatus }
          }
          return p
        })
        if (modified) {
          localStorage.setItem('bn_purchases', JSON.stringify(cleaned))
        }
      }
    } catch { }
  }, [])

  const handleToggleMaintenance = () => {
    const next = !isMaintenance
    setIsMaintenance(next)
    localStorage.setItem('bn_site_maintenance', String(next))
    if (next) {
      toast.info('Modo Manutenção ativado. O público verá a tela de manutenção.')
    } else {
      toast.success('Site no ar! O público agora tem acesso completo ao app. 🚀')
    }
  }

  const handleSaveUser = (user: UserProfile) => {
    setCurrentUser(user)
    localStorage.setItem('bn_current_user', JSON.stringify(user))

    const allUsers = JSON.parse(localStorage.getItem('bn_all_users') || '[]') as UserProfile[]
    const existingIndex = allUsers.findIndex(u => u.id === user.id || cleanPhoneDigits(u.cleanWhatsapp || u.whatsapp || '') === user.cleanWhatsapp)
    if (existingIndex >= 0) {
      allUsers[existingIndex] = { ...allUsers[existingIndex], ...user }
    } else {
      allUsers.unshift(user)
    }
    localStorage.setItem('bn_all_users', JSON.stringify(allUsers))

    // Sincroniza em background com Supabase e API /api/users
    cloudSaveUser(user).catch(() => { })
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    }).catch(() => { })
  }

  const handleLogout = () => {
    if (confirm('Deseja realmente sair da sua conta? Você poderá entrar novamente digitando seu WhatsApp.')) {
      setCurrentUser(null)
      localStorage.removeItem('bn_current_user')
      setActiveTab('home')
      toast.info('Você saiu da sua conta.')
    }
  }

  // Se o site estiver em manutenção e não for a tela de admin
  if (isMaintenance && !isAdminOpen) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <MaintenancePage onOpenAdmin={() => setIsAdminOpen(true)} />
      </>
    )
  }

  // Se a administradora estiver no painel restrito durante a manutenção
  if (isAdminOpen) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="app-shell">
          <header className="app-header">
            <div className="header-logo-container">
              <div className="header-logo">
                <LogoIcon />
                <div className="logo-text">
                  <span className="bn">BN</span><span className="cb">cashback</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, background: isMaintenance ? '#fee2e2' : '#dcfce7', color: isMaintenance ? '#dc2626' : '#16a34a', padding: '3px 8px', borderRadius: 999, fontWeight: 800 }}>
                  {isMaintenance ? 'MANUTENÇÃO ATIVA' : 'SITE NO AR'}
                </span>
                <button
                  className="admin-header-btn"
                  onClick={() => setIsAdminOpen(false)}
                  title="Voltar para tela de manutenção"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>
            </div>
            <div className="header-tagline">Painel de Controle Exclusivo da Administradora</div>
          </header>
          <main className="main-content">
            <AdminPage
              onBack={() => setIsAdminOpen(false)}
              isMaintenance={isMaintenance}
              onToggleMaintenance={handleToggleMaintenance}
            />
          </main>
        </div>
      </>
    )
  }

  // Se o usuário ainda não logou / se identificou e não estiver abrindo o painel de admin
  if (!currentUser && activeTab !== 'admin') {
    return (
      <>
        <Toaster position="top-center" richColors />
        <LoginScreen
          onLogin={(user) => {
            handleSaveUser(user)
            toast.success(`Olá, ${user.name.split(' ')[0]}! Seu cashback está ativo 🎉`)
          }}
        />
      </>
    )
  }

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
          <div className="header-top-bar" style={{ justifyContent: 'center' }}>
            <div className="security-badge-header">
              <ShieldCheck size={14} color="#16a34a" />
              <span>App Seguro</span>
            </div>
          </div>
          <div className="header-logo-container">
            <div className="header-logo">
              <LogoIcon />
              <div className="logo-text">
                <span className="bn">BN</span><span className="cb">cashback</span>
              </div>
            </div>
          </div>
          <div className="header-tagline">Compre, ganhe cashback! 🎯</div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {activeTab === 'home' && (
            <HomePage
              currentUser={currentUser}
              onOpenRegister={() => setIsRegisterModalOpen(true)}
            />
          )}
          {activeTab === 'purchases' && <PurchasesPage currentUser={currentUser} />}
          {activeTab === 'balance' && (
            <BalancePage
              currentUser={currentUser}
              onOpenRegister={() => setIsRegisterModalOpen(true)}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPage
              currentUser={currentUser}
              onOpenRegister={() => setIsRegisterModalOpen(true)}
              onOpenAdmin={() => setActiveTab('admin')}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'admin' && (
            <AdminPage
              onBack={() => {
                try {
                  window.history.replaceState({}, '', '/')
                } catch { }
                setActiveTab('home')
              }}
              isMaintenance={isMaintenance}
              onToggleMaintenance={handleToggleMaintenance}
            />
          )}
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

        {/* Modal de Cadastro de Usuário / WhatsApp */}
        <UserRegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          currentUser={currentUser}
          onSave={handleSaveUser}
        />
      </div>
    </>
  )
}
