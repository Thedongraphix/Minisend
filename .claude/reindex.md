Reindex Transaction
GET
/
reindex
/
{network}
/
{tx_hash}

Try it
Reindex a transaction by network and transaction hash.
Path Parameters
​
network
stringrequired
​
tx_hash
stringrequired
Response
200

200
application/json
Transaction reindexed

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

Show child attributes


EXample 

curl --request GET \
  --url https://api.paycrest.io/v1/reindex/{network}/{tx_hash}

Result

{
  "status": "success",
  "message": "Operation successful",
  "data": {
    "events": {
      "Transfer": 123,
      "OrderCreated": 123,
      "OrderSettled": 123,
      "OrderRefunded": 123
    }
  }
}