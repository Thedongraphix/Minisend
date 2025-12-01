# Exchange Rate

This endpoint retrieves exchange rates and can be used to calculate fiat equivalent for a given stablecoin amount, or vice versa.

```
POST {{uri}}/v1/exchange-rate
```

#### Body Params

```
{
    "currency_code": "{{currency_code}}"
}
```

{% tabs %}
{% tab title="200 - Success" %}

```
{
    "code": 200,
    "message": "Exchange rates",
    "data": {
        "buying_rate": 128.15,
        "selling_rate": 130.75,
        "quoted_rate": 129.2
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
