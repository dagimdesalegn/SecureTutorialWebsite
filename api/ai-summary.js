import {requireActiveUser,json,method} from "../lib/_lib.js";
export default async function handler(req,res){
 const user=await requireActiveUser(req,res);if(!user)return;if(!method(req,res,"POST"))return;
 const text=String(req.body?.text||"").trim();if(text.length<30||text.length>20000)return json(res,400,{error:"Notes must be between 30 and 20,000 characters"});
 if(!process.env.AI_API_URL||!process.env.AI_API_KEY)return json(res,503,{error:"AI summaries are not configured yet. Add the AI provider settings in Vercel."});
 try{
  const response=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Authorization":`Bearer ${process.env.AI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.AI_MODEL||undefined,messages:[{role:"system",content:"Summarize the student's supplied study notes clearly. Use headings, key concepts, definitions and a short revision checklist. Do not invent facts."},{role:"user",content:text}],temperature:0.3})});
  const data=await response.json();if(!response.ok)throw new Error("AI provider returned an error");
  const summary=data.choices?.[0]?.message?.content||data.output_text||data.summary;if(!summary)throw new Error("Unexpected AI response format");
  return json(res,200,{summary});
 }catch(e){return json(res,502,{error:e.message||"AI summary failed"});}
}
