import {json,method} from "../lib/_lib.js";
export default function handler(req,res){
  if(!method(req,res,"GET")) return;
  res.setHeader("Cache-Control","no-store, max-age=0");
  json(res,200,{supabaseUrl:process.env.SUPABASE_URL||"",supabaseAnonKey:process.env.SUPABASE_ANON_KEY||""});
}
