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

  const supabase = createClient();
  // route.ts — убираем .select().single()
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
  return NextResponse.json(
    { success: false, code: error.code, message: error.message },
    { status: 400 }
  );
}

// Данные для Telegram берём из body напрямую
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
