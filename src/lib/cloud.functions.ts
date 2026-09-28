// @ts-nocheck

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const saveExternalConfig = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    firebaseConfig: z.any().optional(),
    supabaseConfig: z.any().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { firebaseConfig, supabaseConfig } = data;

    if (firebaseConfig) {
      await supabaseAdmin
        .from('system_configs')
        .upsert({ key_name: 'firebase_keys', key_value: firebaseConfig }, { onConflict: 'key_name' });
    }

    if (supabaseConfig) {
      await supabaseAdmin
        .from('system_configs')
        .upsert({ key_name: 'supabase_keys', key_value: supabaseConfig }, { onConflict: 'key_name' });
    }

    return { success: true };
  });

export const getExternalConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    
    const { data: firebaseKeys } = await supabaseAdmin
      .from('system_configs')
      .select('key_value')
      .eq('key_name', 'firebase_keys')
      .single();

    const { data: supabaseKeys } = await supabaseAdmin
      .from('system_configs')
      .select('key_value')
      .eq('key_name', 'supabase_keys')
      .single();

    return { 
      firebase: firebaseKeys?.key_value || null,
      supabase: supabaseKeys?.key_value || null
    };
  });
