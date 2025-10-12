# Notifications

> Regularly re-engage users by sending in-app notifications through the Base app

## Overview

When a user enables notifications for your Mini App, the Base App generates a unique notification `token` and `url` which is sent to your server via webhook.

This `token` grants your app permission to send in-app notifications to that specific user.

To send a notification, make a `POST` request to the `url` with the user's notification `token` and your content.

You will receive webhook events when users enable or disable notifications for your app. When disabled, the notification token becomes invalid and should no longer be used.

<Panel>
    <img src="https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=52a08c64b48c40d8118d2b32ee4ba3c9" alt="notification-image-iphone" data-og-width="1163" width="1163" data-og-height="1033" height="1033" data-path="images/minikit/notifications-sample.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?w=280&fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=ae7423c118e5bfd030cdb408071b4b1e 280w, https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?w=560&fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=3b44caa21f6d2cb86f73656dd692b605 560w, https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?w=840&fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=3e85b240831799970c2d8ae0787caa85 840w, https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?w=1100&fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=482f0c7cb3b1db12148758847866675a 1100w, https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?w=1650&fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=cbc409fe7a7e7f7bc0f66e812c831fa6 1650w, https://mintcdn.com/base-a060aa97/uEmvHrTbmfeJo9n_/images/minikit/notifications-sample.png?w=2500&fit=max&auto=format&n=uEmvHrTbmfeJo9n_&q=85&s=69be36e300385ba91f13d8b9ca15270f 2500w" />
</Panel>

## Implementation

<Steps>
  <Step title="Create a webhook server">
    Create a webhook server to handle webhook events.

    ```ts app/api/webhook/route.ts expandable highlight={20-50} theme={null}
    export async function POST(request: NextRequest) {
      const requestJson = await request.json();

      // Parse and verify the webhook event
      let data;
      try {
        data = await validateWebhookEventSignature(requestJson);
        // Events are signed by the app key of a user with a JSON Farcaster Signature.
      } catch (e: unknown) {
        // Handle verification errors (invalid data, invalid app key, etc.)
        // Return appropriate error responses with status codes 400, 401, or 500
      }

      const fid = data.fid;
      const event = data.event;

      // Handle different event types
      switch (event.event) {
        case "miniapp_added":
          // Save notification details and send welcome notification
          if (event.notificationDetails) {
            await setUserNotificationDetails(fid, event.notificationDetails);
            await sendMiniAppNotification({
              fid,
              title: "Welcome to Base Mini Apps",
              body: "Mini app is now added to your client",
            });
          }
          break;

        case "miniapp_removed":
          // Delete notification details
          await deleteUserNotificationDetails(fid);
          break;

        case "notifications_enabled":
          // Save new notification details and send confirmation
          await setUserNotificationDetails(fid, event.notificationDetails);
          await sendMiniAppNotification({
            fid,
            title: "Ding ding ding",
            body: "Notifications are now enabled",
          });
          break;

        case "notifications_disabled":
          // Delete notification details
          await deleteUserNotificationDetails(fid);
          break;
      }

      return Response.json({ success: true });
    }
    ```
  </Step>

  <Step title="Add the Webhook URL to your manifest">
    Add the Webhook URL to your manifest file

    ```json app/.well-known/farcaster.json highlight={16} theme={null}
    {
      "accountAssociation": {
        "header": "eyJmaWQiOjU0NDgsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg2MWQwMEFENzYwNjhGOEQ0NzQwYzM1OEM4QzAzYUFFYjUxMGI1OTBEIn0",
        "payload": "eyJkb21haW4iOiJleGFtcGxlLmNvbSJ9",
        "signature": "MHg3NmRkOWVlMjE4OGEyMjliNzExZjUzOTkxYTc1NmEzMGZjNTA3NmE5OTU5OWJmOWFmYjYyMzAyZWQxMWQ2MWFmNTExYzlhYWVjNjQ3OWMzODcyMTI5MzA2YmJhYjdhMTE0MmRhMjA4MmNjNTM5MTJiY2MyMDRhMWFjZTY2NjE5OTFj"
      },
      "miniapp": {
        "version": "1",
        "name": "Example App",
        "iconUrl": "https://example.com/icon.png",
        "homeUrl": "https://example.com",
        "imageUrl": "https://example.com/image.png",
        "buttonTitle": "Check this out",
        "splashImageUrl": "https://example.com/splash.png",
        "splashBackgroundColor": "#eeccff",
        "webhookUrl": "https://example.com/api/webhook"
      }
    }

    ```
  </Step>

  <Step title="Prompt users to add your Mini App">
    Use the `addMiniApp()` hook to prompt users to add your Mini App

    ```tsx page.tsx highlight={11, 25-27} theme={null}
    "use client";

    import { sdk } from "@farcaster/miniapp-sdk";
    import { useCallback, useState } from "react";

    export default function AddMiniApp() {
      const [result, setResult] = useState("");

      const handleAddMiniApp = useCallback(async () => {
        try {
          const response = await sdk.actions.addMiniApp();
          
          if (response.notificationDetails) {
            setResult("Mini App added with notifications enabled!");
          } else {
            setResult("Mini App added without notifications");
          }
        } catch (error) {
          setResult(`Error: ${error}`);
        }
      }, []);

      return (
        <div>
          <button onClick={handleAddMiniApp}>
            Add Mini App
          </button>
          {result && <p>{result}</p>}
        </div>
      );
    }
    ```
  </Step>

  <Step title="Save the token and URL from the webhook event">
    The `token` and `url` need to be securely saved to a database so they can be looked up when you want to send a notification to a particular user.

    ```json miniapp_added_payload.json highlight={4-5} theme={null}
    {
      "event": "notifications_enabled",
      "notificationDetails": {
        "url": "https://api.farcaster.xyz/v1/frame-notifications",
        "token": "a05059ef2415c67b08ecceb539201cbc6"
      }
    }
    ```
  </Step>

  <Step title="Send notifications">
    Send notifications by sending a `POST` request to the `url` associated with the user's `token`

    ```ts sendNotification.ts highlight={15-28} theme={null}
    export async function sendMiniAppNotification({
      fid,
      title,
      body,
    }: {
      fid: number;
      title: string;
      body: string;
    }): Promise<sendMiniAppNotificationResult> {
      const notificationDetails = await getUserNotificationDetails(fid);
      if (!notificationDetails) {
        return { state: "no_token" };
      }

      const response = await fetch(notificationDetails.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: crypto.randomUUID(),
          title,
          body,
          targetUrl: appUrl,
          tokens: [notificationDetails.token],
        } satisfies SendNotificationRequest),
      });

      const responseJson = await response.json();

      if (response.status === 200) {
        const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
        if (responseBody.success === false) {
          // Malformed response
          return { state: "error", error: responseBody.error.errors };
        }

        if (responseBody.data.result.rateLimitedTokens.length) {
          // Rate limited
          return { state: "rate_limit" };
        }

        return { state: "success" };
      } else {
        // Error response
        return { state: "error", error: responseJson };
      }
    }
    ```
  </Step>
