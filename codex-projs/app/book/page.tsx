import { BookingWizard } from "@/components/booking/BookingWizard";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-6">
      <div className="mx-auto max-w-[430px] space-y-4">
        <header className="rounded-[32px] bg-white px-5 py-6 shadow-sm">
          <p className="text-sm font-medium text-accent">Онлайн-запись</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Запишитесь на услугу</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Выберите специалиста, удобное время и оставьте контакты.
          </p>
        </header>
        <BookingWizard />
      </div>
    </main>
  );
}
