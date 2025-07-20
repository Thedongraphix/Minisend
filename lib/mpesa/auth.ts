export async function getMPesaAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get M-Pesa access token: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('Access token not received from M-Pesa API');
  }
  
  return data.access_token;
}