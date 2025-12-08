# Chains / Networks

**Pretium API** supports multiple blockchain networks for payments.

\
Supported networks include: **Celo, Base, Tron, Stellar,** and **Scroll**.

```
POST {{uri}}/account/networks
```

{% tabs %}
{% tab title="200 - Success" %}

```html
{
    "code": 200,
    "message": "Supported Networks",
    "data": [
        {
            "name": "Base",
            "icon": "https://xwift.africa/coins/base.svg",
            "settlement_wallet_address": "0x8005ee53e57ab11e11eaa4efe07ee3835dc02f98",
            "assets": [
                {
                    "name": "USDC",
                    "icon": "https://xwift.africa/coins/usdc.svg"
                }
            ]
        },
        {
            "name": "Celo",
            "icon": "https://xwift.africa/coins/celo.webp",
            "settlement_wallet_address": "0x8005ee53e57ab11e11eaa4efe07ee3835dc02f98",
            "assets": [
                {
                    "name": "USDC",
                    "icon": "https://xwift.africa/coins/usdc.svg"
                },
                {
                    "name": "cUSD",
                    "icon": "https://xwift.africa/coins/cUSD.svg"
                },
                {
                    "name": "USDT",
                    "icon": "https://xwift.africa/coins/usdt.png"
                }
            ]
        }
    ]
}
```

{% endtab %}

{% tab title="400 - Bad Request" %}

```markup
{
   "code": 400,
   "message": "Failed - Bad Request"
}
```

{% endtab %}
{% endtabs %}
