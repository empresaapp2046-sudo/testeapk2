import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadLocalDataFromDisk, saveLocalDataToDisk } from "./offline.server";

export const saveLocalData = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ category: z.string(), content: z.any(), tenantId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      saveLocalDataToDisk(data.category, data.content, data.tenantId);
      return { success: true };
    } catch (error) {
      console.error(`Erro ao salvar dados locais (${data.category}):`, error);
      return { success: false, error: String(error) };
    }
  });

export const loadLocalData = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ category: z.string(), tenantId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      return { success: true, content: loadLocalDataFromDisk(data.category, data.tenantId) };
    } catch (error) {
      console.error(`Erro ao carregar dados locais (${data.category}):`, error);
      return { success: false, error: String(error) };
    }
  });
