import type { VercelRequest,VercelResponse } from '@vercel/node';
const SECRET='QZx9R8vS5dK2jL7mN4pT1wY6uA3cE0hF';
const BASE='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-odoo-attendance-inspect';
export default async function handler(req:VercelRequest,res:VercelResponse){if(String(req.query.s||'')!==SECRET)return res.status(404).json({error:'not_found'});const action=String(req.query.action||'test');const r=await fetch(`${BASE}?s=${SECRET}&action=${encodeURIComponent(action)}`);const t=await r.text();res.setHeader('cache-control','no-store');res.status(r.status).send(t)}