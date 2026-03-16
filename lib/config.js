// ABA Portal Config - All credentials centralized
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://htlxjkbrstpwwtzsbyvb.supabase.co';
export const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHhqa2Jyc3Rwd3d0enNieXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzI4MjEsImV4cCI6MjA4NjEwODgyMX0.MOgNYkezWpgxTO3ZHd0omZ0WLJOOR-tL7hONXWG9eBw';
export const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHhqa2Jyc3Rwd3d0enNieXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzMjgyMSwiZXhwIjoyMDg2MTA4ODIxfQ.G55zXnfanoUxRAoaYz-tD9FDJ53xHH-pRgDrKss_Iqo';
export const NYLAS_KEY = process.env.NYLAS_API_KEY || 'nyk_v0_eeBniYFxPAMuK30DejqDNIFfEyMQiH6ATEnTEhMiutJzvwor3c2ZuhC0Oeicl2vn';
export const RENDER_KEY = process.env.RENDER_API_KEY || 'rnd_IAnPoPtyfjt7XOE1PeKU8aBlqvpi';
export const ABACIA_URL = process.env.ABACIA_URL || 'https://abacia-services.onrender.com';

export const NYLAS_GRANTS = {
  claudette: '41a3ace1-1c1e-47f3-b017-e5fd71ea1f3a',
  brandon: '50053c70-ecbb-487f-a522-d3d03d72f8c5',
  bdif: 'b156e0a7-6b68-4fdf-a4c7-2a635637928b'
};

export const RENDER_SERVICES = {
  'abacia-services': 'srv-d67ucj3nv86c73e333e0',
  'myaba': 'srv-d67sic3nv86c73e0t8s0',
  'reach-services': 'srv-d678jup4tr6s7396kki0'
};
