// Wallet Integration Test Utilities
// Test MetaMask mobile detection and connection flow

export const testMobileDetection = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  console.log('🔍 Mobile Detection Test:');
  console.log('User Agent:', userAgent);
  console.log('Is Mobile:', isMobile);
  console.log('Is iOS:', /iPad|iPhone|iPod/.test(userAgent));
  console.log('Is Android:', /Android/i.test(userAgent));
  
  return {
    userAgent,
    isMobile,
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/i.test(userAgent)
  };
};

export const testMetaMaskDetection = () => {
  const hasEthereum = typeof window !== 'undefined' && !!window.ethereum;
  const isMetaMask = hasEthereum && window.ethereum?.isMetaMask;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log('🦊 MetaMask Detection Test:');
  console.log('Has window.ethereum:', hasEthereum);
  console.log('Is MetaMask:', isMetaMask);
  console.log('Is Mobile + MetaMask:', isMobile && isMetaMask);
  
  return {
    hasEthereum,
    isMetaMask,
    isMobileMetaMask: isMobile && isMetaMask
  };
};

export const generateMetaMaskDeepLink = (host: string, pathname: string, search: string = '') => {
  const deepLink = `https://metamask.app.link/dapp/${host}${pathname}${search}`;
  console.log('🔗 Generated MetaMask Deep Link:', deepLink);
  return deepLink;
};

export const testWalletIntegration = () => {
  console.log('🧪 Running Wallet Integration Tests...\n');
  
  const mobileTest = testMobileDetection();
  const metamaskTest = testMetaMaskDetection();
  
  if (typeof window !== 'undefined') {
    const deepLink = generateMetaMaskDeepLink(
      window.location.host,
      window.location.pathname,
      window.location.search
    );
  }
  
  console.log('\n✅ Wallet integration tests completed!');
  
  return {
    mobile: mobileTest,
    metamask: metamaskTest,
    timestamp: new Date().toISOString()
  };
};

// Usage in browser console:
// import { testWalletIntegration } from './utils/wallet-test';
// testWalletIntegration();