</Steps>

## Schema

### Send Notification Request Schema

<Card>
  <ParamField path="notificationId" type="string" required>
    Identifier that is combined with the FID to form an idempotency key. When the user opens the Mini App from the notification this ID will be included in the context object. **Maximum length of 128 characters.**
  </ParamField>

  <ParamField path="title" type="string" required>
    Title of the notification. **Max length 32 characters.**
  </ParamField>

  <ParamField path="body" type="string" required>
    Body of the notification. **Max length 128 characters.**
  </ParamField>

  <ParamField path="targetUrl" type="string" required>
    URL to open when the user clicks the notification. **Max length 1024 characters.**
    <Note>Must be on the same domain as the Mini App.</Note>
  </ParamField>

  <ParamField path="tokens" type="string[]" required>
    Array of notification tokens to send to. **Max 100 tokens.**
  </ParamField>
</Card>

### Send Notification Response Schema

<Card>
  <ParamField path="successfulTokens" type="string[]" required>
    Tokens for which the notification succeeded.
  </ParamField>

  <ParamField path="invalidTokens" type="string[]" required>
    Tokens which are no longer valid and should never be used again. This could happen if the user disabled notifications but for some reason the Mini App server has no record of it.
  </ParamField>

  <ParamField path="rateLimitedTokens" type="string[]" required>
    Tokens for which the rate limit was exceeded. The Mini App server can try later.
  </ParamField>
</Card>

## Events

Mini App events use the following object structure:

* **`type`**: notification event type
* **`notificationDetails.url`**: URL that the app should call to send a notification.
* **`notificationDetails.token`**: A secret token generated by the Base App and shared with the Notification Server. A token is unique for each (Farcaster Client, Mini App, user Fid) tuple.

<Note>If users are not seeing the option to enable notifications when they call `addMiniApp()`, verify that your manifest file contains a valid `webhookUrl`.</Note>

### `miniapp_added`

Sent when the user adds the Mini App to their Farcaster client (whether or not it was triggered by an `addMiniApp()` prompt).

```json miniapp_added_payload.json theme={null}
{
  "event": "miniapp_added",
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```

### `miniapp_removed`

Sent when a user removes the Mini App, which means that any notification tokens for that FID and client app (based on signer requester) should be considered invalid:

```json miniapp_removed_payload theme={null}
{
  "event": "miniapp_removed"
}
```

### `notifications_enabled`

Sent when a user enables notifications (e.g. after disabling them). The payload includes a new `token` and `url`:

```json notifications_enabled_payload theme={null}
{
  "event": "notifications_enabled",
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```

### `notifications_disabled`

Sent when a user disables notifications from, e.g., a settings panel in the client app. Any notification tokens for that FID and client app (based on signer requester) should be considered invalid:

```json notifications_disabled_json theme={null}
{
  "event": "notifications_disabled"
}
```
