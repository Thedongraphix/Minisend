# Account Detail

This endpoint validates an account number and returns the registered account name as provided by the bank or the mobile money wallet.

```
POST {{uri}}/v1/validation/NGN
```

#### Body Request

```
{
    "account_number": "0536243713",
    "bank_code": 232,
}
```

{% tabs %}
{% tab title="200 - Success" %}

```
{
    "code": 200,
    "message": "Validation results",
    "data": {
        "status": "COMPLETE",
        "account_name": "JOHN DOE",
        "account_number": "90154195756",
        "bank_name": "Opay",
        "bank_code": "100004"
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
