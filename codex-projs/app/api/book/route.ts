import { format } from "date-fns";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendBookingNotification } from "@/lib/telegram";

interface CreateBookingBody {
  specialistId: string;
  branchId: string;
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
  const { data: booking, error } = await supabase
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
    })
    .select("client_name, client_phone, start_time, notes")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: 400 }
    );
  }

  const bookingStart = new Date(booking.start_time);
  sendBookingNotification({
    clientName: booking.client_name,
    phone: booking.client_phone,
    service: body.serviceName,
    master: body.specialistName,
    date: format(bookingStart, "dd.MM.yyyy"),
    time: format(bookingStart, "HH:mm"),
    comment: booking.notes ?? undefined
  }).catch((notificationError) => {
    console.error("Failed to send Telegram booking notification:", {
      message: notificationError instanceof Error ? notificationError.message : notificationError,
      booking: {
        clientName: booking.client_name,
        phone: booking.client_phone,
        service: body.serviceName,
        master: body.specialistName,
        startTime: booking.start_time
      }
    });
  });

  return NextResponse.json({ success: true });
}
