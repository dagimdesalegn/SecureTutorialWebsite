import {admin,requireUser,json,method} from "../lib/_lib.js";
export default async function handler(req,res){
 const user=await requireUser(req,res);if(!user)return;
 if(!method(req,res,"POST"))return;
 const sid=req.body?.session_id;if(!sid||!/^[0-9a-f-]{36}$/i.test(sid))return json(res,400,{error:"Invalid session identifier"});
 if(req.body?.release){await admin.from("active_sessions").delete().eq("user_id",user.id).eq("session_id",sid);return json(res,200,{ok:true});}
 const ttl=Math.max(300,Math.min(86400,Number(process.env.SESSION_MAX_AGE_SECONDS||86400)));
 const {data:old}=await admin.from("active_sessions").select("*").eq("user_id",user.id).maybeSingle();
 // Existing unexpired session with a different id means another device is active.
 if(old&&new Date(old.expires_at)>new Date()&&old.session_id!==sid)return json(res,409,{error:"Another active session exists for this account."});
 const {error}=await admin.from("active_sessions").upsert({user_id:user.id,session_id:sid,last_seen:new Date().toISOString(),expires_at:new Date(Date.now()+ttl*1000).toISOString()});
 if(error)return json(res,500,{error:"Could not establish session"});
 return json(res,200,{ok:true});
}
