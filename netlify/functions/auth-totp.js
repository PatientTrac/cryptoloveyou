import { authenticator } from 'otplib'
import { getSupabaseClient } from './utils/supabase.js'
import { verifyToken } from './auth.js'
const ISSUER = 'CryptoLoveYou Admin'
const cors = () => ({'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'})
function requireAuth(event) {
  const h = event.headers?.authorization || event.headers?.Authorization || ''
  if (h.startsWith('Bearer ')) { const u = verifyToken(h.slice(7).trim()); if (u) return {ok:true,user:u} }
  return {ok:false,error:'Unauthorized'}
}
export const handler = async (event) => {
  const headers = cors()
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''}
  const path = event.path || ''
  const auth = requireAuth(event)
  if (!auth.ok) return {statusCode:401,headers,body:JSON.stringify({error:auth.error})}
  if (event.httpMethod === 'GET' && path.includes('/setup')) {
    try {
      const secret = authenticator.generateSecret()
      const otpauth = authenticator.keyuri(auth.user.username, ISSUER, secret)
      const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauth)}`
      const supabase = getSupabaseClient()
      await supabase.from('admin_users').update({totp_secret_pending:secret}).eq('username',auth.user.username.toLowerCase())
      return {statusCode:200,headers,body:JSON.stringify({ok:true,secret,qr_url:qrUrl})}
    } catch(err) { return {statusCode:500,headers,body:JSON.stringify({error:err.message})} }
  }
  if (event.httpMethod === 'POST' && path.includes('/verify')) {
    try {
      const {code} = JSON.parse(event.body||'{}')
      if (!code) return {statusCode:400,headers,body:JSON.stringify({error:'Code required'})}
      const supabase = getSupabaseClient()
      const {data:user} = await supabase.from('admin_users').select('totp_secret_pending,totp_secret').eq('username',auth.user.username.toLowerCase()).single()
      const secret = user?.totp_secret_pending || user?.totp_secret
      if (!secret) return {statusCode:400,headers,body:JSON.stringify({error:'No TOTP setup in progress'})}
      const isValid = authenticator.verify({token:String(code).replace(/\s/g,''),secret})
      if (!isValid) return {statusCode:401,headers,body:JSON.stringify({error:'Invalid code'})}
      await supabase.from('admin_users').update({totp_secret:secret,totp_secret_pending:null,totp_enabled:true}).eq('username',auth.user.username.toLowerCase())
      return {statusCode:200,headers,body:JSON.stringify({ok:true,message:'Google Authenticator enabled'})}
    } catch(err) { return {statusCode:500,headers,body:JSON.stringify({error:err.message})} }
  }
  if (event.httpMethod === 'POST' && path.includes('/disable')) {
    const supabase = getSupabaseClient()
    await supabase.from('admin_users').update({totp_secret:null,totp_secret_pending:null,totp_enabled:false}).eq('username',auth.user.username.toLowerCase())
    return {statusCode:200,headers,body:JSON.stringify({ok:true,message:'Google Authenticator disabled'})}
  }
  return {statusCode:404,headers,body:JSON.stringify({error:'Not found'})}
}
