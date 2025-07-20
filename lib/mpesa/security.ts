// For M-Pesa sandbox, we can use base64 encoded password temporarily
export function generateSecurityCredential(): string {
  try {
    const password = process.env.MPESA_INITIATOR_PASSWORD || 'Safaricom496!';
    
    // For sandbox testing, some implementations accept base64 encoded password
    // In production, proper RSA encryption with Safaricom's certificate is required
    const encoded = Buffer.from(password).toString('base64');
    
    console.log('Using base64 encoded security credential for sandbox testing');
    return encoded;
    
  } catch (error) {
    console.error('Security credential generation failed:', error);
    throw new Error('Failed to generate security credential');
  }
}

// Alternative RSA implementation (uncomment if you have the correct certificate)
/*
import forge from 'node-forge';

export function generateSecurityCredentialRSA(): string {
  const publicCert = `-----BEGIN CERTIFICATE-----
[Safaricom's actual public certificate]
-----END CERTIFICATE-----`;

  try {
    const cert = forge.pki.certificateFromPem(publicCert);
    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
    
    const passwordToEncrypt = process.env.MPESA_INITIATOR_PASSWORD || 'Safaricom496!';
    
    const encrypted = publicKey.encrypt(
      passwordToEncrypt,
      'RSA-OAEP',
      {
        md: forge.md.sha1.create(),
        mgf1: forge.mgf1.create()
      }
    );
    
    return forge.util.encode64(encrypted);
  } catch (error) {
    console.error('RSA Security credential generation failed:', error);
    throw new Error('Failed to generate RSA security credential');
  }
}
*/