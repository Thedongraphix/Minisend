# Phone Number Verification

This endpoint validates a phone number and returns the registered individual's name as provided by Mobile Network Operators (MNOs).

Note: Reliability varies by country, so avoid heavy dependence on this endpoint for phone number validation.

```
POST {{url}}/v1/validation/{currency_code}
```

```
{
    "type": "MOBILE",
    "shortcode": "0700123456",
    "mobile_network": "Safaricom"
}
```
