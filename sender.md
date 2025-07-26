Initiate Payment Order
POST
/
sender
/
orders

Try it
Initiate a new payment order as a sender.
Authorizations
​
API-Key
stringheaderrequired
Body
application/json
​
amount
numberrequired
​
token
stringrequired
Token symbol (USDT, USDC, CUSD, CNGN). See Supported Stablecoins for available options.

​
rate
numberrequired
​
network
enum<string>required
Network identifier for the blockchain

Available options: base, bnb-smart-chain, lisk, tron, celo, arbitrum-one, polygon, asset-chain 
​
recipient
objectrequired
Show child attributes

​
reference
string
​
returnAddress
string



example 

curl --request POST \
  --url https://api.paycrest.io/v1/sender/orders \
  --header 'API-Key: <api-key>' \
  --header 'Content-Type: application/json' \
  --data '{
  "amount": 123,
  "token": "<string>",
  "rate": 123,
  "network": "base",
  "recipient": {
    "institution": "<string>",
    "accountIdentifier": "<string>",
    "accountName": "<string>",
    "memo": "<string>",
    "providerId": "<string>",
    "metadata": {},
    "currency": "<string>"
  },
  "reference": "<string>",
  "returnAddress": "<string>"
}'

Response

{
  "status": "success",
  "message": "Operation successful",
  "data": {
    "id": "<string>",
    "amount": "<string>",
    "token": "<string>",
    "network": "base",
    "receiveAddress": "<string>",
    "validUntil": "2023-11-07T05:31:56Z",
    "senderFee": 123,
    "transactionFee": 123,
    "reference": "<string>"
  }
}




List Payment Orders
GET
/
sender
/
orders

Try it
Retrieve a list of payment orders for the sender.
Authorizations
​
API-Key
stringheaderrequired
Query Parameters
​
status
string
​
token
string
​
network
enum<string>
Network identifier for the blockchain

Available options: base, bnb-smart-chain, lisk, tron, celo, arbitrum-one, polygon, asset-chain 
​
ordering
string
Response
200

200
application/json
List of payment orders

​
status
string
Example:
"success"

​
message
string
Example:
"Operation successful"

​
data
object
The actual response data (e.g., ReceiveAddressResponse, etc.)

example 

curl --request GET \
  --url https://api.paycrest.io/v1/sender/orders \
  --header 'API-Key: <api-key>'

  response 

  {
  "status": "success",
  "message": "Operation successful",
  "data": {
    "totalRecords": 123,
    "page": 123,
    "pageSize": 123,
    "orders": [
      {
        "id": "<string>",
        "amount": 123,
        "amountPaid": 123,
        "amountReturned": 123,
        "token": "<string>",
        "senderFee": 123,
        "transactionFee": 123,
        "rate": 123,
        "network": "base",
        "gatewayId": "<string>",
        "recipient": {
          "institution": "<string>",
          "accountIdentifier": "<string>",
          "accountName": "<string>",
          "memo": "<string>",
          "providerId": "<string>",
          "metadata": {},
          "currency": "<string>"
        },
        "fromAddress": "<string>",
        "returnAddress": "<string>",
        "receiveAddress": "<string>",
        "feeAddress": "<string>",
        "reference": "<string>",
        "createdAt": "2023-11-07T05:31:56Z",
        "updatedAt": "2023-11-07T05:31:56Z",
        "txHash": "<string>",
        "status": "<string>",
        "transactionLogs": [
          {
            "id": "<string>",
            "gateway_id": "<string>",
            "status": "<string>",
            "tx_hash": "<string>",
            "created_at": "2023-11-07T05:31:56Z"
          }
        ]
      }
    ]
  }
}

Response

