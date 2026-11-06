import { createClient } from '@supabase/supabase-js'
import type { UserProfile, Purchase, WithdrawalRequest } from './App'

const SUPABASE_URL = 'https://neixytbxkaqsxjbgutpo.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laXh5dGJ4a2Fxc3hqYmd1dHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzYwNzUsImV4cCI6MjA5MzUxMjA3NX0.LENwJMc5v9TupyAeftZINuuqvqbt1eZw25HCOzyX-Nw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ---- Mapeamento de Usuários ----
export function userToRow(u: UserProfile) {
  return {
    id: u.id,
    name: u.name,
    whatsapp: u.whatsapp,
    clean_whatsapp: (u.cleanWhatsapp || u.whatsapp || '').replace(/\D/g, ''),
    email: u.email || null,
    referral_code: u.referralCode,
    created_at: u.createdAt,
    referred_by: u.referredBy || null,
    referred_by_name: u.referredByName || null,
    referred_by_whatsapp: u.referredByWhatsapp || null,
    is_vip_primary: Boolean(u.isVipPrimary),
    vip_expires_at: u.vipExpiresAt || null,
    updated_at: new Date().toISOString()
  }
}

export function rowToUser(r: any): UserProfile {
  return {
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
  }
}

// ---- Mapeamento de Compras / Links ----
export function purchaseToRow(p: Purchase) {
  return {
    id: p.id,
    platform: p.platform,
    product_name: p.productName,
    original_link: p.originalLink || null,
    affiliate_link: p.affiliateLink,
    price: Number(p.price) || 0,
    total_commission: Number(p.totalCommission) || 0,
    owner_profit: Number(p.ownerProfit) || 0,
    cashback: Number(p.cashback) || 0,
    cashback_rate_pct: p.cashbackRatePct || null,
    category_name: p.categoryName || null,
    category_icon: p.categoryIcon || null,
    status: p.status,
    date: p.date,
    user_name: p.userName || null,
    user_whatsapp: p.userWhatsapp || null,
    primary_user_name: p.primaryUserName || null,
    primary_user_whatsapp: p.primaryUserWhatsapp || null,
    primary_bonus_amount: Number(p.primaryBonusAmount) || 0,
    is_referral_bonus: Boolean(p.isReferralBonus),
    referred_buyer_name: p.referredBuyerName || null
  }
}

export function rowToPurchase(r: any): Purchase {
  return {
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
  }
}

// ---- Mapeamento de Saques ----
export function withdrawalToRow(w: WithdrawalRequest) {
  return {
    id: w.id,
    user_name: w.userName,
    user_whatsapp: w.userWhatsapp || null,
    pix_key: w.pixKey,
    pix_type: w.pixType,
    amount: Number(w.amount) || 0,
    status: w.status,
    created_at: w.createdAt,
    paid_at: w.paidAt || null
  }
}

export function rowToWithdrawal(r: any): WithdrawalRequest {
  return {
    id: r.id,
    userName: r.user_name,
    userWhatsapp: r.user_whatsapp || undefined,
    pixKey: r.pix_key,
    pixType: r.pix_type,
    amount: Number(r.amount) || 0,
    status: r.status,
    createdAt: r.created_at,
    paidAt: r.paid_at || undefined
  }
}

// ---- Operações em Nuvem (Cloud Sync) ----

export async function cloudSaveUser(user: UserProfile): Promise<void> {
  try {
    await supabase.from('bn_users').upsert(userToRow(user))
  } catch (err) {
    console.warn('Erro ao salvar usuário na nuvem:', err)
  }
}

export async function cloudGetUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('bn_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data.map(rowToUser)
  } catch (err) {
    console.warn('Erro ao buscar usuários da nuvem:', err)
    return []
  }
}

export async function cloudDeleteUser(userId: string): Promise<void> {
  try {
    await supabase.from('bn_users').delete().eq('id', userId)
  } catch (err) {
    console.warn('Erro ao excluir usuário na nuvem:', err)
  }
}

export async function cloudSavePurchase(purchase: Purchase): Promise<void> {
  try {
    await supabase.from('bn_purchases').upsert(purchaseToRow(purchase))
  } catch (err) {
    console.warn('Erro ao salvar compra na nuvem:', err)
  }
}

export async function cloudGetPurchases(): Promise<Purchase[]> {
  try {
    const { data, error } = await supabase
      .from('bn_purchases')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data.map(rowToPurchase)
  } catch (err) {
    console.warn('Erro ao buscar compras da nuvem:', err)
    return []
  }
}

export async function cloudSaveWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
  try {
    await supabase.from('bn_withdrawals').upsert(withdrawalToRow(withdrawal))
  } catch (err) {
    console.warn('Erro ao salvar saque na nuvem:', err)
  }
}

export async function cloudGetWithdrawals(): Promise<WithdrawalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('bn_withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data.map(rowToWithdrawal)
  } catch (err) {
    console.warn('Erro ao buscar saques da nuvem:', err)
    return []
  }
}

