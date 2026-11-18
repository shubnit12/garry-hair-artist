import { useToast } from "@sanity/ui/toast";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import {
  getPublishedId,
  PatchEvent,
  useClient,
  useDocumentOperation,
  useFormValue,
  type FormPatch,
  type ReferenceInputProps,
} from "sanity";

import { STUDIO_API_VERSION } from "../lib/constants";
import {
  pickService,
  selectedReferenceId,
  serviceChangePatches,
  serviceIds,
  SERVICES_BY_ID_QUERY,
  type BookingPatch,
  type ServiceSnapshot,
} from "../lib/serviceSync";

const CLIENT_OPTIONS = { apiVersion: STUDIO_API_VERSION };

/** A service Garry just picked, with the booking's state right before. */
type ServicePick = { nextId: string; previousId?: string; duration: unknown };

/**
 * The booking's Service picker (the standard reference input). When Garry
 * picks a different service, the booking's saved service name, slug and —
 * unless he entered his own — duration are updated to match, so the website
 * keeps blocking the right length of time even if the service is later
 * deleted or unpublished.
 */
export function BookingServiceInput(props: ReferenceInputProps) {
  const { onChange, value } = props;
  const client = useClient(CLIENT_OPTIONS);
  const toast = useToast();
  const documentId = getPublishedId(String(useFormValue(["_id"]) ?? ""));
  const duration = useFormValue(["durationMinutes"]);
  const { patch } = useDocumentOperation(documentId, "booking");
  const [pick, setPick] = useState<ServicePick | null>(null);
  const previousId = value?._ref;

  const handleChange = useCallback(
    (input: FormPatch | FormPatch[] | PatchEvent) => {
      onChange(input);
      const nextId = selectedReferenceId(PatchEvent.from(input).patches);
      if (nextId && nextId !== previousId) setPick({ nextId, previousId, duration });
    },
    [duration, onChange, previousId],
  );

  // Booking edits are liveEdit, so this saves straight away like the form does.
  const applyPatches = useEffectEvent((patches: BookingPatch[]) => {
    if (patches.length && !patch.disabled) patch.execute(patches);
  });

  const reportFailure = useEffectEvent(() => {
    toast.push({
      status: "warning",
      title: "Couldn't copy the service's duration",
      description: "Please check the Duration field below.",
    });
  });

  useEffect(() => {
    if (!pick) return;
    // A newer pick (or closing the booking) supersedes this one.
    let current = true;
    client
      .fetch<ServiceSnapshot[]>(
        SERVICES_BY_ID_QUERY,
        { ids: serviceIds(pick.nextId, pick.previousId) },
        { perspective: "raw", tag: "studio.booking-service" },
      )
      .then((docs) => {
        // Not found: e.g. a service created from this field and not saved yet.
        const next = pickService(docs, pick.nextId);
        if (!current || !next) return;
        applyPatches(serviceChangePatches(pick.duration, pickService(docs, pick.previousId), next));
      })
      .catch(() => {
        if (current) reportFailure();
      });
    return () => {
      current = false;
    };
  }, [client, pick]);

  return props.renderDefault({ ...props, onChange: handleChange });
}
