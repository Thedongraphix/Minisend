# Getting Started with Mini Apps

> Overview and implementation guide for Mini Apps in Base App

Mini Apps are lightweight web applications that run natively within clients like Base App. Users instantly access mini apps without downloads, benefit from seamless wallet interactions, and discover apps directly in the social feed. This benefits app developers by creating viral loops for user acquisition and engagement.

## What is a Mini App?

A Mini App is composed of:

<CardGroup cols={2}>
  <Card title="Your Existing Web Application" icon="globe">
    Your current web app works as-is
  </Card>

  <Card title="MiniKitProvider Wrapper" icon="code">
    Simple wrapper component integration
  </Card>

  <Card title="Manifest File" icon="file">
    Single farcaster.json configuration file
  </Card>

  <Card title="Standard Deployment" icon="rocket">
    Deploy to any hosting platform (Vercel, Netlify, etc.)
  </Card>
</CardGroup>

**No rebuilding, architectural changes, or complex integrations are required.**

## Code Implementation

<Tabs>
  <Tab title="Before (Standard Web App)">
    ```jsx
    function App() {
      return (
        <div>
          <MyExistingComponent />
          <AnotherComponent />
        </div>
      );
    }
    ```
  </Tab>

  <Tab title="After (Mini App Implementation)">
    ```jsx
    import { MiniKitProvider } from '@coinbase/onchainkit/minikit';

    function App() {
      return (
        <MiniKitProvider projectId="your-id">
          <MyExistingComponent />  {/* Existing components unchanged */}
          <AnotherComponent />     {/* Existing components unchanged */}
        </MiniKitProvider>
      );
    }
    ```

    **Changes Required**: Two import lines and one wrapper component. All existing components remain unchanged.
  </Tab>
</Tabs>

## Implementation Examples

<Tabs>
  <Tab title="Simple Example with MiniKit">
    ```shell
    npx create-onchain --mini
    cd my-miniapp
    npm run dev
    ```
  </Tab>

  <Tab title="Non-React Implementation (Vue, Svelte, Vanilla JS)">
    ```shell
    npm create @farcaster/mini-app
    cd my-miniapp
    npm run dev
    ```
  </Tab>
</Tabs>

<Check>
  **Result**: Functional Mini App with wallet integration, transaction capabilities, and social features.
</Check>

## Pre-Solved Development Challenges

<AccordionGroup>
  <Accordion title="Common Engineering Concerns">
    * Complex wallet integration processes
    * Authentication flow implementation
    * Mobile responsiveness requirements
    * Cross-platform compatibility issues
    * User onboarding friction
  </Accordion>

  <Accordion title="MiniKit Automated Solutions">
    * **Mobile Optimization**: Automatic handling of safe areas and responsive design
    * **Platform Compatibility**: Operates across Farcaster, Coinbase Wallet, and web browsers
    * **User Context**: Immediate access to user identification
  </Accordion>
</AccordionGroup>

## Manifest File Configuration

Mini Apps require one configuration file located at `/.well-known/farcaster.json` in your project root. This file instructs clients how to display your application.

### Sample Manifest Structure

```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjgxODAyNi...",
    "payload": "eyJkb21haW4iOiJleGFtcGxlLmNvbSJ9",
    "signature": "MHhmOGQ1YzQyMmU3ZTZlMWNhMzU1..."
  },
  "frame": {
    "version": "1",
    "name": "Your App Name",
    "subtitle": "Short tagline",
    "description": "Detailed description of what your app does",
    "iconUrl": "https://yourapp.com/icon.png",
    "homeUrl": "https://yourapp.com",
    "splashImageUrl": "https://yourapp.com/splash.png",
    "splashBackgroundColor": "#000000",
    "heroImageUrl": "https://yourapp.com/hero.png",
    "tagline": "One-line value proposition",
    "screenshotUrls": [
      "https://yourapp.com/screenshot1.png",
      "https://yourapp.com/screenshot2.png"
    ],
    "primaryCategory": "games",
    "tags": ["multiplayer", "strategy", "onchain"],
    "webhookUrl": "https://yourapp.com/api/webhook"
  }
}
```

