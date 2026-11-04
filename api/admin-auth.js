import {timingSafeEqual} from "node:crypto";
import {json,method,cookie,createAdminToken} from "../lib/_lib.js";
export default async function handler(req,res){
 if(req.method==="GET"){const raw=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("p30_admin="))?.slice(10);if(!raw)return json(res,401,{error:"Not signed in"});const {jwtVerify}=await import("jose");try{await jwtVerify(raw,new TextEncoder().encode(process.env.ADMIN_JWT_SECRET));return json(res,200,{ok:true});}catch{return json(res,401,{error:"Session expired"});}}
 if(!method(req,res,"POST"))return;
 if(req.body?.logout){res.setHeader("Set-Cookie",cookie("",0));return json(res,200,{ok:true});}
 const {username,password}=req.body||{};
 if(!process.env.ADMIN_USERNAME||!process.env.ADMIN_PASSWORD||!process.env.ADMIN_JWT_SECRET)return json(res,503,{error:"Admin credentials are not configured"});
 const expected=Buffer.from(process.env.ADMIN_PASSWORD);const supplied=Buffer.from(typeof password==="string"?password:"");const passwordOk=supplied.length===expected.length&&timingSafeEqual(supplied,expected);if(username!==process.env.ADMIN_USERNAME||!passwordOk)return json(res,401,{error:"Incorrect username or password"});
 const token=await createAdminToken();res.setHeader("Set-Cookie",cookie(token,8*60*60));return json(res,200,{ok:true});
}
