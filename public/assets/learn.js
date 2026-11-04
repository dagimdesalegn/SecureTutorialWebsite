import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";
const $=s=>document.querySelector(s), toast=m=>{const e=$("#toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),3500)};
const sb=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const studentNavToggle=$("#studentNavToggle"),studentTopLinks=$("#studentTopLinks");
if(studentNavToggle&&studentTopLinks){
 studentNavToggle.onclick=()=>{const open=studentTopLinks.classList.toggle("is-open");studentNavToggle.setAttribute("aria-expanded",String(open));studentNavToggle.textContent=open?"×":"☰";};
 studentTopLinks.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{studentTopLinks.classList.remove("is-open");studentNavToggle.setAttribute("aria-expanded","false");studentNavToggle.textContent="☰";}));
}

let session, profile, sessionId;
const call=async(path,body)=>{const {data:{session:s}}=await sb.auth.getSession();const r=await fetch(path,{method:body?"POST":"GET",headers:{"Content-Type":"application/json","Authorization":`Bearer ${s?.access_token||""}`,...(sessionId?{"x-p30-session":sessionId}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d;};
async function init(){
 const {data,error}=await sb.auth.getSession(); if(error||!data.session){location.href="/";return;} session=data.session;
 const {data:u}=await sb.auth.getUser();const user=u.user;if(!user){location.href="/";return;}
 const {data:p}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
 if(!p){await sb.from("profiles").insert({id:user.id,email:user.email,full_name:user.user_metadata?.full_name||user.email,avatar_url:user.user_metadata?.avatar_url});}
 const {data:pr}=await sb.from("profiles").select("*").eq("id",user.id).single();profile=pr;
 $("#studentName").textContent=pr.full_name||user.email;$("#welcomeName").textContent=(pr.full_name||"Student").split(" ")[0];$("#studentEmail").textContent=user.email;$("#avatar").textContent=(pr.full_name||"S").slice(0,1).toUpperCase();
 $("#planChip").textContent=(pr.plan||"free").toUpperCase()+" PLAN";$("#planTitle").textContent=pr.plan==="pro"?"Project 30 Pro":"Free learner";$("#planDescription").textContent=pr.plan==="pro"?"Your Pro access is active. Keep going.":"Explore sample lessons and previews.";
 $("#planAction").onclick=openModal;$("#upgradeBtn").onclick=openModal;
 sessionId=crypto.randomUUID();try{await call("/api/session",{session_id:sessionId});}catch(e){toast(e.message);await sb.auth.signOut();location.href="/";return;}
 setInterval(()=>call("/api/session",{session_id:sessionId}).catch(()=>{toast("Your session is no longer active. Signing out.");sb.auth.signOut().then(()=>location.href="/");}),60000);
 loadContent();loadSettings();loadStudentChat();setInterval(loadStudentChat,20000);
 const watermark=`PROJECT 30 · ${user.email} · ${user.id.slice(0,8)}`;$("#watermark").textContent=watermark;
}
async function loadContent(){
 try{const d=await call("/api/content");$("#courseCount").textContent=`${d.courses.length} courses`;$("#courseList").innerHTML=d.courses.map(c=>`<article class="course-row"><div class="course-thumb">${(c.course_code||"P30").slice(0,3)}</div><div class="course-info"><h3>${esc(c.title)}</h3><p>${esc(c.description||"Explore course lessons and exam resources.")}</p><span class="course-tag">${c.is_free?"FREE SAMPLE":"PRO COURSE"}</span></div><button class="btn btn-small ${c.locked?"btn-outline":""}" data-course="${c.id}">${c.locked?"Unlock":"Open course"}</button></article>`).join("")||"<p>No courses have been published yet.</p>";
 $("#courseList").querySelectorAll("button").forEach(b=>b.onclick=()=>openCourse(b.dataset.course));
 $("#announcementList").innerHTML=d.announcements.map(a=>`<article class="announcement"><b>${esc(a.title)}</b><p>${esc(a.body)}</p><small>${new Date(a.created_at).toLocaleDateString()}</small></article>`).join("")||"<p>No announcements yet.</p>";
 }catch(e){toast(e.message);}
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function openCourse(id){try{const d=await call("/api/content?course_id="+encodeURIComponent(id));const c=d.course;if(c.locked){openModal();return;}const modal=$("#modal");modal.classList.add("show");modal.querySelector(".modal").innerHTML=`<button class="modal-close" id="courseClose">×</button><span class="eyebrow">COURSE CONTENT</span><h2>${esc(c.title)}</h2><p>${esc(c.description||"")}</p><div class="chapter-list">${(c.chapters||[]).map((x,i)=>`<article class="chapter"><b>${i+1}. ${esc(x.title)}</b><p>${esc(x.description||"")}</p>${x.video_url?`<a class="text-link" href="${safeUrl(x.video_url)}" target="_blank" rel="noopener">Open lesson video ↗</a>`:""}${x.notes_text?`<details><summary>View lesson notes</summary><p>${esc(x.notes_text)}</p></details>`:""}</article>`).join("")||"<p>Lessons are being prepared.</p>"}<h3>Previous-year exams</h3>${(d.resources||[]).map(r=>`<p><a class="text-link" href="${safeUrl(r.file_url)}" target="_blank" rel="noopener">${esc(r.title)} ↗</a></p>`).join("")}</div>`;$("#courseClose").onclick=()=>modal.classList.remove("show");}catch(e){toast(e.message);}}
function safeUrl(u=""){try{const x=new URL(u,location.origin);return ["https:","http:"].includes(x.protocol)?x.href:"#";}catch{return "#";}}
async function loadSettings(){try{const d=await call("/api/content");$("#modalPrice").textContent=d.settings.pro_price_etb;updateInstructions(d.settings.payment_instructions);}catch{}}
let instructions={};function updateInstructions(i={}){instructions=i;$("#paymentInstructions").textContent=i[$("#paymentMethod").value]||"Contact Project 30 admin for payment instructions.";}
function openModal(){loadSettings();$("#modal").classList.add("show");}
$("#paymentMethod").onchange=()=>updateInstructions(instructions);
$("#closeModal").onclick=()=>$("#modal").classList.remove("show");$("#modal").onclick=e=>{if(e.target.id==="modal")e.currentTarget.classList.remove("show");};
$("#verifyPayment").onclick=async()=>{const reference=$("#transactionRef").value.trim();if(!reference){toast("Enter your bank transaction reference.");return;}const status=$("#verifyStatus");status.textContent="Sending securely to Verify.ET…";try{const d=await call("/api/payment-initiate",{method:$("#paymentMethod").value,action:"verify",transaction_reference:reference,suffix:$("#accountSuffix").value.trim()});status.textContent=d.message||"Payment verified. Pro is active.";toast(d.message||"Payment verified.");if(d.pro_activated){$("#modal").classList.remove("show");setTimeout(()=>location.reload(),900);}}catch(e){status.textContent=e.message;toast(e.message);}};
$("#submitPayment").onclick=async()=>{const f=$("#proofFile").files[0];if(!f){toast("Attach a receipt for manual review.");return;}if(f.size>5*1024*1024){toast("File must be 5 MB or smaller.");return;}if(!["image/jpeg","image/png","application/pdf"].includes(f.type)){toast("Use JPG, PNG, or PDF.");return;}try{const fd=new FormData();fd.append("method",$("#paymentMethod").value);fd.append("transaction_reference",$("#transactionRef").value);fd.append("proof",f);const {data:{session:s}}=await sb.auth.getSession();const r=await fetch("/api/payment-manual",{method:"POST",headers:{Authorization:`Bearer ${s.access_token}`,"x-p30-session":sessionId},body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error);toast("Payment submitted. An admin will review it.");$("#modal").classList.remove("show");}catch(e){toast(e.message);}};
async function loadStudentChat(){try{const d=await call("/api/support");$("#studentChatMessages").innerHTML=(d.messages||[]).map(m=>`<div class="chat-bubble ${m.from==="student"?"mine":""}"><small>${m.from==="admin"?"Project 30 team":"You"} · ${new Date(m.created_at).toLocaleString()}</small><p>${esc(m.body)}</p></div>`).join("")||"<p>No messages yet. Send us a question.</p>";$("#studentChatMessages").scrollTop=$("#studentChatMessages").scrollHeight;}catch(e){$("#studentChatMessages").textContent=e.message;}}
$("#studentChatForm").onsubmit=async e=>{e.preventDefault();const body=$("#studentChatInput").value.trim();if(!body)return;try{await call("/api/support",{body});$("#studentChatInput").value="";await loadStudentChat();toast("Message sent to Project 30.");}catch(x){toast(x.message);}};

$("#summarizeBtn").onclick=async()=>{const text=$("#notesInput").value.trim();if(text.length<30){toast("Paste at least 30 characters of notes.");return;}$("#summaryOutput").textContent="Preparing summary...";try{const d=await call("/api/ai-summary",{text});$("#summaryOutput").textContent=d.summary;}catch(e){$("#summaryOutput").textContent=e.message;}};
$("#signOut").onclick=async()=>{try{await call("/api/session",{session_id:sessionId,release:true});}catch{} await sb.auth.signOut();location.href="/";};
// Deterrents only; these do not prevent screenshots, recording, inspection or determined copying.
document.addEventListener("contextmenu",e=>e.preventDefault());document.addEventListener("copy",e=>e.preventDefault());document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&["c","u","s","p"].includes(e.key.toLowerCase()))e.preventDefault();});
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
init();
