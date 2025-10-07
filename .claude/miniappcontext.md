# Mini App Context

> Improve user experience by instantly displaying user profile data and customizing user flows based on where your mini app was opened

When your app is opened as a mini app, `sdk.context` provides 4 data objects:

* `user`: User profile data
* `location`: Where the mini app was opened
* `client`: Host platform (e.g. the Base app or another Farcaster client) and device data
* `features`: Availability and state of features in the current client

<Panel>
  ```ts MiniAppContextTypes.ts
  export type MiniAppPlatformType = 'web' | 'mobile';
   
  export type MiniAppContext = {
    user: {
      fid: number;
      username?: string;
      displayName?: string;
      pfpUrl?: string;
    };
    location?: MiniAppLocationContext;
    client: {
      platformType?: MiniAppPlatformType;
      clientFid: number;
      added: boolean;
      safeAreaInsets?: SafeAreaInsets;
      notificationDetails?: MiniAppNotificationDetails;
    };
    features?: {
      haptics: boolean;
      cameraAndMicrophoneAccess?: boolean;
    };
  };
  ```
</Panel>

## Implementation

1. Install and import `@farcaster/miniapp-sdk`
2. Check if opened as a mini app using `sdk.isInMiniApp();`
3. If in a mini app, load the context object using `sdk.context`

In the example below we detect if the app was opened as a mini app, and if so, we return the user's username, fid, display name, and profile image.

```typescript app/profile/page.tsx
"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false); 

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if we're in a Mini App
        const miniAppStatus = await sdk.isInMiniApp();
        setIsInMiniApp(miniAppStatus);

        if (miniAppStatus) {
          // Get context and extract user info
          const context = await sdk.context;
          setUser(context.user);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, []);

  // Show message if not in Mini App
  if (!isInMiniApp) {
    return (
      <div>
        <p>Please open this app in a Farcaster or Base client to see your profile.</p>
      </div>
    );
  }

  // Show user information
  if (user) {
    return (
      <div>
        <h2>Welcome, {user.displayName || user.username}!</h2>
        <p>FID: {user.fid}</p>
        <p>Username: @{user.username}</p>
        {user.pfpUrl && (
          <img 
            src={user.pfpUrl} 
            alt="Profile" 
            width={64} 
            height={64} 
            style={{ borderRadius: '50%' }}
          />
        )}
      </div>
    );
  }

  return <div>Loading user profile...</div>;
}
```

## Schema

### User Object

Contains the user's profile information. This data shouldn't be used for authentication or sensitive actions because its passed by the application.

<Card>
  <ParamField path="fid" type="number" required>
    Unique Farcaster identifier for the user.
  </ParamField>

  <ParamField path="username" type="string">
    Handle without @ symbol.
  </ParamField>

  <ParamField path="displayName" type="string">
    User's chosen display name.
  </ParamField>

  <ParamField path="pfpUrl" type="string">
    Profile picture URL.
  </ParamField>

  <ParamField path="bio" type="string">
    User's biography text.
  </ParamField>

  <ParamField path="location" type="object">
    User's location information.
  </ParamField>

  <ParamField path="location.placeId" type="string">
    Google Places ID.
  </ParamField>

  <ParamField path="location.description" type="string">
    Human-readable location description.
  </ParamField>
</Card>

```json user.json
{
  "fid": 6841,
  "username": "deodad",
  "displayName": "Tony D'Addeo",
  "pfpUrl": "https://i.imgur.com/dMoIan7.jpg",
  "bio": "Building @warpcast and @farcaster",
  "location": {
    "placeId": "ChIJLwPMoJm1RIYRetVp1EtGm10",
    "description": "Austin, TX, USA"
  }
}
```

### Location Object

Contains information about the context from which the Mini App was launched. This helps you understand how users discovered and accessed your app.

**Location Types:**

* **`cast_embed`**: Launched from a cast where your app is embedded
* **`cast_share`**: Launched when a user shared a cast to your app
* **`notification`**: Launched from a notification triggered by your app
* **`launcher`**: Launched directly from the client app catalog
* **`channel`**: Launched from within a specific Farcaster channel
* **`open_miniapp`**: Launched from another Mini App

#### CastEmbedLocationContext

<Card>
  <ParamField path="type" type="'cast_embed'" required>
    Indicates the Mini App was launched from a cast where it is an embed.
  </ParamField>

  <ParamField path="embed" type="string" required>
    The embed URL.
  </ParamField>

  <ParamField path="cast" type="MiniAppCast" required>
    Cast information containing the embed.
  </ParamField>
</Card>

