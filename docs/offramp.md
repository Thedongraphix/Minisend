# Disburse (Pay)

This endpoint calls the Pretium payment protocol to verify that the payment has been made to the settlement wallet and release the equivalent fiat.

```
POST {{uri}}/v1/pay/KES
```

**Body Request**

***

| Name              | Type    | Description                                                        |
| ----------------- | ------- | ------------------------------------------------------------------ |
| type              | String  | Type of payment, MOBILE, BUY\_GOODS & PAYBILL                      |
| shortcode         | String  | Recipient mobile number, till number or  paybill number            |
| account\_number   | String  | Required if type is PAYBILL                                        |
| amount            | Integer | Amount to disburse                                                 |
| mobile\_network   | String  | Supported mobile network ie Safaricom                              |
| chain             | String  | CELO, BASE ,STELLAR, TRON or SCROLL                                |
| transaction\_hash | String  | 0x2cc419f14f6f1fefdb58e0359480fa321866a10668513488e71677c345339f27 |
| callback\_url     | URL     | URL to receive payment notification                                |

{% tabs %}
{% tab title="Sample Request" %}

```
{
    "type": "MOBILE",
    "shortcode": "0799770833",
    "amount": "500",
    "fee": "10",
    "mobile_network": "Safaricom",
    "chain": "CELO",
    "transaction_hash":"0x55a572efe1720250e442f38741477a4fc3f7f152e5cd208cc52f8222a1c2a13b",
    "callback_url": "https://pretium.africa/callback"
}
```

{% endtab %}

{% tab title="200 - Success" %}

```
{
    "code": 200,
    "message": "Disburse initiated",
    "data": {
        "status": "PENDING",
        "transaction_code": "TSALX",
        "message": "Success! Processing payment."
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
