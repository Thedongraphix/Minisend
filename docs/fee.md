# Fee

The fee field allows Pretium to collect fees on your behalf.

#### Example

If your UI charges a **1% facilitation fee** and a user wants to offramp **KES 1,000** (resulting in a **KES 10** fee):

#### Steps

Deduct the equivalent of **KES 1,010** from the user’s wallet.

Submit the following parameters in your API request:

```
{
  "amount": 1010,
  "fee": 10
}
```

Pretium’s payment protocol will send **KES 1,000** to the user and credit **KES 10** to your fiat wallet.

The reverse applies during onramping — if User B wants to onramp **KES 1,000** and you include a fee of **10**, Pretium API will initiate a collection of **KES 1,010** from the user, credit **KES 10** to your fiat wallet upon confirmation, and release assets equivalent to **KES 1,000** to the user’s address.