{
  "status": "success",
  "message": "Operation successful",
  "data": {
    "totalRecords": 123,
    "page": 123,
    "pageSize": 123,
    "orders": [
      {
        "id": "<string>",
        "amount": 123,
        "amountPaid": 123,
        "amountReturned": 123,
        "token": "<string>",
        "senderFee": 123,
        "transactionFee": 123,
        "rate": 123,
        "network": "base",
        "gatewayId": "<string>",
        "recipient": {
          "institution": "<string>",
          "accountIdentifier": "<string>",
          "accountName": "<string>",
          "memo": "<string>",
          "providerId": "<string>",
          "metadata": {},
          "currency": "<string>"
        },
        "fromAddress": "<string>",
        "returnAddress": "<string>",
        "receiveAddress": "<string>",
        "feeAddress": "<string>",
        "reference": "<string>",
        "createdAt": "2023-11-07T05:31:56Z",
        "updatedAt": "2023-11-07T05:31:56Z",
        "txHash": "<string>",
        "status": "<string>",
        "transactionLogs": [
          {
            "id": "<string>",
            "gateway_id": "<string>",
            "status": "<string>",
            "tx_hash": "<string>",
            "created_at": "2023-11-07T05:31:56Z"
          }
        ]
      }
    ]
  }
}




Get Payment Order by ID
GET
/
sender
/
orders
/
{id}

Try it
Retrieve a payment order by its unique ID.
Authorizations
​
API-Key
stringheaderrequired
Path Parameters
​
id
stringrequired
Response
200

200
application/json
Payment order

​
status
string
Example:
"success"

​
message
string
Example:
"Operation successful"

​
data
object
The actual response data (e.g., ReceiveAddressResponse, etc.)

example 

curl --request GET \
  --url https://api.paycrest.io/v1/sender/orders/{id} \
  --header 'API-Key: <api-key>'

Response

{
  "status": "success",
  "message": "Operation successful",
  "data": {
    "id": "<string>",
    "amount": 123,
    "amountPaid": 123,
    "amountReturned": 123,
    "token": "<string>",
    "senderFee": 123,
    "transactionFee": 123,
    "rate": 123,
    "network": "base",
    "gatewayId": "<string>",
    "recipient": {
      "institution": "<string>",
      "accountIdentifier": "<string>",
      "accountName": "<string>",
      "memo": "<string>",
      "providerId": "<string>",
      "metadata": {},
      "currency": "<string>"
    },
    "fromAddress": "<string>",
    "returnAddress": "<string>",
    "receiveAddress": "<string>",
    "feeAddress": "<string>",
    "reference": "<string>",
    "createdAt": "2023-11-07T05:31:56Z",
    "updatedAt": "2023-11-07T05:31:56Z",
    "txHash": "<string>",
    "status": "<string>",
    "transactionLogs": [
      {
        "id": "<string>",
        "gateway_id": "<string>",
        "status": "<string>",
        "tx_hash": "<string>",
        "created_at": "2023-11-07T05:31:56Z"
      }
    ]
  }
}


Get Lock Payment Order Status
GET
/
orders
/
{chain_id}
/
{id}

Try it
Get the status of a lock payment order.
Path Parameters
​
chain_id
stringrequired
​
id
stringrequired
Response
200

200
application/json
Order status

​
status
string
Example:
"success"

​
message
string
Example:
"Operation successful"

​
data
object
The actual response data (e.g., ReceiveAddressResponse, etc.)

example 

curl --request GET \
  --url https://api.paycrest.io/v1/orders/{chain_id}/{id}

Response

{
  "status": "success",
  "message": "Operation successful",
  "data": {
    "orderId": "<string>",
    "amount": 123,
    "token": "<string>",
    "network": "base",
    "settlePercent": 123,
    "status": "<string>",
    "txHash": "<string>",
    "settlements": [
      {
        "splitOrderId": "<string>",
        "amount": 123,
        "rate": 123,
        "orderPercent": 123
      }
    ],
    "txReceipts": [
      {
        "status": "<string>",
        "txHash": "<string>",
        "timestamp": "2023-11-07T05:31:56Z"
      }
    ],
    "updatedAt": "2023-11-07T05:31:56Z"
  }
}

Get Sender Stats
GET
/
sender
/
stats

Try it
Retrieve statistics for the sender.
Authorizations
​
API-Key
stringheaderrequired
Response
200

200
application/json
Sender stats

​
status
string
Example:
"success"

​
message
string
Example:
"Operation successful"

​
data
object
The actual response data (e.g., ReceiveAddressResponse, etc.)

Example 
curl --request GET \
  --url https://api.paycrest.io/v1/sender/stats \
  --header 'API-Key: <api-key>'

Response
{
  "status": "success",
  "message": "Operation successful",
  "data": {
    "totalOrders": 123,
    "totalOrderVolume": "<string>",
    "totalFeeEarnings": "<string>"
  }
}