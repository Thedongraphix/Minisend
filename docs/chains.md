# Headers

All API endpoints require an x-api-key header for authentication. Include your unique API key in the x-api-key header with every request to access the API. Requests without this header or with an invalid key will result in a 401 Unauthorized response.

<figure><img src="https://2320141468-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FWgbZEXgb3gnl9PSXHsys%2Fuploads%2FHo4JsClLipTkB67heWE4%2Fconsumer.png?alt=media&#x26;token=772d0021-7fc4-4352-bfc0-bd7ea5f28ee0" alt=""><figcaption></figcaption></figure>

**Header**

```

  'x-api-key': {{consumer_key}}

```

**Unauthorized response**

{% tabs %}
{% tab title="401 " %}

```
{
   "code": 401,
   "message": "Unauthorized"
}
```

{% endtab %}
{% endtabs %}
