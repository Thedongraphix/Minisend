# Countries

Get a list of countries supported by Pretium APIs.

```
POST {{uri}}/account/countries
```

{% tabs %}
{% tab title="200 - Success" %}

```html
{
    "code": 200,
    "message": "Supported Countries",
    "data": [
        {
            "id": 1,
            "name": "Kenya",
            "currency_code": "KES",
            "phone_code": "254"
        },
        {
            "id": 2,
            "name": "Uganda",
            "currency_code": "UGX",
            "phone_code": "256"
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
