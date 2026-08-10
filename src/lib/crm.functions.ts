/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addTicketMessageRecord,
  deleteCustomerRecord,
  fetchCustomerProfile,
  fetchCustomers,
  fetchMessagingConfig,
  fetchTicketThread,
  fetchTickets,
  importCustomersFromNetwork,
  runCampaignRecord,
  runExpiryRemindersRecord,
  saveCustomerRecord,
  saveProviderRecord,
  saveTemplateRecord,
  saveTicketRecord,
  sendMessageRecord,
  ticketsFromAlertsRecord,
} from "./crm.server";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const getCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchCustomers(context.supabase));

export const getCustomerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ customerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => fetchCustomerProfile(context.supabase, data.customerId));

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        full_name: z.string().trim().min(2).max(120),
        phone: optionalText(24),
        email: optionalText(160),
        national_id: optionalText(40),
        address: optionalText(240),
        area: optionalText(80),
        customer_type: z.enum(["hotspot", "pppoe", "static_ip", "voucher_only"]),
        status: z.enum(["active", "expired", "paused", "suspended"]),
        router_id: z.string().uuid().nullable().optional(),
        site_id: z.string().uuid().nullable().optional(),
        hotspot_user_id: z.string().uuid().nullable().optional(),
        pppoe_subscriber_id: z.string().uuid().nullable().optional(),
        notes: optionalText(600),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveCustomerRecord(context.supabase, context.userId, data));

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ customerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    deleteCustomerRecord(context.supabase, context.userId, data.customerId),
  );

export const importCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => importCustomersFromNetwork(context.supabase, context.userId));

/* ------------------------------- messaging ---------------------------------- */

export const getMessagingConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchMessagingConfig(context.supabase));

export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        channel: z.enum(["sms", "whatsapp", "email"]),
        provider: z.string().trim().min(2).max(40),
        label: z.string().trim().min(2).max(80),
        sender_id: optionalText(20),
        base_url: optionalText(300),
        config: z.record(z.string(), z.any()).optional(),
        is_default: z.boolean(),
        is_active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveProviderRecord(context.supabase, context.userId, data));

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        key: z.string().trim().min(2).max(40),
        name: z.string().trim().min(2).max(80),
        channel: z.enum(["sms", "whatsapp", "email"]),
        subject: optionalText(140),
        body: z.string().trim().min(2).max(1200),
        is_active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveTemplateRecord(context.supabase, context.userId, data));

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        customerId: z.string().uuid().nullable().optional(),
        channel: z.enum(["sms", "whatsapp", "email"]),
        to: z.string().trim().min(3).max(160),
        body: z.string().trim().min(1).max(1200),
        templateKey: optionalText(40),
        scheduledFor: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => sendMessageRecord(context.supabase, context.userId, data));

export const runCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        channel: z.enum(["sms", "whatsapp", "email"]),
        body: z.string().trim().min(2).max(1200),
        audience: z.object({
          status: z.string().max(20).optional(),
          customerType: z.string().max(20).optional(),
        }),
        scheduledFor: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => runCampaignRecord(context.supabase, context.userId, data));

export const runExpiryReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => runExpiryRemindersRecord(context.supabase));

/* --------------------------------- tickets ---------------------------------- */

export const getTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchTickets(context.supabase));

export const getTicketThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ticketId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => fetchTicketThread(context.supabase, data.ticketId));

export const saveTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        customer_id: z.string().uuid().nullable().optional(),
        router_id: z.string().uuid().nullable().optional(),
        subject: z.string().trim().min(3).max(160),
        description: optionalText(2000),
        category: z.enum(["connection", "billing", "slow_speed", "installation", "general"]),
        priority: z.enum(["low", "medium", "high", "critical"]),
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        assigned_to: z.string().uuid().nullable().optional(),
        source: z.enum(["portal", "whatsapp", "phone", "walk_in", "router_alert"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => saveTicketRecord(context.supabase, context.userId, data));

export const addTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ticketId: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
        isInternal: z.boolean(),
        notifyCustomer: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => addTicketMessageRecord(context.supabase, context.userId, data));

export const createTicketsFromAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ticketsFromAlertsRecord(context.supabase, context.userId));
