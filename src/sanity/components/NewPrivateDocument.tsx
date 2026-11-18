import { AddIcon } from "@sanity/icons/Add";
import { Button, type ButtonProps, Card, Flex, Spinner, Stack, Text } from "@sanity/ui";
import { useCallback, useEffect } from "react";
import { useRouter } from "sanity/router";

import { newPrivateId, type PrivateDocumentType } from "../../lib/private-ids";

/**
 * Bookings hold client details, so they must live under a private ID (see
 * src/lib/private-ids.ts). The Studio's built-in "Create" buttons would pick
 * a public one, so they are switched off for bookings and these open the
 * editor on a fresh private ID instead. Nothing is saved until the first edit.
 */

/** Opens the editor for a new document under a fresh private ID. */
export function useCreatePrivateDocument(type: PrivateDocumentType) {
  const { navigateIntent } = useRouter();
  return useCallback(
    (options?: { replace?: boolean }) => navigateIntent("create", { type, id: newPrivateId(type) }, options),
    [navigateIntent, type],
  );
}

/** Toolbar button for the Calendar. */
export function NewBookingButton(props: Pick<ButtonProps, "fontSize" | "padding">) {
  const create = useCreatePrivateDocument("booking");
  return <Button icon={AddIcon} text="New booking" tone="primary" onClick={() => create()} {...props} />;
}

/**
 * Structure pane behind Bookings → "New booking": opens a fresh booking as
 * soon as it is shown (replacing itself in history), with a button as a
 * fallback in case navigation is blocked.
 */
export function NewBookingPane() {
  const create = useCreatePrivateDocument("booking");

  useEffect(() => {
    // Wait a tick: the structure tool records the open panes in its own effect,
    // which runs after this one. Resolving the intent straight away would match
    // the panes from before this one opened and drop the new booking.
    // The cleanup also stops React StrictMode from creating two.
    const timer = setTimeout(() => create({ replace: true }), 0);
    return () => clearTimeout(timer);
  }, [create]);

  return (
    <Card padding={4} height="fill">
      <Flex align="center" justify="center" height="fill">
        <Stack gap={4} style={{ maxWidth: 320, textAlign: "center" }}>
          <Flex justify="center">
            <Spinner muted />
          </Flex>
          <Text size={1} muted>
            Opening a new booking…
          </Text>
          <Flex justify="center">
            <Button icon={AddIcon} text="New booking" mode="ghost" onClick={() => create()} />
          </Flex>
        </Stack>
      </Flex>
    </Card>
  );
}
