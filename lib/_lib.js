import { createClient } from "@supabase/supabase-js";
import { SignJWT, jwtVerify } from "jose";
export const admin = createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
export const userClient=(token)=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
export function json(res,status,data){res.status(status).setHeader("Content-Type","application/json").json(data);}
export function bearer(req){const h=req.headers.authorization||"";return h.startsWith("Bearer ")?h.slice(7):null;}
export async function requireUser(req,res){const token=bearer(req);if(!token){json(res,401,{error:"Sign in required"});return null;}const {data,error}=await admin.auth.getUser(token);if(error||!data.user){json(res,401,{error:"Invalid or expired sign-in"});return null;}return data.user;}
export async function requireAdmin(req,res){const cookie=req.headers.cookie||"";const raw=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("p30_admin="))?.slice(10);if(!raw){json(res,401,{error:"Admin sign-in required"});return false;}try{await jwtVerify(raw,new TextEncoder().encode(process.env.ADMIN_JWT_SECRET));return true;}catch{json(res,401,{error:"Admin session expired"});return false;}}
export const cookie=(value,maxAge)=>`p30_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
export async function createAdminToken(){return new SignJWT({role:"admin"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(new TextEncoder().encode(process.env.ADMIN_JWT_SECRET));}
export function method(req,res,m){if(req.method!==m){json(res,405,{error:"Method not allowed"});return false;}return true;}
export async function sessionValid(userId,sessionId){const {data}=await admin.from("active_sessions").select("*").eq("user_id",userId).maybeSingle();return !!data&&data.session_id===sessionId&&new Date(data.expires_at)>new Date();}
export async function requireActiveUser(req,res){const user=await requireUser(req,res);if(!user)return null;const sid=req.headers["x-p30-session"]||req.query.session_id;if(!sid){json(res,401,{error:"Active learning session required"});return null;}if(!(await sessionValid(user.id,sid))){json(res,409,{error:"This account is active in another session. Sign out there or sign in again."});return null;}return user;}
