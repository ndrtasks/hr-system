import type { VercelRequest, VercelResponse } from '@vercel/node';

const SECRET='4WQA9gdjKh39H7f4w5jOCfiQkJu59KY96t_eAB8qUPA';
const TARGET=`https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-odoo-attendance-inspect?s=${SECRET}`;

export default async function handler(req: VercelRequest,res: VercelResponse){
  if(String(req.query.s||'')!==SECRET)return res.status(404).json({error:'not_found'});
  const action=String(req.query.action||'inspect');
  const r=await fetch(`${TARGET}&action=${encodeURIComponent(action)}`,{headers:{accept:'application/json'}});
  const text=await r.text();
  res.setHeader('cache-control','no-store');
  res.status(r.status).send(text);
}
