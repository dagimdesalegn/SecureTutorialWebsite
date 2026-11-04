import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";
const toast = (m)=>{const el=document.querySelector("#toast");if(!el)return;el.textContent=m;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3600)};
let sb;
try { if(SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length>20) sb=createClient(SUPABASE_URL,SUPABASE_ANON_KEY); } catch (e) { console.error(e); }
let signingIn=false;
async function login(event){
  if(signingIn)return;
  if(!sb){toast("Sign-in is not configured yet. Check SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.");return;}
  signingIn=true;
  const buttons=[...document.querySelectorAll("#navLogin,#heroLogin,#freeLogin,#proLogin,#ctaLogin")];
  buttons.forEach(b=>{b.disabled=true;b.dataset.oldText=b.innerHTML;b.classList.add("is-loading");b.innerHTML='<span class="google-spinner" aria-hidden="true"></span> Connecting…'});
  const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/learn.html",queryParams:{prompt:"select_account"}}});
  if(error){toast(error.message);signingIn=false;buttons.forEach(b=>{b.disabled=false;b.classList.remove("is-loading");b.innerHTML=b.dataset.oldText||"Continue with Google"});}
}
["navLogin","heroLogin","freeLogin","proLogin","ctaLogin"].forEach(id=>document.getElementById(id)?.addEventListener("click",login));
document.querySelector("#year").textContent=new Date().getFullYear();
const menu=document.querySelector("#menuBtn"),links=document.querySelector(".nav-links");
menu?.addEventListener("click",()=>{const open=links.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));menu.setAttribute("aria-label",open?"Close menu":"Open menu");menu.textContent=open?"×":"☰"});
links?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{links.classList.remove("open");menu?.setAttribute("aria-expanded","false");if(menu){menu.textContent="☰";menu.setAttribute("aria-label","Open menu")}}));
fetch("/api/content").then(r=>r.json()).then(d=>{if(d.settings?.pro_price_etb)document.querySelector("#landingPrice").textContent=d.settings.pro_price_etb;}).catch(()=>{});
