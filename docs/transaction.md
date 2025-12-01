# Status

Fetch a transaction using its transaction code.

```
POST {{url}}/v1/status/{currency_code} 
```

**Body Request**

```html
{
    "transaction_code": "DCS3E45D"
}
```

{% tabs %}
{% tab title="200 - Success" %}

```
{
    "code": 200,
    "message": "Transaction",
    "data": {
        "id": 45229,
        "transaction_code": "DCS3E45D",
        "status": "COMPLETE",
        "amount": "287541",
        "amount_in_usd": "2229.98",
        "type": "MOBILE",
        "shortcode": "0700123456",
        "account_number": null,
        "public_name": "PUBLIC NAME",
        "receipt_number": "TI292XGAY9",
        "category": "DISBURSEMENT",
        "chain": "CELO",
        "asset": null,
        "transaction_hash": null,
        "message": "Transaction processed successfully.",
        "currency_code": "KES",
        "is_released": false,
        "created_at": "2025-09-02T12:46:13.000000Z"
    }
}
```

{% endtab %}

{% tab title="400 - Bad Request" %}

```
{
   "code": 400,
   "message": "Failed - Bad Request"
}
```

{% endtab %}
{% endtabs %}