```json cast_embed.json
{
  "type": "cast_embed",
  "embed": "https://myapp.example.com",
  "cast": {
    "author": {
      "fid": 3621,
      "username": "alice",
      "displayName": "Alice",
      "pfpUrl": "https://example.com/alice.jpg"
    },
    "hash": "0xa2fbef8c8e4d00d8f84ff45f9763b8bae2c5c544",
    "timestamp": 1749160866000,
    "text": "Check out this awesome mini app!",
    "embeds": ["https://myapp.example.com"],
    "channelKey": "farcaster"
  }
}
```

#### CastShareLocationContext

<Card>
  <ParamField path="type" type="'cast_share'" required>
    Indicates the Mini App was launched when a user shared a cast to your app.
  </ParamField>

  <ParamField path="cast" type="MiniAppCast" required>
    The cast that was shared to your app.
  </ParamField>
</Card>

#### NotificationLocationContext

<Card>
  <ParamField path="type" type="'notification'" required>
    Indicates the Mini App was launched from a notification.
  </ParamField>

  <ParamField path="notification" type="object" required>
    Notification details.

    <ParamField path="notification.notificationId" type="string" required>
      Unique notification identifier.
    </ParamField>

    <ParamField path="notification.title" type="string" required>
      Notification title.
    </ParamField>

    <ParamField path="notification.body" type="string" required>
      Notification body text.
    </ParamField>
  </ParamField>
</Card>

```json notification.json
{
  "type": "notification",
  "notification": {
    "notificationId": "f7e9ebaf-92f0-43b9-a410-ad8c24f3333b",
    "title": "Yoinked!",
    "body": "horsefacts captured the flag from you."
  }
}
```

#### LauncherLocationContext

<Card>
  <ParamField path="type" type="'launcher'" required>
    Indicates the Mini App was launched directly by the client app outside of a context.
  </ParamField>
</Card>

#### ChannelLocationContext

<Card>
  <ParamField path="type" type="'channel'" required>
    Indicates the Mini App was launched from within a specific Farcaster channel.
  </ParamField>

  <ParamField path="channel" type="object" required>
    Channel details.
  </ParamField>

  <ParamField path="channel.key" type="string" required>
    Channel key identifier.
  </ParamField>

  <ParamField path="channel.name" type="string" required>
    Channel name.
  </ParamField>

  <ParamField path="channel.imageUrl" type="string">
    Channel profile image URL.
  </ParamField>
</Card>

#### OpenMiniAppLocationContext

<Card>
  <ParamField path="type" type="'open_miniapp'" required>
    Indicates the Mini App was launched from another Mini App.
  </ParamField>

  <ParamField path="referrerDomain" type="string" required>
    The domain of the Mini App that opened the current app.
  </ParamField>
</Card>

### Client Object

Contains details about the Farcaster client running your Mini App. This data should be considered untrusted.

#### ClientContext

<Card>
  <ParamField path="platformType" type="'web' | 'mobile'">
    Platform where the app is running.
  </ParamField>

  <ParamField path="clientFid" type="number" required>
    Self-reported FID of the client (e.g., 9152 for Farcaster).
  </ParamField>

  <ParamField path="added" type="boolean" required>
    Whether the user has added your Mini App to their client.
  </ParamField>

  <ParamField path="safeAreaInsets" type="object">
    Screen insets to avoid navigation elements that obscure the view.

    <Expandable title="properties">
      <ParamField path="top" type="number" required>
        Top safe area inset in pixels.
      </ParamField>

      <ParamField path="bottom" type="number" required>
        Bottom safe area inset in pixels.
      </ParamField>

      <ParamField path="left" type="number" required>
        Left safe area inset in pixels.
      </ParamField>

      <ParamField path="right" type="number" required>
        Right safe area inset in pixels.
      </ParamField>
    </Expandable>
  </ParamField>

  <ParamField path="notificationDetails" type="object">
    Notification configuration if enabled.

    <Expandable title="properties">
      <ParamField path="url" type="string" required>
        Endpoint for sending notifications.
      </ParamField>

      <ParamField path="token" type="string" required>
        Authentication token for notifications.
      </ParamField>
    </Expandable>
  </ParamField>
</Card>

```json client.json
{
  "platformType": "mobile",
  "clientFid": 9152,
  "added": true,
  "safeAreaInsets": {
    "top": 0,
    "bottom": 20,
    "left": 0,
    "right": 0
  },
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```

### Features Object

Indicates which platform features are available and their current state in the client.

<Card>
  <ParamField path="haptics" type="boolean" required>
    Whether haptic feedback is supported on the current platform.
  </ParamField>

  <ParamField path="cameraAndMicrophoneAccess" type="boolean">
    Whether camera and microphone permissions have been granted and stored for this mini app.
  </ParamField>
</Card>

```json features.json
{
  "haptics": true,
  "cameraAndMicrophoneAccess": true
}
```

<Note>For more detailed capability detection, use the `sdk.getCapabilities()` method which returns specific SDK methods supported by the host.</Note>
