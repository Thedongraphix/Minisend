# Quickstart

> Learn how to build mini apps on Base with MiniKit - from setup to deployment and advanced features

This guide shows you how to get started with MiniKit, the easiest way to build mini apps on Base! It can also be used to update an existing standalone app to a mini app. We'll start by setting up the template project with the CLI tool and then explore both built-in and additional features of MiniKit.

## Prerequisites

Before you begin developing with MiniKit, you'll need:

1. **Farcaster Account**: Create an account on [Farcaster](https://farcaster.xyz/) to test and deploy your Mini Apps.

2. **Coinbase Developer Platform Account** (Optional): Sign up for a [Coinbase Developer Platform](https://www.coinbase.com/developer-platform) account if you need CDP API key for additional functionalities.

## What is a Mini App?

A mini app is a lightweight web app that runs directly inside [Farcaster](https://docs.farcaster.xyz/developers/frames/v2/), without needing to open a browser or download anything. Built using familiar tools like Next.js and minikit, mini apps behave just like normal apps — but launch instantly from posts, making them feel native to the Farcaster experience.

## Initial Setup

<Steps>
  <Step title="Create a new MiniKit project using the CLI">
    ```bash
    npx create-onchain --mini
    ```
  </Step>

  <Step title="Enter your CDP Client API key when prompted">
    You can get a CDP API key by going to the [CDP Portal](https://www.coinbase.com/developer-platform) and navigating API Keys → Client API Key.
  </Step>

  <Step title="Skip Mini App Account Manifest Setup">
    You will be asked if you'd like to set up your manifest. You can skip the manifest setup step as we'll handle that separately once we know our project's URL.
  </Step>

  <Step title="Navigate to your project directory and install dependencies">
    ```bash Terminal
    cd your-project-name
    npm install
    npm run dev
    ```

    <Tip>
      These docs are LLM-friendly—reference [llms.txt](https://docs.base.org/base-app/build-with-minikit/llms.txt) in your code editor to streamline builds and prompt smarter.
    </Tip>
  </Step>
</Steps>

## Testing Your Mini App

To test your Mini App in Farcaster, you'll need a live URL.

We recommend using [Vercel](https://vercel.com) to deploy your MiniKit app, as it integrates seamlessly with the upstash/redis backend required for stateful Mini Apps, webhooks, and notifications.

Alternatively, you can use ngrok to tunnel your localhost to a live url.

<AccordionGroup>
  <Accordion title="Using ngrok">
    <Warning>
      To successfully test your app, you'll need the paid version of ngrok. The free version has an approval screen which can break the frame manifest. Also the url for the free version will change every time requiring you to update the manifest each time you start a new ngrok tunnel.
    </Warning>

    1. Start your development server:

    ```bash Terminal
    npm run dev
    ```

    2. Install and start ngrok to create a tunnel to your local server:

    ```bash Terminal
    # Install ngrok if you haven't already
    npm install -g ngrok

    # Create a tunnel to your local server (assuming it's running on port 3000)
    ngrok http 3000
    ```

    3. Copy the HTTPS URL provided by ngrok (e.g. `https://your-tunnel.ngrok.io`)

    4. Visit the [Farcaster Manifest Tool](https://farcaster.xyz/~/developers/mini-apps/manifest)

    5. Paste your ngrok URL into "Domain" and tap Submit
  </Accordion>
</AccordionGroup>

### Deploying to Vercel

<Steps>
  <Step title="Install Vercel CLI">
    ```bash
    npm install -g vercel
    ```
  </Step>

  <Step title="Deploy with the command">
    ```bash
    vercel
    ```
  </Step>

  <Step title="Set environment variables in your Vercel project settings">
    You can use `vercel env add` to set these up via CLI:

    * NEXT\_PUBLIC\_CDP\_CLIENT\_API\_KEY (from [CDP Portal](https://www.coinbase.com/developer-platform))
    * NEXT\_PUBLIC\_URL (deployed app URL)
    * NEXT\_PUBLIC\_IMAGE\_URL (optional)
    * NEXT\_PUBLIC\_SPLASH\_IMAGE\_URL (optional)
    * NEXT\_PUBLIC\_SPLASH\_BACKGROUND\_COLORs
  </Step>
</Steps>

You can now test your mini app:

1. Copy your deployed vercel URL
2. Visit the [Farcaster Manifest Tool](https://farcaster.xyz/~/developers/mini-apps/manifest)
3. Paste URL into "Domain"
4. Tap Submit

## Exploring Built-in Features

The template comes with several pre-implemented features. Let's explore where they are and how they work.

### MiniKitProvider

The `MiniKitProvider` is set up in your `providers.tsx` file. It wraps your application to handle initialization, events, and automatically applies client safeAreaInsets to ensure your app doesn't overlap parent application elements.

```tsx app/providers.tsx
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';

export function Providers(props: { children: ReactNode }) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
          theme: 'snake',
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      {props.children}
    </MiniKitProvider>
  );
}
```

The MiniKitProvider also sets up your wagmi and react-query providers automatically, eliminating that initial setup work.

### useMiniKit

The `useMiniKit` hook is implemented in your main page component (`app/page.tsx`). It handles initialization of the frame and provides access to the SDK context.

```tsx app/page.tsx
const { setFrameReady, isFrameReady, context } = useMiniKit();

// The setFrameReady() function is called when your mini-app is ready to be shown
useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);
```

### Creating the Manifest

The Frame Manifest is required in order for users to save the frame to their account. This means its also required to send notifications to the user. We initially skipped this step when setting up the app. Now that we know our vercel url, we can configure our manifest.

To set up the manifest, run the following in your Terminal

```bash Terminal
npx create-onchain --manifest
```

Enter `y` to proceed with the setup and your browser will open to the following page:

<Frame>
  <img alt="Manifest Setup" src="https://mintlify.s3.us-west-1.amazonaws.com/base-a060aa97/images/minikit/manifest-setup.png" height="364" />
</Frame>

<Warning>
  The wallet that you connect must be your Farcaster custody wallet. You can import this wallet to your preferred wallet using the recovery phrase. You can find your recovery phrase in the Farcaster app under Settings → Advanced → Farcaster recovery phrase.
</Warning>

Once connected, add the vercel url and sign the manifest. This will automatically update your .env variables locally, but we'll need to update Vercel's .env variables.

Create the following new .env variables in your vercel instance and paste the value you see in your local.env file:

<ParamField header="FARCASTER_HEADER" type="string" required>
  Base64 encoded header from manifest generation
</ParamField>

<ParamField header="FARCASTER_PAYLOAD" type="string" required>
  Base64 encoded payload from manifest generation
</ParamField>

<ParamField header="FARCASTER_SIGNATURE" type="string" required>
  Signature from manifest generation
</ParamField>

Now that the manifest is correctly set up, the Save Frame button in the template app should work. We'll explore that below.

<Warning>
  While testing your Mini App please add noIndex:true to your manifest  - this is so the app is not indexed while in developement.
</Warning>

### useAddFrame

The `useAddFrame` hook is used to add your mini app to the user's list of mini apps. It's implemented in your main page component and displays a button in the top right allowing the user to add the mini app to their list.

When a user adds the mini app, it returns a url and token, which is used for sending the user notifications. For this walkthrough we'll simply console.log those results to use them later when setting up notifications.

```tsx app/page.tsx
const addFrame = useAddFrame()

// Usage in a button click handler
const handleAddFrame = async () => {
  const result = await addFrame()
  if (result) {
    console.log('Frame added:', result.url, result.token)
  }
}
```

<Warning>
  In production, you'll want to save the url and token associated with each user in a persistent database so that you can send them notifications over time.
</Warning>

### useOpenUrl

The `useOpenUrl` hook is used to open external URLs from within the frame. In the template, its used in the footer button which links to the MiniKit page.

```tsx app/page.tsx
const openUrl = useOpenUrl()

// Usage in a button click handler
<button onClick={() => openUrl('https://example.com')}>
  Visit Website
</button>

// Then in the return function
<footer className="absolute bottom-4 flex items-center w-screen max-w-[520px] justify-center">
  <button
    type="button"
    className="mt-4 ml-4 px-2 py-1 flex justify-start rounded-2xl font-semibold opacity-40 border border-black text-xs"
    onClick={() => openUrl('https://base.org/builders/minikit')}
    >
    BUILT ON BASE WITH MINIKIT
  </button>
</footer>
```

Now that we've reviewed the MiniKit template and the functionality already implemented, lets add some additional MiniKit features.

## Additional MiniKit Features

Now, let's implement additional hooks provided by the MiniKit library. We'll add these features one by one.

### useClose

First, let's add the ability to close the frame from within the interface:

```tsx app/page.tsx
// Add useClose to the import list
import { useMinikit, useAddFrame, useOpenUrl, useClose } from '@coinbase/onchainkit/minikit'

// Add the hook
const close = useClose()

// Add the button in the header right after the `saveFrameButton`
<div className="pr-1 justify-end">
  {saveFrameButton}
  <button
    type="button"
    className="cursor-pointer bg-transparent font-semibold text-sm pl-2"
    onClick={close}
    >
    CLOSE
  </button>
</div>
```

<Check>
  If you reload the frame in the Farcaster dev tools preview, you'll now see the close button in the top right.
</Check>

### usePrimaryButton

The Primary Button is a button that always exists at the bottom of the frame. Its good for managing global state which is relevant throughout your mini app.

For the template example, we'll use the Primary Button to Pause and Restart the game. The game state is managed within the `snake.tsx` component, and we can easily add the `usePrimaryButton` hook there since the MiniKit hooks are available throughout the app.

```tsx app/components/snake.tsx
// add an import for usePrimaryButton
import {usePrimaryButton } from '@coinbase/onchainkit/minikit'

// game state already exists, so we'll leverage that below.
usePrimaryButton(
  {text: gameState == GameState.RUNNING ? 'PAUSE GAME' : 'START GAME'},
  () => {
    setGameState(gameState == GameState.RUNNING ? GameState.PAUSED : GameState.RUNNING);
  }
)
```

<Tip>
  You'll notice that adding the Primary button takes up space at the bottom of the frame, which causes the "BUILT ON BASE WITH MINIKIT" button to move upwards and overlap with the controls.
  We can quickly fix that by changing the text to "BUILT WITH MINIKIT" and removing the `ml-4` style in the `className` of the `<button>`
</Tip>

### useViewProfile

Now, let's add profile viewing capability. The useViewProfile hook allows you to define what profile to use by defining the user's FID, which is great for social applications. If you don't define an FID, it defaults to the client FID.

```tsx app/page.tsx
import { useViewProfile } from '@coinbase/onchainkit/minikit'

// Add the hook
const viewProfile = useViewProfile()

// Add the handler function
const handleViewProfile = () => {
  viewProfile()
}

// Add the button in your UI in the header after the close button
<button
  type="button"
  onClick={handleViewProfile}
  className="cursor-pointer bg-transparent font-semibold text-sm pl-2"
>
  PROFILE
</button>
```

### useNotification

One of the major benefits of mini apps is that you can send notifications to your users through their social app.

Recall the token and url we saved in the [useAddFrame section](#useaddframe)? We'll use those now to send a user a notification. In this guide, we'll simply send a test notification unrelated to the game activity.

```tsx app/page.tsx
//add useNotification to the import list
import {..., useNotification } from '@coinbase/onchainkit/minikit'

// Add the hook
const sendNotification = useNotification()

// Add the handler function
const handleSendNotification = async () => {
  try {
    await sendNotification({
      title: 'New High Score! 🎉',
      body: 'Congratulations on achieving a new high score!'
    })
    setTimeout(() => setNotificationSent(false), 30000)
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

// Add the button in your UI
{context?.client.added && (
  <button
    type="button"
    onClick={handleSendNotification}
    className="cursor-pointer bg-transparent font-semibold text-sm disabled:opacity-50"
  >
    SEND NOTIFICATION
  </button>
)}
```

<Info>
  Notice that we first check if the user has added the frame to their list of mini apps before displaying the button. This is using the `context` object provided by `useMiniKit()`. If you don't see the button to send the notification, its likely because mini app hasn't been saved.
</Info>

## Conclusion

Congratulations, you've created your first mini app, set up the manifest, added key MiniKit hooks, and sent your users a notification! We're excited to see what you build with MiniKit!

<CardGroup cols={2}>
  <Card title="Explore MiniKit Overview" icon="book-open" href="/base-app/build-with-minikit/overview">
    Learn more about MiniKit features and capabilities
  </Card>

  <Card title="Social Patterns Guide" icon="users" href="/base-app/build-with-minikit/thinking-social">
    Design patterns for social mini apps
  </Card>
</CardGroup>
# Quickstart

> Learn how to build mini apps on Base with MiniKit - from setup to deployment and advanced features

This guide shows you how to get started with MiniKit, the easiest way to build mini apps on Base! It can also be used to update an existing standalone app to a mini app. We'll start by setting up the template project with the CLI tool and then explore both built-in and additional features of MiniKit.

## Prerequisites

Before you begin developing with MiniKit, you'll need:

1. **Farcaster Account**: Create an account on [Farcaster](https://farcaster.xyz/) to test and deploy your Mini Apps.

2. **Coinbase Developer Platform Account** (Optional): Sign up for a [Coinbase Developer Platform](https://www.coinbase.com/developer-platform) account if you need CDP API key for additional functionalities.

## What is a Mini App?

A mini app is a lightweight web app that runs directly inside [Farcaster](https://docs.farcaster.xyz/developers/frames/v2/), without needing to open a browser or download anything. Built using familiar tools like Next.js and minikit, mini apps behave just like normal apps — but launch instantly from posts, making them feel native to the Farcaster experience.

## Initial Setup

<Steps>
  <Step title="Create a new MiniKit project using the CLI">
    ```bash
    npx create-onchain --mini
    ```
  </Step>

  <Step title="Enter your CDP Client API key when prompted">
    You can get a CDP API key by going to the [CDP Portal](https://www.coinbase.com/developer-platform) and navigating API Keys → Client API Key.
  </Step>

  <Step title="Skip Mini App Account Manifest Setup">
    You will be asked if you'd like to set up your manifest. You can skip the manifest setup step as we'll handle that separately once we know our project's URL.
  </Step>

  <Step title="Navigate to your project directory and install dependencies">
    ```bash Terminal
    cd your-project-name
    npm install
    npm run dev
    ```

    <Tip>
      These docs are LLM-friendly—reference [llms.txt](https://docs.base.org/base-app/build-with-minikit/llms.txt) in your code editor to streamline builds and prompt smarter.
    </Tip>
  </Step>
</Steps>

## Testing Your Mini App

To test your Mini App in Farcaster, you'll need a live URL.

We recommend using [Vercel](https://vercel.com) to deploy your MiniKit app, as it integrates seamlessly with the upstash/redis backend required for stateful Mini Apps, webhooks, and notifications.

Alternatively, you can use ngrok to tunnel your localhost to a live url.

<AccordionGroup>
  <Accordion title="Using ngrok">
    <Warning>
      To successfully test your app, you'll need the paid version of ngrok. The free version has an approval screen which can break the frame manifest. Also the url for the free version will change every time requiring you to update the manifest each time you start a new ngrok tunnel.
    </Warning>

    1. Start your development server:

    ```bash Terminal
    npm run dev
    ```

    2. Install and start ngrok to create a tunnel to your local server:

    ```bash Terminal
    # Install ngrok if you haven't already
    npm install -g ngrok

    # Create a tunnel to your local server (assuming it's running on port 3000)
    ngrok http 3000
    ```

    3. Copy the HTTPS URL provided by ngrok (e.g. `https://your-tunnel.ngrok.io`)

    4. Visit the [Farcaster Manifest Tool](https://farcaster.xyz/~/developers/mini-apps/manifest)

    5. Paste your ngrok URL into "Domain" and tap Submit
  </Accordion>
</AccordionGroup>

### Deploying to Vercel

<Steps>
  <Step title="Install Vercel CLI">
    ```bash
    npm install -g vercel
    ```
  </Step>

  <Step title="Deploy with the command">
    ```bash
    vercel
    ```
  </Step>

  <Step title="Set environment variables in your Vercel project settings">
    You can use `vercel env add` to set these up via CLI:

    * NEXT\_PUBLIC\_CDP\_CLIENT\_API\_KEY (from [CDP Portal](https://www.coinbase.com/developer-platform))
    * NEXT\_PUBLIC\_URL (deployed app URL)
    * NEXT\_PUBLIC\_IMAGE\_URL (optional)
    * NEXT\_PUBLIC\_SPLASH\_IMAGE\_URL (optional)
    * NEXT\_PUBLIC\_SPLASH\_BACKGROUND\_COLORs
  </Step>
</Steps>

You can now test your mini app:

1. Copy your deployed vercel URL
2. Visit the [Farcaster Manifest Tool](https://farcaster.xyz/~/developers/mini-apps/manifest)
3. Paste URL into "Domain"
4. Tap Submit

## Exploring Built-in Features

The template comes with several pre-implemented features. Let's explore where they are and how they work.

### MiniKitProvider

The `MiniKitProvider` is set up in your `providers.tsx` file. It wraps your application to handle initialization, events, and automatically applies client safeAreaInsets to ensure your app doesn't overlap parent application elements.

```tsx app/providers.tsx
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';

export function Providers(props: { children: ReactNode }) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
          theme: 'snake',
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      {props.children}
    </MiniKitProvider>
  );
}
```

The MiniKitProvider also sets up your wagmi and react-query providers automatically, eliminating that initial setup work.

### useMiniKit

The `useMiniKit` hook is implemented in your main page component (`app/page.tsx`). It handles initialization of the frame and provides access to the SDK context.

```tsx app/page.tsx
const { setFrameReady, isFrameReady, context } = useMiniKit();

// The setFrameReady() function is called when your mini-app is ready to be shown
useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);
```

### Creating the Manifest

The Frame Manifest is required in order for users to save the frame to their account. This means its also required to send notifications to the user. We initially skipped this step when setting up the app. Now that we know our vercel url, we can configure our manifest.

To set up the manifest, run the following in your Terminal

```bash Terminal
npx create-onchain --manifest
```

Enter `y` to proceed with the setup and your browser will open to the following page:

<Frame>
  <img alt="Manifest Setup" src="https://mintlify.s3.us-west-1.amazonaws.com/base-a060aa97/images/minikit/manifest-setup.png" height="364" />
</Frame>

<Warning>
  The wallet that you connect must be your Farcaster custody wallet. You can import this wallet to your preferred wallet using the recovery phrase. You can find your recovery phrase in the Farcaster app under Settings → Advanced → Farcaster recovery phrase.
</Warning>

Once connected, add the vercel url and sign the manifest. This will automatically update your .env variables locally, but we'll need to update Vercel's .env variables.

Create the following new .env variables in your vercel instance and paste the value you see in your local.env file:

<ParamField header="FARCASTER_HEADER" type="string" required>
  Base64 encoded header from manifest generation
</ParamField>

<ParamField header="FARCASTER_PAYLOAD" type="string" required>
  Base64 encoded payload from manifest generation
</ParamField>

<ParamField header="FARCASTER_SIGNATURE" type="string" required>
  Signature from manifest generation
</ParamField>

Now that the manifest is correctly set up, the Save Frame button in the template app should work. We'll explore that below.

<Warning>
  While testing your Mini App please add noIndex:true to your manifest  - this is so the app is not indexed while in developement.
</Warning>

### useAddFrame

The `useAddFrame` hook is used to add your mini app to the user's list of mini apps. It's implemented in your main page component and displays a button in the top right allowing the user to add the mini app to their list.

When a user adds the mini app, it returns a url and token, which is used for sending the user notifications. For this walkthrough we'll simply console.log those results to use them later when setting up notifications.

```tsx app/page.tsx
const addFrame = useAddFrame()

// Usage in a button click handler
const handleAddFrame = async () => {
  const result = await addFrame()
  if (result) {
    console.log('Frame added:', result.url, result.token)
  }
}
```

<Warning>
  In production, you'll want to save the url and token associated with each user in a persistent database so that you can send them notifications over time.
</Warning>

### useOpenUrl

The `useOpenUrl` hook is used to open external URLs from within the frame. In the template, its used in the footer button which links to the MiniKit page.

```tsx app/page.tsx
const openUrl = useOpenUrl()

// Usage in a button click handler
<button onClick={() => openUrl('https://example.com')}>
  Visit Website
</button>

// Then in the return function
<footer className="absolute bottom-4 flex items-center w-screen max-w-[520px] justify-center">
  <button
    type="button"
    className="mt-4 ml-4 px-2 py-1 flex justify-start rounded-2xl font-semibold opacity-40 border border-black text-xs"
    onClick={() => openUrl('https://base.org/builders/minikit')}
    >
    BUILT ON BASE WITH MINIKIT
  </button>
</footer>
```

Now that we've reviewed the MiniKit template and the functionality already implemented, lets add some additional MiniKit features.

## Additional MiniKit Features

Now, let's implement additional hooks provided by the MiniKit library. We'll add these features one by one.

### useClose

First, let's add the ability to close the frame from within the interface:

```tsx app/page.tsx
// Add useClose to the import list
import { useMinikit, useAddFrame, useOpenUrl, useClose } from '@coinbase/onchainkit/minikit'

// Add the hook
const close = useClose()

// Add the button in the header right after the `saveFrameButton`
<div className="pr-1 justify-end">
  {saveFrameButton}
  <button
    type="button"
    className="cursor-pointer bg-transparent font-semibold text-sm pl-2"
    onClick={close}
    >
    CLOSE
  </button>
</div>
```

<Check>
  If you reload the frame in the Farcaster dev tools preview, you'll now see the close button in the top right.
</Check>

### usePrimaryButton

The Primary Button is a button that always exists at the bottom of the frame. Its good for managing global state which is relevant throughout your mini app.

For the template example, we'll use the Primary Button to Pause and Restart the game. The game state is managed within the `snake.tsx` component, and we can easily add the `usePrimaryButton` hook there since the MiniKit hooks are available throughout the app.

```tsx app/components/snake.tsx
// add an import for usePrimaryButton
import {usePrimaryButton } from '@coinbase/onchainkit/minikit'

// game state already exists, so we'll leverage that below.
usePrimaryButton(
  {text: gameState == GameState.RUNNING ? 'PAUSE GAME' : 'START GAME'},
  () => {
    setGameState(gameState == GameState.RUNNING ? GameState.PAUSED : GameState.RUNNING);
  }
)
```

<Tip>
  You'll notice that adding the Primary button takes up space at the bottom of the frame, which causes the "BUILT ON BASE WITH MINIKIT" button to move upwards and overlap with the controls.
  We can quickly fix that by changing the text to "BUILT WITH MINIKIT" and removing the `ml-4` style in the `className` of the `<button>`
</Tip>

### useViewProfile

Now, let's add profile viewing capability. The useViewProfile hook allows you to define what profile to use by defining the user's FID, which is great for social applications. If you don't define an FID, it defaults to the client FID.

```tsx app/page.tsx
import { useViewProfile } from '@coinbase/onchainkit/minikit'

// Add the hook
const viewProfile = useViewProfile()

// Add the handler function
const handleViewProfile = () => {
  viewProfile()
}

// Add the button in your UI in the header after the close button
<button
  type="button"
  onClick={handleViewProfile}
  className="cursor-pointer bg-transparent font-semibold text-sm pl-2"
>
  PROFILE
</button>
```

### useNotification

One of the major benefits of mini apps is that you can send notifications to your users through their social app.

Recall the token and url we saved in the [useAddFrame section](#useaddframe)? We'll use those now to send a user a notification. In this guide, we'll simply send a test notification unrelated to the game activity.

```tsx app/page.tsx
//add useNotification to the import list
import {..., useNotification } from '@coinbase/onchainkit/minikit'

// Add the hook
const sendNotification = useNotification()

// Add the handler function
const handleSendNotification = async () => {
  try {
    await sendNotification({
      title: 'New High Score! 🎉',
      body: 'Congratulations on achieving a new high score!'
    })
    setTimeout(() => setNotificationSent(false), 30000)
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

// Add the button in your UI
{context?.client.added && (
  <button
    type="button"
    onClick={handleSendNotification}
    className="cursor-pointer bg-transparent font-semibold text-sm disabled:opacity-50"
  >
    SEND NOTIFICATION
  </button>
)}
```

<Info>
  Notice that we first check if the user has added the frame to their list of mini apps before displaying the button. This is using the `context` object provided by `useMiniKit()`. If you don't see the button to send the notification, its likely because mini app hasn't been saved.
</Info>

## Conclusion

Congratulations, you've created your first mini app, set up the manifest, added key MiniKit hooks, and sent your users a notification! We're excited to see what you build with MiniKit!

<CardGroup cols={2}>
  <Card title="Explore MiniKit Overview" icon="book-open" href="/base-app/build-with-minikit/overview">
    Learn more about MiniKit features and capabilities
  </Card>

  <Card title="Social Patterns Guide" icon="users" href="/base-app/build-with-minikit/thinking-social">
    Design patterns for social mini apps
  </Card>
</CardGroup>



# Common Issues & Debugging

> Frequent issues encountered during Mini App development and their solutions

## **Prerequisites & Setup Verification**

Before debugging, ensure your Mini App has the foundational requirements in place.

### **Required Files and Structure**

Your Mini App must have these files in the correct locations:

```html
your-domain.com/
├── .well-known/
│   └── farcaster.json          # Required manifest file
├── your-app/
│   ├── index.html              # Your app entry point
│   └── ...                     # Your app files
```

### **Environment Setup Checklist**

* Domain is accessible via HTTPS
* Manifest file exists at `/.well-known/farcaster.json`
* All image URLs are publicly accessible

### **Basic Validation Steps**

1. **Test manifest accessibility**: Visit `https://yourdomain.com/.well-known/farcaster.json`
2. **Validate JSON syntax**: Use [JSONLint](https://jsonlint.com/) to check your manifest
3. **Test app loading**: Ensure your app loads without console errors

## **Quick Diagnostic Workflow**

**Is your app not appearing in search results?** → [Go to App Discovery & Indexing Issues](#1-app-discovery--indexing-issues)

**Is your app not rendering as an embed when shared?** → [Go to Embed Rendering Issues](#3-embed-rendering-issues)

**Are you having wallet connection problems?** → [Go to Wallet Connection Problems](#4-wallet-connection-problems)

**Are you looking for testing tools ?** → [Go to Mobile Testing & Debugging](#6-mobile-testing--debugging)

**Are changes not appearing after updates?** → [Go to Manifest Configuration Problems](#2-manifest-configuration-problems)

**Does your app close unexpectedly during user interactions?** → [Go to Gesture Conflicts and App Dismissal Issues](#5-gesture-conflicts-and-app-dismissal-issues)

## **Detailed Problem Solutions**

## **1. App Discovery & Indexing Issues**

**Problem**: Your Mini App doesn't appear in search results or app catalogs.

**Root Cause**: Missing or incomplete manifest configuration.

**Solution**: Ensure your manifest at `/.well-known/farcaster.json` includes all required fields:

```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjkxNTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMmVmNzkwRGQ3OTkzQTM1ZkQ4NDdDMDUzRURkQUU5NDBEMDU1NTk2In0",
    "payload": "eyJkb21haW4iOiJyZXdhcmRzLndhcnBjYXN0LmNvbSJ9",
    "signature": "MHgxMGQwZGU4ZGYwZDUwZTdmMGIxN2YxMTU2NDI1MjRmZTY0MTUyZGU4ZGU1MWU0MThiYjU4ZjVmZmQxYjRjNDBiNGVlZTRhNDcwNmVmNjhlMzQ0ZGQ5MDBkYmQyMmNlMmVlZGY5ZGQ0N2JlNWRmNzMwYzUxNjE4OWVjZDJjY2Y0MDFj"
  },
  "frame": {
    "version": "1",
    "name": "Example Mini App",
    "iconUrl": "https://example.com/app.png",
    "splashImageUrl": "https://example.com/logo.png",
    "splashBackgroundColor": "#000000",
    "homeUrl": "https://example.com",
    "webhookUrl": "https://example.com/api/webhook",
    "subtitle": "Example Mini App subtitle",
    "description": "Example Mini App subtitle",
    "screenshotUrls": [
      "https://example.com/screenshot1.png",
      "https://example.com/screenshot2.png",
      "https://example.com/screenshot3.png"
    ],
    "primaryCategory": "social",
    "tags": [
      "example",
      "mini app",
      "coinbase wallet"
    ],
    "heroImageUrl": "https://example.com/og.png",
    "tagline": "Example Mini App tagline",
    "ogTitle": "Example Mini App",
    "ogDescription": "Example Mini App description",
    "ogImageUrl": "https://example.com/og.png"
  }
}
```

<Info>
  In the Category section only the top 100 Mini Apps are shared. This is determined by activity such as user sharing.
</Info>

**Critical Requirements**:

* `primaryCategory` is required for searchability and category pages
* `accountAssociation` is required for verification

**Reference**: [Complete manifest guide](https://docs.base.org/base-app/introduction/getting-started#manifest-file-configuration)

### **App Indexing Requirements**

**Problem**: Your app has a manifest but still doesn't appear in catalogs.

**Solution**: Your Mini App must be shared in a post to be indexed.

**Steps to Index Your App**:

1. Complete your manifest setup
2. Share your Mini App URL in a post
3. Indexing can take up to 10 minutes
4. Verify appearance in app catalogs

### **Caching Issues - Changes Not Appearing**

**Problem**: Updates to your manifest or app aren't showing up.

**Why This Happens**: Farcaster clients cache manifest data for up to 24 hours for performance.

**Solutions**:

1. **Force Refresh**: Share your Mini App in a new cast to trigger cache refresh. This can take up to 10 minutes

## **2. Manifest Configuration Problems**

### **Image Display Issues**

**Problem**: App icons or images not displaying correctly.

**Debug Steps**:

1. Test image accessibility in incognito browser
2. Verify image format (PNG, JPG, WebP supported)
3. Check image dimensions (icons should be 200x200px minimum)
4. Ensure HTTPS URLs only

<Frame>
  <img alt="Manifest Embed Example" src="https://mintlify.s3.us-west-1.amazonaws.com/base-a060aa97/images/minikit/spec_image.jpeg" height="364" />
</Frame>

## **3. Embed Rendering Issues**

### **Mini App Not Showing as Embed**

**Problem**: Your Mini App URL doesn't render as a rich embed when shared.

**Root Cause**: The embed configuration is not correct.

**Solution**: Make sure the metadata in the head tag has the correct format in order to render correctly. In order for it to work properly for all clients please ensure you’re using the `name="fc:frame" meta tag.`

```html
<meta name="fc:frame" content="...">
```

**Debug Steps**:

1. Test your URL in the [Mini App Embed Tool](https://farcaster.xyz/~/developers/mini-apps/embed)
2. Check meta tag is in `<head>` section

**Success Verification**: Your embed should show an image with a launch button when the URL is shared.

## **4. Wallet Connection Problems**

### **Getting Connected Wallet**

**Problem**: Unable to access user's wallet or connection status.

### **Using MiniKit with OnchainKit (Recommended)**

Minikit uses the Onchainkit wallet connect component that handles this behaviour of box for you without any additional set up.

**Complete Setup**:

```tsx
// 1. Install dependencies
// npm install @coinbase/onchainkit

// 2. Set up your app with MiniKitProvider
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base } from 'wagmi/chains';

function App() {
  return (
    <MiniKitProvider
      apiKey="your-onchainkit-api-key"
      chain={base}
    >
      <YourAppContent />
    </MiniKitProvider>
  );
}

// 3. Use wallet component
import { Wallet } from '@coinbase/onchainkit/wallet';

function YourAppContent() {
  return (
    <div>
      <Wallet />
      {/* Your app content */}
    </div>
  );
}
```

### **Using Wagmi Hooks Directly (Recommended)**

```tsx
import { useAccount } from 'wagmi';

function WalletInfo() {
  const { address, isConnected } = useAccount();
  
  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }
  
  return (
    <div>
      <div>Status: Connected</div>
      <div>Address: {address}</div>
    </div>
  );
}
```

<Info>
  MiniKit includes wagmi providers by default - don't add additional wagmi configuration.
</Info>

**Error Handling**:

```tsx
import { useAccount, useConnect } from 'wagmi';

function WalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isLoading } = useConnect();

  if (error) {
    return <div>Connection error: {error.message}</div>;
  }

  if (isLoading) {
    return <div>Connecting...</div>;
  }

  if (!isConnected) {
    return (
      <button onClick={() => connect({ connector: connectors[0] })}>
        Connect Wallet
      </button>
    );
  }

  return <div>Connected: {address}</div>;
}
```

## **5. Gesture Conflicts and App Dismissal Issues**

**Problem**: App closes when users swipe, drag, or perform touch gestures.

**Symptoms**:

* Mini App closes when users swipe, drag, or perform touch gestures
* App dismisses during game interactions or custom navigation
* Users can't complete multi-step touch interactions

**Root Cause**: Mini Apps run in modal containers where native gestures (swipes, taps outside the app area) automatically close the app. If your app uses similar gestures, they conflict with these native dismissal behaviors.

**Solution**: Disable native gestures when calling `sdk.actions.ready()`:

```ts
// Instead of this:
await sdk.actions.ready();

// Use this if your app has gesture conflicts:
await sdk.actions.ready({ disableNativeGestures: true });
```

## **6. Mobile Testing & Debugging**

### **Using Eruda for Mobile Debug**

**Problem**: Difficulty debugging Mini Apps on mobile devices.

**Setup**:

```html
<!-- Add to your HTML head for debugging only -->
<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>
  // Only enable in development
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('ngrok')) {
    eruda.init();
  }
</script>
```

<Info>
  If you are testing specific enviornment behaviour - you can use clientFid :309857
</Info>

**How to Use**:

1. Add the script to your app
2. Open your Mini App on mobile (cast the app in a DM to yourself)
3. Look for the Eruda debugging panel icon (usually bottom-right)
4. Access console, network, elements, and other debugging tools

**Mobile Testing Workflow**:

1. **Local Testing**: Use ngrok or similar to expose localhost
2. **Cast in DM**: Share your app URL in a DM to yourself
3. **Test Different Clients**: Test in Warpcast mobile and other Farcaster clients
4. **Check Different Devices**: Test on both iOS and Android if possible

<Info>
  Remove Eruda before production deployment.
</Info>

## **Advanced Troubleshooting**

### **AI-Assisted Debugging**

**Using Coinbase Wallet Compatibility Validator**:

The Coinbase Wallet team provides an AI-powered validation tool to check Mini App compatibility.

**How to Use**:

1. Use the validator prompt: [CBW MiniApp Validator](https://raw.githubusercontent.com/base/demos/refs/heads/master/minikit/mini-app-help/validate.txt)
2. In your preferred AI code editor (Cursor, etc.):
   * Add the validator file to your project context
   * Ask the AI: "Please validate my Mini App code using the CBW validator guidelines"
3. The AI will return a report of any unsupported actions or compatibility issues

**What it Checks**:

* Unsupported SDK methods
* Coinbase Wallet specific limitations

## **Success Verification**

### **Testing Checklist**

Before deploying your Mini App, verify these items work correctly:

**Basic Functionality**:

* [ ] App loads without console errors
* [ ] All images display correctly
* [ ] Wallet connection works
* [ ] Core app functionality works as expected

**Discovery & Sharing**:

* [ ] Manifest file is accessible at `/.well-known/farcaster.json`
* [ ] App appears in embed when URL is shared
* [ ] App appears in search results (after posting)
* [ ] All required manifest fields are present

## **Getting Additional Help**

If you're still experiencing issues after following this guide:

* [**Mini App Debug Tool**](https://farcaster.xyz/~/developers) - Test your Mini App functionality
* [**Mini App Embed Tool**](https://farcaster.xyz/~/developers/mini-apps/embed) - Preview how embeds will appear
* [**JSONLint**](https://jsonlint.com/) - Validate JSON syntax
* [**Eruda**](https://github.com/liriliri/eruda) - Mobile debugging console
* [Base Discord](https://discord.com/channels/1067165013397213286/1387875275756408883) - #minikit channel

