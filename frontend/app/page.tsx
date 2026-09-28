"use client";

import React from "react";
import { Globe } from "lucide-react";
import {
  Navbar,
  Footer,
  DatePickerStrip,
  SelectedAppointmentCard,
  TimeSlotGrid,
  Step2Progress,
  ParentDetailsForm,
  TrialClassSummaryCard,
  ConfirmationStepper,
  ConfirmationHeader,
  ConfirmedAppointmentCard,
  PostBookingActions,
  PageBackground,
} from "@/components";
import { useBookingFlow } from "@/hooks/use-booking-flow";

export default function BookingPage() {
  const {
    step,
    timezone,
    selectedDate,
    selectedTime,
    selectedSlot,
    parentName,
    parentEmail,
    dateItems,
    activeDateItem,
    availableSlots,
    isPrevDisabled,
    isSubmitting,
    submitError,
    submitConflict,
    isLoadingSlots,
    slotsError,
    confirmedBooking,
    preferredTime,
    preferredSlotStatus,
    preferredSlotMessage,
    setParentName,
    setParentEmail,
    goToStep,
    handleSelectDate,
    handleSelectSlot,
    handleSelectPreferredTime,
    handlePrevDays,
    handleNextDays,
    handleConfirmBooking,
  } = useBookingFlow();

  return (
    <div className="relative min-h-screen flex flex-col bg-[#DFE4EA] text-[#0F172A] font-sans">
      {/* Ambient background canvas — sits behind all content */}
      <PageBackground variant={step === 3 ? "success" : "default"} />

      {/* Top Navbar */}
      <Navbar
        timezone={timezone}
        onLogoClick={() => goToStep(1)}
      />

      {/* Main Content Area */}
      <main className="relative w-full flex-1 pt-16" style={{ zIndex: 1 }}>
        {/* ================= STEP 1: TIME SELECTION ================= */}
        {step === 1 && (
          <div
            key="step-1"
            className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 sm:py-12 page-enter"
          >
            {/* Page Header */}
            <header className="mb-8">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase block mb-1">
                FREE TRIAL CLASS
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Book a free trial class
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl leading-relaxed">
                Choose a convenient time in your local timezone. We&apos;ll automatically match you with
                an available mentor.
              </p>
            </header>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Left Column: Timezone, Date Picker & Selected Card */}
              <section className="lg:col-span-5 space-y-6">
                {/* 1. Auto-detected Timezone */}
                <div>
                  <label className="text-xs font-bold text-slate-900 tracking-wide mb-1.5 block">
                    Your timezone
                  </label>
                  <div className="live-ring w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white shadow-card text-left select-none card-lift">
                    <div className="flex items-center gap-2.5 truncate">
                      <Globe className="w-4 h-4 text-[#D98B0F] shrink-0" />
                      <span className="text-sm font-semibold text-[#0F172A] truncate">
                        {timezone.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#00A86B] bg-[#E6F7F0] px-2 py-0.5 rounded-full border border-emerald-200/70 shrink-0">
                      Auto-detected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-normal">
                    Times are automatically shown in your detected local timezone.
                  </p>
                </div>

                {/* 2. Date Picker */}
                <div>
                  <DatePickerStrip
                    dates={dateItems}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    onPrev={handlePrevDays}
                    onNext={handleNextDays}
                    currentMonthYear={activeDateItem.monthYear}
                    isPrevDisabled={isPrevDisabled}
                  />
                </div>

                {/* 3. Selected Appointment Card */}
                <div className="pt-2">
                  <SelectedAppointmentCard
                    dateFormatted={activeDateItem.fullFormatted}
                    time={selectedTime}
                    timezoneLabel={timezone.label}
                    duration="30 minutes"
                    isConfirmed={true}
                  />
                </div>
              </section>

              {/* Right Column: Time Slot Grid */}
              <section className="lg:col-span-7">
                <TimeSlotGrid
                  slots={availableSlots}
                  selectedSlotTime={selectedTime}
                  onSelectSlot={handleSelectSlot}
                  onContinue={() => goToStep(2)}
                  isLoading={isLoadingSlots}
                  error={slotsError}
                  preferredTime={preferredTime}
                  preferredSlotStatus={preferredSlotStatus}
                  preferredSlotMessage={preferredSlotMessage}
                  onSelectPreferredTime={handleSelectPreferredTime}
                />
              </section>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PARENT DETAILS ================= */}
        {step === 2 && (
          <div
            key="step-2"
            className="w-full min-h-[calc(100vh-4rem)] py-10 px-4 lg:px-8 page-enter"
          >
            <div className="max-w-[960px] mx-auto flex flex-col">
              {/* Step Progress Indicator */}
              <div>
                <Step2Progress onBackToTime={() => goToStep(1)} />
              </div>

              {/* Page Header */}
              <header className="mb-10">
                <span className="text-xs uppercase tracking-wider font-bold text-[#64748B] block mb-1.5">
                  FREE TRIAL CLASS
                </span>
                <h1 className="text-[32px] leading-[40px] font-bold text-[#0F172A] tracking-tight mb-2">
                  Almost there
                </h1>
                <p className="text-[15px] leading-[22px] text-[#475569]">
                  Enter your details to complete your free trial booking.
                </p>
              </header>

              {/* Main Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Form */}
                <div className="lg:col-span-7">
                  <ParentDetailsForm
                    parentName={parentName}
                    parentEmail={parentEmail}
                    onNameChange={setParentName}
                    onEmailChange={setParentEmail}
                    onConfirm={handleConfirmBooking}
                    onChangeTime={() => goToStep(1)}
                    isSubmitting={isSubmitting}
                    submitConflict={submitConflict}
                    errorMessage={submitError}
                  />
                </div>

                {/* Right Column: Appointment Summary */}
                <div className="lg:col-span-5">
                  <TrialClassSummaryCard
                    dateFormatted={activeDateItem.fullFormatted}
                    time={selectedTime}
                    timezoneLabel={timezone.label}
                    duration="30-minute"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: BOOKING CONFIRMED ================= */}
        {step === 3 && (
          <div
            key="step-3"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 page-enter"
          >
            <div className="flex flex-col w-full">
              <div className="w-full max-w-[820px] mx-auto py-1 sm:py-2">
                {/* Lightweight Progress Stepper */}
                <div>
                  <ConfirmationStepper
                    onGoToStep1={() => goToStep(1)}
                    onGoToStep2={() => goToStep(2)}
                  />
                </div>

                {/* Header Confirmation */}
                <div className="anim-fade-up">
                  <ConfirmationHeader />
                </div>

                {/* Appointment Card Surface */}
                <div>
                  <ConfirmedAppointmentCard
                    dateFormatted={activeDateItem.fullFormatted}
                    time={selectedTime}
                    timezoneLabel={timezone.label}
                    duration="30 minutes"
                    mentorId={confirmedBooking?.mentorId}
                  />
                </div>

                {/* Primary Action CTA & Post-Booking */}
                <div>
                  <PostBookingActions
                    meetingUrl={confirmedBooking?.classUrl}
                    onBookAnother={() => goToStep(1)}
                    startIsoInstant={confirmedBooking?.startTime}
                    parentEmail={parentEmail}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  );
}
