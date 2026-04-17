export interface Specialist {
  id: string;
  name: string;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  specialist_id: string;
  service_id: string | null;
  client_name: string;
  client_phone: string;
  confirmation: 0 | 1;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  specialists?: Pick<Specialist, "id" | "name"> | null;
  services?: Pick<Service, "id" | "name" | "duration_minutes" | "price"> | null;
}

export interface ServiceGroup {
  category: ServiceCategory;
  services: Service[];
}

export interface AppointmentPayload {
  specialist_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  confirmation: 0 | 1;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface DaySchedule {
  id?: string;
  specialist_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
  created_at?: string;
}

export interface ScheduleBreak {
  id?: string;
  day_schedule_id?: string;
  start_time: string;
  end_time: string;
  created_at?: string;
}

export interface DayScheduleWithBreaks extends DaySchedule {
  breaks: ScheduleBreak[];
}
