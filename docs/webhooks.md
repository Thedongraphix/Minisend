# Payloads

Pretium sends **two webhook notifications** with the payment states for every successful transaction

#### On-ramp payment confirmation webhook

Sent when Pretium successfully receives payment from the user.

```
{
  "status": "COMPLETE",
  "transaction_code": "e37c02ca-2170-4a82-ad06-d2def781cc8e",
  "receipt_number": "TKTQRBEO7A",
  "public_name": null,
  "message": "Transaction processed successfully."
}

```

#### On-ramp asset release webhook

Sent after the user’s asset has been successfully released.

```
{
  "is_released": true,
  "transaction_code": "e37c02ca-2170-4a82-ad06-d2def781cc8e",
  "transaction_hash": "0x35ccb0b05158452a8373fe2823b0e989cbc0689bf44ff1786bc0383aadddf2a5"
}

```

#### Off-ramp payment confirmation webhook

Sent when Pretium successfully disburses cash to the recipient's mobile number or bank account.

```
{
   "status": "COMPLETE",
   "transaction_code":"43cfb5f7-df7e-4d49-8749-81a128b41179",
   "receipt_number":"TKT23BLSNK",
   "public_name": "John Doe",
   "message": "Transaction processed successfully."
}
```
