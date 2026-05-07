import { format } from "date-fns";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendBookingNotification } from "@/lib/telegram";

interface CreateBookingBody {
  specialistId: string;
  branchId: string;
  branchName: string;
  serviceId: string;
  serviceName: string;
  specialistName: string;
  clientName: string;
  clientPhone: string;
  startTime: string;
  endTime: string;
  comment?: string;
  turnstileToken?: string;
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // if not configured — skip verification (dev mode)

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });

  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function POST(request: Request) {
  let body: CreateBookingBody;

  try {
    body = (await request.json()) as CreateBookingBody;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  if (
    !body.specialistId ||
    !body.branchId ||
    !body.branchName ||
    !body.serviceId ||
    !body.serviceName ||
    !body.specialistName ||
    !body.clientName ||
    !body.clientPhone ||
    !body.startTime ||
    !body.endTime
  ) {
    return NextResponse.json(
      { success: false, message: "Missing required booking fields." },
      { status: 400 }
    );
  }

  // Verify Turnstile captcha
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!body.turnstileToken) {
      return NextResponse.json(
        { success: false, message: "Captcha token is missing." },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
      "";

    const isHuman = await verifyTurnstile(body.turnstileToken, clientIp);
    if (!isHuman) {
      return NextResponse.json(
        { success: false, message: "Captcha verification failed. Please try again." },
        { status: 403 }
      );
    }
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("appointments")
    .insert({
      specialist_id: body.specialistId,
      branch_id: body.branchId,
      service_id: body.serviceId,
      client_name: body.clientName,
      client_phone: body.clientPhone,
      confirmation: 0,
      start_time: body.startTime,
      end_time: body.endTime,
      notes: body.comment?.trim() ? body.comment.trim() : null
    });

  if (error) {
    console.error("[book] Supabase insert error:", error.code, error.message);
    return NextResponse.json(
      { success: false, code: error.code, message: "Не удалось создать запись. Попробуйте ещё раз." },
      { status: 400 }
    );
  }

  const bookingStart = new Date(body.startTime);
  sendBookingNotification({
    clientName: body.clientName,
    phone: body.clientPhone,
    service: body.serviceName,
    master: body.specialistName,
    branch: body.branchName,
    date: format(bookingStart, "dd.MM.yyyy"),
    time: format(bookingStart, "HH:mm"),
    comment: body.comment
  }).catch(console.error);

  return NextResponse.json({ success: true, notificationSent: true });
}