## Categories and Discovery

### Primary Categories

<CardGroup cols={3}>
  <Card title="games" icon="gamepad">
    Gaming and entertainment applications
  </Card>

  <Card title="social" icon="users">
    Social networking and communication tools
  </Card>

  <Card title="finance" icon="dollar-sign">
    DeFi, trading, and payment applications
  </Card>

  <Card title="utility" icon="wrench">
    Tools and productivity applications
  </Card>

  <Card title="productivity" icon="briefcase">
    Task management and organization tools
  </Card>

  <Card title="developer-tools" icon="code">
    Development utilities
  </Card>

  <Card title="art-creativity" icon="palette">
    Creative and artistic applications
  </Card>
</CardGroup>

### Account Association (Domain Verification)

Domain ownership verification is required. Generate your manifest using:

<Tabs>
  <Tab title="MiniKit Method">
    ```shell
    npx create-onchain --manifest
    ```
  </Tab>

  <Tab title="Alternative Farcaster Tool">
    You can use the [Farcaster manifest tool](https://farcaster.xyz/~/developers/mini-apps/manifest) for generation.
  </Tab>
</Tabs>

### Image Requirements

<AccordionGroup>
  <Accordion title="iconUrl">
    200x200px PNG/JPG format
  </Accordion>

  <Accordion title="splashImageUrl">
    200x200px PNG/JPG (displayed during app loading)
  </Accordion>

  <Accordion title="heroImageUrl">
    1200x628px PNG/JPG (for featured placement)
  </Accordion>

  <Accordion title="screenshotUrls">
    App store screenshots in various sizes
  </Accordion>
</AccordionGroup>

## Deployment Process

The deployment process remains identical to standard web applications:

<Steps>
  <Step title="Build Application">
    `npm run build` (standard process)
  </Step>

  <Step title="Add Configuration">
    `public/.well-known/farcaster.json`
  </Step>

  <Step title="Deploy">
    Use any hosting platform (Vercel, Netlify, custom servers)
  </Step>

  <Step title="Browser Testing">
    Functions as standard web application
  </Step>

  <Step title="Farcaster Testing">
    <Card title="Test with Farcaster Tools" icon="test-tube" href="https://farcaster.xyz/~/developers/mini-apps/manifest">
      Validate your Mini App configuration
    </Card>
  </Step>
</Steps>

No special hosting, new infrastructure, or complex setup procedures required.

## Frequently Asked Questions

<AccordionGroup>
  <Accordion title="Do we need to rebuild our entire application?">
    No. Wrap your existing application in `<MiniKitProvider>`. Implementation complete.
  </Accordion>

  <Accordion title="Will this break our current web application?">
    No. Mini Apps function in regular browsers. The same codebase works across all platforms.
  </Accordion>

  <Accordion title="Do we need blockchain expertise?">
    No. Integration complexity is similar to Stripe implementation.
  </Accordion>

  <Accordion title="What about user data and privacy?">
    Maintain current practices. You control data, backend systems, and privacy policies.
  </Accordion>

  <Accordion title="What is the performance impact?">
    Minimal impact. MiniKit SDK is approximately 50KB. Application performance remains unchanged.
  </Accordion>

  <Accordion title="We don't use React/Next.js. Is this compatible?">
    Yes. The Farcaster SDK supports Vue, Angular, Svelte, and any web framework.
  </Accordion>
</AccordionGroup>

## Technical Resources

<CardGroup cols={2}>
  <Card title="Live Code Examples" icon="github" href="https://github.com/base/demos/tree/master/minikit">
    View working implementation examples
  </Card>

  <Card title="MiniKit" icon="book" href="https://docs.base.org/base-app/build-with-minikit/overview">
    MiniKit documentation and overview
  </Card>

  <Card title="Mini Apps Guide" icon="compass" href="https://docs.base.org/base-app/mini-apps">
    Comprehensive guide to Mini Apps
  </Card>

  <Card title="Debug Guide" icon="alert-triangle" href="https://docs.base.org/base-app/build-with-minikit/debugging">
    Debugging MiniKit and Mini Apps
  </Card>

  <Card title="Debug Tools" icon="bug" href="https://farcaster.xyz/~/developers/mini-apps/debug">
    Validate and test your Mini App
  </Card>

  <Card title="Farcaster SDK" icon="package" href="https://miniapps.farcaster.xyz/docs/getting-started">
    Farcaster Mini Apps SDK documentation
  </Card>

  <Card title="Onchainkit" icon="puzzle-piece" href="https://docs.base.org/builderkits/onchainkit/getting-started">
    OnchainKit components and guides
  </Card>
</CardGroup>


# Integrating MiniKit with Existing Applications

> Guide for integrating MiniKit into an existing Next.js project with installation, provider setup, and environment configuration

This guide helps developers integrate MiniKit into an existing Next.js project. It includes installation steps, provider setup and environment configuration.

<Warning>
  This guide assumes you want to add MiniKit to an existing application. For new projects, use the [MiniKit CLI](/base-app/build-with-minikit/quickstart) for automatic setup.
</Warning>

## Prerequisites

Before you begin, confirm the following:

<AccordionGroup>
  <Accordion title="Next.js Project Structure">
    You are using a Next.js project with the `app/` directory structure (App Router).
  </Accordion>

  <Accordion title="Deployment">
    Your app is deployed and publicly accessible (e.g. via Vercel) with HTTPS enabled.
  </Accordion>

  <Accordion title="Farcaster Account">
    You have an active Farcaster account for testing and access to your custody wallet.
  </Accordion>

  <Accordion title="Coinbase Developer Platform Account">
    Sign up for a [Coinbase Developer Platform](https://portal.cdp.coinbase.com/) to retrieve your CDP API Key.
  </Accordion>
</AccordionGroup>

## Integration Steps

<Steps>
  <Step title="Install required dependencies">
    MiniKit is available as part of OnchainKit.

    ```shell
    npm install @coinbase/onchainkit
    ```

    <Check>
      Verify installation by checking that `@coinbase/onchainkit` appears in your `package.json`.
    </Check>
  </Step>

  <Step title="Add the MiniKitProvider to your app">
    Create and use the `MiniKitProvider` to initialise SDK context for your application.

    **File: `providers/MiniKitProvider.tsx`**

    ```jsx
    'use client';

    import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
    import { ReactNode } from 'react';
    import { base } from 'wagmi/chains';

    export function MiniKitContextProvider({ children }: { children: ReactNode }) {
      return (
        <MiniKitProvider
          apiKey={process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY}
          chain={base}
        >
          {children}
        </MiniKitProvider>
      );
    }
    ```

    Then wrap your app in `app/layout.tsx`:

    ```jsx
    import { MiniKitContextProvider } from '@/providers/MiniKitProvider';

    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <html lang="en">
          <body>
            <MiniKitContextProvider>
              {children}
            </MiniKitContextProvider>
          </body>
        </html>
      );
    }
    ```

    <Tip>
      The provider automatically configures wagmi and react-query, and sets up connectors to use Farcaster when available.
    </Tip>
  </Step>

  <Step title="Initialize MiniKit in your main page">
    Use the `useMiniKit` hook to access the frame context and trigger readiness.

    **File: `app/page.tsx`**

    ```jsx
    'use client';

    import { useEffect, useState } from 'react';
    import { useMiniKit } from '@coinbase/onchainkit/minikit';

    export default function HomePage() {
      const { setFrameReady, isFrameReady } = useMiniKit();

      // The setFrameReady() function is called when your mini-app is ready to be shown
      useEffect(() => {
        if (!isFrameReady) {
          setFrameReady();
        }
      }, [setFrameReady, isFrameReady]);

      return <div>Your app content goes here</div>;
    }
    ```

    <Info>
      The `setFrameReady()` function removes the splash screen and shows your application. Only call this when your app is fully loaded and ready for user interaction.
    </Info>
  </Step>

  <Step title="Configure environment variables">
    Add the required environment variables to your project and deployment platform.

    <Tabs>
      <Tab title="Required Variables">
        These variables are essential for your MiniKit app to function:

        <ParamField path="NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME" type="string" required>
          The name of your Mini App as it appears to users
        </ParamField>

        <ParamField path="NEXT_PUBLIC_URL" type="string" required>
          The deployed URL of your application (must be HTTPS)
        </ParamField>

        <ParamField path="NEXT_PUBLIC_ONCHAINKIT_API_KEY" type="string" required>
          Your Coinbase Developer Platform API key
        </ParamField>

        <ParamField path="FARCASTER_HEADER" type="string" required>
          Generated during manifest creation for account association
        </ParamField>

        <ParamField path="FARCASTER_PAYLOAD" type="string" required>
          Generated during manifest creation for account association
        </ParamField>

        <ParamField path="FARCASTER_SIGNATURE" type="string" required>
          Generated during manifest creation for account association
        </ParamField>
      </Tab>

      <Tab title="Optional Variables">
        These variables enhance your app's appearance and metadata:

        <ParamField path="NEXT_PUBLIC_APP_ICON" type="string">
          URL to your app's icon (recommended: 48x48px PNG)
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_SUBTITLE" type="string">
          Brief subtitle shown in app listings
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_DESCRIPTION" type="string">
          Detailed description of your app's functionality
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_SPLASH_IMAGE" type="string">
          URL to splash screen image shown during app loading
        </ParamField>

        <ParamField path="NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR" type="string">
          Hex color code for splash screen background (e.g., "#000000")
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_PRIMARY_CATEGORY" type="string">
          Primary category for app discovery (e.g., "social", "gaming", "utility")
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_HERO_IMAGE" type="string">
          Hero image URL displayed in cast previews
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_TAGLINE" type="string">
          Short, compelling tagline for your app
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_OG_TITLE" type="string">
          Open Graph title for social media sharing
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_OG_DESCRIPTION" type="string">
          Open Graph description for social media sharing
        </ParamField>

        <ParamField path="NEXT_PUBLIC_APP_OG_IMAGE" type="string">
          Open Graph image URL for social media previews
        </ParamField>
      </Tab>
    </Tabs>

    <Warning>
      Don't forget to include all referenced images in your `public/` folder and ensure they're accessible via HTTPS.
    </Warning>
  </Step>

  <Step title="Generate the manifest">
    Use the OnchainKit CLI to generate account association credentials and update your environment variables.

    ```shell
    npx create-onchain --manifest
    ```

    <Info>
      **Important:** The wallet you connect must be your Farcaster custody wallet. You can import this wallet using the recovery phrase found in Farcaster under Settings → Advanced → Farcaster recovery phrase.
    </Info>

    Follow these substeps:

    1. Connect your Farcaster custody wallet
    2. Add your deployed Vercel URL
    3. Sign the manifest to generate association credentials
    4. The CLI will automatically update your local `.env` file

    <Tip>
      After running this command locally, remember to update your deployment platform's environment variables with the generated `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, and `FARCASTER_SIGNATURE` values.
    </Tip>
  </Step>

  <Step title="Create .well-known/farcaster.json route">
    The farcaster.json file contains metadata that allows clients to identify your Mini App and its capabilities.

    Create a route handler at `app/.well-known/farcaster.json/route.ts`:

    ```typescript
    function withValidProperties(
      properties: Record<string, undefined | string | string[]>,
    ) {
      return Object.fromEntries(
        Object.entries(properties).filter(([key, value]) => {
          if (Array.isArray(value)) {
            return value.length > 0;
          }
          return !!value;
        }),
      );
    }

    export async function GET() {
      const URL = process.env.NEXT_PUBLIC_URL;

      return Response.json({
        accountAssociation: {
          header: process.env.FARCASTER_HEADER,
          payload: process.env.FARCASTER_PAYLOAD,
          signature: process.env.FARCASTER_SIGNATURE,
        },
        frame: withValidProperties({
          version: "1",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
          description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
          screenshotUrls: [],
          iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
          splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
          splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
          homeUrl: URL,
          webhookUrl: `${URL}/api/webhook`,
          primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
          tags: [],
          heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
          tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
          ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
          ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
          ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
        }),
      });
    }
    ```

    <Check>
      Test this endpoint by visiting `https://yourdomain.com/.well-known/farcaster.json` to ensure it returns valid JSON.
    </Check>
  </Step>

  <Step title="Define Farcaster frame metadata">
    Configure the metadata that clients use to render your Mini App in posts and generate preview cards.

    **File: `app/layout.tsx`**

    ```typescript
    import { Metadata } from 'next';

    export async function generateMetadata(): Promise<Metadata> {
      const URL = process.env.NEXT_PUBLIC_URL;
      return {
        title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
        description:
          "Generated by `create-onchain --mini`, a Next.js template for MiniKit",
        other: {
          "fc:frame": JSON.stringify({
            version: "next",
            imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
            button: {
              title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
              action: {
                type: "launch_frame",
                name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
                url: URL,
                splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
                splashBackgroundColor:
                  process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
              },
            },
          }),
        },
      };
    }
    ```

    <Warning>
      All image and API URLs used here must be publicly accessible via HTTPS. Test each URL in your browser before deploying.
    </Warning>
  </Step>

  <Step title="Test and deploy your Mini App">
    Before sharing your Mini App, validate that everything is working correctly.

    <Tabs>
      <Tab title="Pre-deployment Checklist">
        Verify the following before going live:

        * ✅ App is deployed at a public HTTPS domain
        * ✅ All environment variables are set on your deployment platform
        * ✅ All referenced images are accessible in your `public/` folder
        * ✅ The `.well-known/farcaster.json` endpoint returns valid JSON
        * ✅ Your app loads without errors in a browser
      </Tab>

      <Tab title="Validation Tools">
        Use these tools to test your configuration:

        **Manifest Validator:**

        ```
        https://farcaster.xyz/~/developers/mini-apps/manifest
        ```

        This tool validates:

        * Manifest can be loaded successfully
        * Frame metadata is correctly formatted
        * Button actions and preview images are functioning
        * Account association is properly configured

        **Manual Testing:**

        1. Visit your deployed URL directly in a browser
        2. Check browser console for any errors
        3. Verify the MiniKit context loads properly
        4. Test frame readiness functionality
      </Tab>

      <Tab title="Sharing Your App">
        Once validation passes:

        1. **Create a cast** with your app's URL in Farcaster
        2. **Verify the preview** displays your hero image and launch button
        3. **Test the launch experience** by clicking the button
        4. **Share with others** for feedback and testing

        <Info>
          If your app doesn't render as an embed, double-check your manifest configuration and ensure all URLs are publicly accessible.
        </Info>
      </Tab>
    </Tabs>

    <Card title="Need Help Debugging?" icon="bug" href="/base-app/build-with-minikit/debugging">
      If you encounter issues, check our comprehensive debugging guide for common problems and solutions.
    </Card>
  </Step>
</Steps>

## Understanding MiniKit Context

### What `useMiniKit` Gives You

The `useMiniKit()` hook provides access to everything your Mini App needs to understand the Farcaster session:

<ResponseField name="context.user.fid" type="string">
  The Farcaster ID of the current user
</ResponseField>

<ResponseField name="context.client.added" type="boolean">
  Whether the user has added your Mini App to their account
</ResponseField>

<ResponseField name="context.location" type="string">
  Where the app was launched from (e.g., "cast", "launcher", "notification")
</ResponseField>

<ResponseField name="isFrameReady" type="boolean">
  Whether your app has called `setFrameReady()` and is ready to be shown
</ResponseField>

<ResponseField name="setFrameReady" type="() => void">
  Function to call when your app is fully loaded and ready for interaction
</ResponseField>

You can use this context to personalize the experience, trigger different flows, or track user behavior.

## Available MiniKit Hooks

MiniKit provides a comprehensive set of hooks designed to help you build rich, social experiences:

<CardGroup cols={2}>
  <Card title="useNotification" icon="bell">
    Send in-app and push notifications to users who have added your frame
  </Card>

  <Card title="useAddFrame" icon="plus">
    Allow users to save your mini app to their Farcaster client for easy access
  </Card>

  <Card title="useClose" icon="x">
    Programmatically close the mini app frame when appropriate
  </Card>

  <Card title="useOpenUrl" icon="link">
    Open external URLs from within the frame context
  </Card>

  <Card title="usePrimaryButton" icon="hand-pointer">
    Configure and handle primary button interactions
  </Card>

  <Card title="useViewProfile" icon="user">
    Navigate users to Farcaster profiles (their own or others)
  </Card>

  <Card title="useAuthenticate" icon="key">
    Handle Farcaster authentication and sign-in flows
  </Card>
</CardGroup>

<Card title="Explore All Hooks" icon="code" href="/base-app/build-with-minikit/overview#hooks">
  Learn about all available MiniKit hooks, their parameters, and usage examples
</Card>

## Next Steps

Now that your Mini App is integrated and deployed:

<Steps>
  <Step title="Test thoroughly">
    Share your Mini App URL in Farcaster and test all functionality with real users.
  </Step>

  <Step title="Monitor and iterate">
    Use analytics to understand how users interact with your app and identify areas for improvement.
  </Step>

  <Step title="Explore advanced features">
    Consider adding notifications, authentication, or other MiniKit hooks to enhance the user experience.
  </Step>
</Steps>


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




Based on the search results, I can see information about wallet connection issues in Farcaster frames. Here's how to solve wallet connection timeout issues on mobile in Farcaster frames:

## Common Solutions for Mobile Wallet Connection Timeouts

**1. Use the Farcaster Frame Connector**
Set up your Wagmi provider to use the Farcaster mini app connector:

```typescript
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  },
  connectors: [farcasterFrame()],
});
```

**2. Handle Connection Errors Gracefully**
Implement proper error handling for wallet connection timeouts:

```typescript
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletConnectMinimal() {
  const { address, isConnected } = useAccount();
  const { connect, error, isLoading } = useConnect();
  const { disconnect } = useDisconnect();

  if (error) {
    return <div>Connection error: {error.message}</div>;
  }

  if (isLoading) {
    return <div>Connecting...</div>;
  }

  return (
    <button onClick={() => 
      isConnected 
        ? disconnect() 
        : connect({ connector: config.connectors[0] })}>
      {isConnected ? "Disconnect" : "Connect"}
    </button>
  );
}
```

**3. Check Your Frame Configuration**
Ensure your frame manifest is properly configured at `/.well-known/farcaster.json` and includes all required fields.

**4. Use MiniKit for Better Integration**
If building a Mini App, use MiniKit which handles wallet connections automatically:

```bash
npx create-onchain --mini
```

**5. Debug Mobile Issues**
Use Eruda for mobile debugging by adding this to your HTML head:

```html
<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('ngrok')) {
    eruda.init();
  }
</script>
```

The timeout issue is often related to improper connector setup or network connectivity problems on mobile. Using the Farcaster frame connector and proper error handling should resolve most connection timeout issues.
