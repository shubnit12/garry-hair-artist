import { CheckmarkCircleIcon } from "@sanity/icons/CheckmarkCircle";
import { CheckmarkIcon } from "@sanity/icons/Checkmark";
import { CloseCircleIcon } from "@sanity/icons/CloseCircle";
import { ErrorOutlineIcon } from "@sanity/icons/ErrorOutline";
import { Stack, Text } from "@sanity/ui";
import { useToast } from "@sanity/ui/toast";
import { useState } from "react";
import { useDocumentOperation, type DocumentActionComponent, type DocumentActionProps } from "sanity";

import { normaliseStatus, type BookingStatus } from "../lib/constants";
import { businessNowMinutes, businessToday, formatDate, formatTime, isTimeString, timeToMinutes } from "../lib/dates";

/**
 * Quick status buttons for the booking editor (they appear in the footer next
 * to the default actions). Bookings are `liveEdit`, so a patch is saved — and
 * visible on the website — immediately; there is no separate publish step.
 *
 * Status changes made here are picked up by the Sanity webhook
 * (/api/webhooks/booking-status), which emails the client when a booking is
 * cancelled, or confirmed after waiting as pending. The messages below only
 * promise an email when the webhook would actually send one.
 */

type BookingSnapshot = {
  status?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerEmail?: string;
  /** Last status the client was emailed about (written by the website). */
  notifiedStatus?: string;
};

function useBooking(props: DocumentActionProps) {
  const snapshot = (props.draft ?? props.published) as BookingSnapshot | null;
  const { patch } = useDocumentOperation(props.id, props.type);
  const toast = useToast();

  const setStatus = (status: BookingStatus, extra: Record<string, unknown> = {}) => {
    patch.execute([{ set: { status, ...extra } }]);
  };

  return {
    snapshot,
    status: snapshot ? normaliseStatus(snapshot.status) : null,
    /** False until the document has loaded (or when the user lacks permission). */
    canPatch: !patch.disabled,
    setStatus,
    toast,
  };
}

/** True when the appointment day has arrived (Surrey, BC time). */
function hasStarted(snapshot: BookingSnapshot | null): boolean {
  return Boolean(snapshot?.date && snapshot.date <= businessToday());
}

/** True when the appointment's start time has passed; the webhook emails nobody then. */
function hasPassed(snapshot: BookingSnapshot | null): boolean {
  if (!snapshot?.date) return false;
  const { date, time } = snapshot;
  const today = businessToday();
  if (date !== today) return date < today;
  return !isTimeString(time) || timeToMinutes(time) <= businessNowMinutes();
}

/**
 * Mirrors /api/webhooks/booking-status: confirming only emails clients who
 * were told their website booking is pending — never Studio-made bookings.
 */
function confirmationIsEmailed(snapshot: BookingSnapshot | null): boolean {
  return Boolean(snapshot?.customerEmail) && snapshot?.notifiedStatus === "pending" && !hasPassed(snapshot);
}

function clientName(snapshot: BookingSnapshot | null): string {
  return snapshot?.customerName?.trim() || "the client";
}

export const ConfirmBookingAction: DocumentActionComponent = (props) => {
  const { snapshot, status, canPatch, setStatus, toast } = useBooking(props);
  if (status !== "pending") return null;

  const emailed = confirmationIsEmailed(snapshot);
  return {
    label: "Confirm booking",
    icon: CheckmarkIcon,
    tone: "positive",
    disabled: !canPatch,
    title: emailed
      ? "Confirm this booking. The client is emailed a confirmation when notifications are set up."
      : "Confirm this booking. No email is sent for it, so let the client know yourself.",
    onHandle: () => {
      setStatus("confirmed");
      toast.push({
        status: "success",
        title: "Booking confirmed",
        description: emailed
          ? `If email notifications are set up, ${clientName(snapshot)} is emailed a confirmation.`
          : "No email is sent for this booking, so let the client know yourself.",
      });
    },
  };
};
ConfirmBookingAction.displayName = "ConfirmBookingAction";

export const CompleteBookingAction: DocumentActionComponent = (props) => {
  const { snapshot, status, canPatch, setStatus, toast } = useBooking(props);
  if (status !== "pending" && status !== "confirmed") return null;
  // Only offered once the appointment day has come.
  if (!hasStarted(snapshot)) return null;

  return {
    label: "Mark completed",
    icon: CheckmarkCircleIcon,
    disabled: !canPatch,
    title: "The appointment took place",
    onHandle: () => {
      setStatus("completed");
      toast.push({ status: "success", title: "Marked as completed" });
    },
  };
};
CompleteBookingAction.displayName = "CompleteBookingAction";

export const NoShowBookingAction: DocumentActionComponent = (props) => {
  const { snapshot, status, canPatch, setStatus, toast } = useBooking(props);
  if (status !== "pending" && status !== "confirmed") return null;
  if (!hasStarted(snapshot)) return null;

  return {
    label: "Mark no-show",
    icon: ErrorOutlineIcon,
    tone: "caution",
    disabled: !canPatch,
    title: "The client did not turn up (no email is sent)",
    onHandle: () => {
      setStatus("no-show");
      toast.push({ status: "info", title: "Marked as no-show" });
    },
  };
};
NoShowBookingAction.displayName = "NoShowBookingAction";

export const CancelBookingAction: DocumentActionComponent = (props) => {
  const { snapshot, status, canPatch, setStatus, toast } = useBooking(props);
  const [confirming, setConfirming] = useState(false);
  if (status !== "pending" && status !== "confirmed") return null;

  const name = clientName(snapshot);
  const when = [formatDate(snapshot?.date, "long"), snapshot?.time ? `at ${formatTime(snapshot.time)}` : null]
    .filter(Boolean)
    .join(" ");

  return {
    label: "Cancel booking",
    icon: CloseCircleIcon,
    tone: "critical",
    disabled: !canPatch,
    title: "Cancel this appointment and free up the time slot",
    onHandle: () => setConfirming(true),
    dialog: confirming && {
      type: "confirm",
      tone: "critical",
      message: (
        <Stack gap={4}>
          <Text size={2} weight="semibold">
            Cancel {name}&apos;s appointment on {when}?
          </Text>
          <Text size={1}>The time becomes available to other clients on the website straight away.</Text>
          <Text size={1} muted>
            {!snapshot?.customerEmail
              ? "There's no email address on this booking, so please let the client know yourself."
              : hasPassed(snapshot)
                ? "The appointment time has passed, so no email is sent."
                : `If email notifications (the booking-status webhook) are set up, ${name} is emailed automatically to let them know.`}
          </Text>
        </Stack>
      ),
      confirmButtonText: "Yes, cancel booking",
      cancelButtonText: "Keep booking",
      onCancel: () => setConfirming(false),
      onConfirm: () => {
        setStatus("cancelled", { cancelledAt: new Date().toISOString(), cancelledBy: "owner" });
        setConfirming(false);
        toast.push({
          status: "success",
          title: "Booking cancelled",
          description: "The time slot is free again.",
        });
      },
    },
  };
};
CancelBookingAction.displayName = "CancelBookingAction";

/** Order matters: the first available action becomes the primary button. */
export const bookingStatusActions: DocumentActionComponent[] = [
  ConfirmBookingAction,
  CompleteBookingAction,
  NoShowBookingAction,
  CancelBookingAction,
];
