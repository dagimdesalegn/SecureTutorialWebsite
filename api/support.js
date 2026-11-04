import {admin,requireActiveUser,requireAdmin,json,method} from "../lib/_lib.js";
import {randomUUID} from "node:crypto";
const PREFIX="support:";
function unpack(row){const parts=String(row.provider_transaction_id||"").split("|");let body="";try{body=Buffer.from(parts.slice(2).join("|"),"base64url").toString("utf8");}catch{}return {id:parts[0],from:parts[1]==="admin"?"admin":"student",body,created_at:row.created_at};}
export default async function handler(req,res){
 if(req.method==="GET"){
  const isAdmin=(req.headers.cookie||"").includes("p30_admin=");
  if(isAdmin){if(!await requireAdmin(req,res))return;const {data:rows=[],error}=await admin.from("payment_events").select("provider,provider_transaction_id,created_at").like("provider",PREFIX+"%").order("created_at",{ascending:true}).limit(2000);if(error)return json(res,500,{error:"Could not load support inbox"});const threads={};for(const row of rows){const userId=row.provider.slice(PREFIX.length);if(!/^[0-9a-f-]{36}$/i.test(userId))continue;(threads[userId]??=[]).push(unpack(row));}return json(res,200,{threads:Object.entries(threads).map(([user_id,messages])=>({user_id,messages}))});}
  const user=await requireActiveUser(req,res);if(!user)return;const {data:rows=[],error}=await admin.from("payment_events").select("provider_transaction_id,created_at").eq("provider",PREFIX+user.id).order("created_at",{ascending:true}).limit(200);if(error)return json(res,500,{error:"Could not load support messages"});return json(res,200,{messages:rows.map(unpack)});
 }
 if(!method(req,res,"POST"))return;
 const b=req.body||{},body=String(b.body||"").trim();if(!body||body.length>3000)return json(res,400,{error:"Message must be 1–3000 characters"});
 const isAdmin=(req.headers.cookie||"").includes("p30_admin=");let userId,from;
 if(isAdmin){if(!await requireAdmin(req,res))return;userId=String(b.user_id||"");from="admin";if(!/^[0-9a-f-]{36}$/i.test(userId))return json(res,400,{error:"Invalid student account"});}
 else{const user=await requireActiveUser(req,res);if(!user)return;userId=user.id;from="student";}
 const encoded=Buffer.from(body,"utf8").toString("base64url");const {error}=await admin.from("payment_events").insert({provider:PREFIX+userId,provider_transaction_id:`${randomUUID()}|${from}|${encoded}`});if(error)return json(res,500,{error:"Could not send message"});return json(res,201,{ok:true});
 return json(res,405,{error:"Method not allowed"});
}
