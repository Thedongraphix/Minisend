B2C API is an API used to make payments from a Business to Customers (Pay Outs), also known as Bulk Disbursements. B2C API is used in several scenarios by businesses that require to either make Salary Payments, Cashback payments, Promotional Payments(e.g. betting winning payouts), winnings, financial institutions withdrawal of funds, loan disbursements, etc.

Each scenario has its unique characteristics, but all lie under the B2C API category. Below is the B2C flow of transactions.


 

B2C API transaction process flow
The Merchant (Partner) sets all the required parameters the request and sends it to: https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest
API Management platform receives the request validates, authorizes and authenticates the partner to access the API, sends to M-PESA and an acknowledgement back to the Merchant(Partner).
M-PESA receives the request, validates the initiator details and processes the request.
M-PESA then sends the response back to the Merchant (partner) via the callback URL specified in your request.
M-PESA sends an SMS notification to the customer on the payments received.
NOTE: For you to use this API on production you are required to apply for a Bulk Disbursement Account and get a Short code, you cannot do this payment from a Pay Bill or Buy Goods (Till Number). To apply for a Bulk disbursement account follow this link. https://www.safaricom.co.ke/business/sme/m-pesa-payment-solutions

Important Information
Initiator Username: this is the API operator's username as set on the portal when the user was created. For Sandbox users, the username is already created and assigned to them and is available on the test credentials page  as InitiatorName.

Initiator Password: this is the password assigned to the API operator after being created by the Business Administrator. For Sandbox users, this is available as InitiatorPassword on the test credentials page . Note: the password should be limited to specific special characters such as '#', '&', '%' and '$'. Other characters might cause issues, and the password may not be accepted. For example, using a '(' or ')' character will not be accepted. In addition, '@' is not a special character on M-Pesa; it is treated as a normal character.

Public Key Certificate: this is the certificate used to encrypt the Initiator's plaintext password for use in the API calls. This is provided for both Sandbox and Production clients on the portal. You need to learn how to encrypt using your API language to be able to make API calls or find a way to encrypt beforehand and set the password as a static variable on the API call. The test credentials section offers the capability to encrypt your password.

Request Body
{    
   "OriginatorConversationID": "feb5e3f2-fbbc-4745-844c-ee37b546f627",
   "InitiatorName": "testapi",
   "SecurityCredential":"EsJocK7+NjqZPC3I3EO+TbvS+xVb9TymWwaKABoaZr/Z/n0UysSs..",
   "CommandID":"BusinessPayment",
   "Amount":"10"
   "PartyA":"600996",
   "PartyB":"254728762287"
   "Remarks":"here are my remarks",
   "QueueTimeOutURL":"https://mydomain.com/b2c/queue",
   "ResultURL":"https://mydomain.com/b2c/result",
   "Occassion":"Christmas"
}
Request Parameter Definition
Name

Description

Parameter Type

Sample Values

OriginatorConversationID

This is a unique string you specify for every API request you simulate.

String

16740-34861180-1

InitiatorName

This is an API user created by the Business Administrator of the M-PESA Bulk disbursement account that is active and authorized to initiate B2C transactions via API.

String

initiator_1

John_Doe

John Doe

SecurityCredential

This is the value obtained after encrypting the API initiator password. The password on Sandbox has been provisioned on the simulator. However, on production the password is created when the user is being created on the M-PESA organization portal.

Alpha-numeric

32SzVdmCvjpmQfw3X2RK8UAv7xuhh304dXxFC5+3l

slkk2TDJY/Lh6ESVwtqMxJzF7qA==

CommandID

This is a unique command that specifies B2C transaction type.

SalaryPayment: This supports sending money to both registered and unregistered M-Pesa customers.
BusinessPayment: This is a normal business to customer payment, supports only M-PESA registered customers.
PromotionPayment: This is a promotional payment to customers. The M-PESA notification message is a congratulatory message. Supports only M-PESA registered customers.
Alphanumeric

SalaryPayment
BusinessPayment
PromotionPayment
Amount

The amount of money being sent to the customer.

Number

30671

PartyA

This is the B2C organization shortcode from which the money is sent from.

Number

Shortcode (5-6 digits) e.g. 123454

PartyB

This is the customer mobile number to receive the amount. - The number should have the country code (254) without the plus sign.

Phone number

Customer mobile number: 254722000000

Remarks

Any additional information to be associated with the transaction.

String

Sentence of up to 100 characters.

QueueTimeOutURL

This is the URL to be specified in your request that will be used by API Proxy to send notification incase the payment request is timed out while awaiting processing in the queue.

URL

https://ip or domain:port/path

ResultURL

This is the URL to be specified in your request that will be used by M-PESA to send notification upon processing of the payment request.

URL

https://ip or domain: port/path

Occassion

Any additional information to be associated with the transaction.

Alpha-numeric

Sequence of characters up to 100

Response Body
This is a synchronous notification sent out as soon as the request has been authorized, authenticated and accepted for processing. The response parameters are defined below.

{    
 "ConversationID": "AG_20191219_00005797af5d7d75f652",    
 "OriginatorConversationID": "16740-34861180-1",    
 "ResponseCode": "0",    
 "ResponseDescription": "Accept the service request successfully."
}
Response Parameter Definition
Name

Description

Parameter Type

Sample Value

OriginatorConversationID

This is a global unique identifier for the transaction request returned by the API proxy upon successful request submission.

String

AG_2376487236_126732989KJHJKH

ConversationID

This is a global unique identifier for the transaction request returned by the M-PESA upon successful request submission.

String

236543-276372-2

ResponseDescription

This is the description of the request submission status.

String

Accept the service request successfully

Error Response Body
This is a synchronous notification sent out as soon as the request has failed to go through. The response parameters are defined below

{    
   "requestId": "11728-2929992-1",
   "errorCode": "401.002.01",
   "errorMessage": "Error Occurred - Invalid Access Token - BJGFGOXv5aZnw90KkA4TDtu4Xdyf"
}
Error Response Parameter Definition
Name

Description

Parameter Type

Possible Values

requestId

This is a unique requestID for the payment request

String

16813-15-1

errorCode

This is a predefined code that indicates the reason for a request failure. This is defined in the Response Error Details below. The error codes map to specific error messages as illustrated in the Response Error Details below.

String

404.001.04

errorMessage

This is a short descriptive message of the failure reason.

String

Invalid Access Token
Results Body
Below is a sample results notification sent when a B2C payment request was not successful. Always note the ResultCode and ResultDesc whenever you receive an error. Follow this link for detailed error listing.

{
 "Result": {
    "ResultType": 0,
    "ResultCode": 2001,
    "ResultDesc": "The initiator information is invalid.",
    "OriginatorConversationID": "29112-34801843-1",
    "ConversationID": "AG_20191219_00006c6fddb15123addf",
    "TransactionID": "NLJ0000000",
    "ReferenceData": {
      "ReferenceItem": {
          "Key": "QueueTimeoutURL",
          "Value": "https:\/\/internalsandbox.safaricom.co.ke\/mpesa\/b2cresults\/v1\/submit"
        }
    }
 }
}
Results Parameter Definition
The below parameters will be returned whether the request was successful or not.

Parameter

Description

Element Type

Sample Value

Result

This is the root parameter that encloses the entire result message.

JSON Object

"Result":{ }

ConversationId

This is a global unique identifier for the transaction request returned by the M-PESA upon successful request submission.

String

236543-276372-2

OriginatorConversationID

This is a global unique identifier for the transaction request returned by the API proxy upon successful request submission.

String

AG_2376487236_126732989KJHJKH

ResultDesc

This is a message from the API that gives the status of the request processing and usually maps to a specific result code value.

String



Service request is has been accepted successfully
Initiator information is invalid
ResultType

This is a status code that indicates whether the transaction was already sent to your listener. Usual value is 0.

Number

0

ResultCode

This is a numeric status code that indicates the status of the transaction processing. 0 means success and any other code means an error occurred or the transaction failed.

Number

0, 2001


TransactionID

This is a unique M-PESA transaction ID for every payment request. Same value is sent to customer over SMS upon successful processing.

String

LHG31AA5TX


Successful B2C Result
{    
   "Result": {
      "ResultType": 0,
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.", 
      "OriginatorConversationID": "10571-7910404-1",
      "ConversationID": "AG_20191219_00004e48cf7e3533f581",
      "TransactionID": "NLJ41HAY6Q",
      "ResultParameters": {
         "ResultParameter": [
          {
             "Key": "TransactionAmount",
             "Value": 10
          },
          {
             "Key": "TransactionReceipt",
             "Value": "NLJ41HAY6Q"
          },
          {
             "Key": "B2CRecipientIsRegisteredCustomer",
             "Value": "Y"
          },
          {
             "Key": "B2CChargesPaidAccountAvailableFunds",
             "Value": -4510.00
          },
          {
             "Key": "ReceiverPartyPublicName",
             "Value": "254708374149 - John Doe"
          },
          {
             "Key": "TransactionCompletedDateTime",
             "Value": "19.12.2019 11:45:50"
          },
          {
             "Key": "B2CUtilityAccountAvailableFunds",
             "Value": 10116.00
          },
          {
             "Key": "B2CWorkingAccountAvailableFunds",
             "Value": 900000.00
          }
        ]
      },
      "ReferenceData": {
         "ReferenceItem": {
            "Key": "QueueTimeoutURL",
            "Value": "https:\/\/internalsandbox.safaricom.co.ke\/mpesa\/b2cresults\/v1\/submit"
          }
      }
   }
}
Successful Results Parameter Definition
Name

Description

Parameter Type

Sample Value

ResultParameters

This is a JSON object that holds more details for the transaction.

JSON Object

"Result":{

          "ResultParameters":{
}
}

ResultParameter

This is a JSON array within the ResultParameters that holds additional transaction details as JSON objects.

JSON Object



        "ResultParameters":{
        "ResultParameter":[
]
}}

TransactionReceipt

This is a unique M-PESA transaction ID for every payment request. The same value is sent to a customer over SMS upon successful processing. It is usually returned under the ResultParameter array.

String

LHG31AA5TX

TransactionAmount

This is the amount that is transacted. It is also returned under the ResultParameter array.

Number

100

B2CWorkingAccountAvailableFunds

This is the available balance of the Working account under the B2C shortcode used in the transaction.

Decimal

2000.0

B2CUtilityAccountAvailableFunds

This is the available balance of the Utility account under the B2C shortcode used in the transaction.

Decimal

23654.5


TransactionCompletedDateTime

This is the date and time that the transaction completed M-PESA.

String

01.08.2018 16:12:12


ReceiverPartyPublicName

This is the name and phone number of the customer who received the payment.

String

254722000000 - Safaricom PLC


B2CChargesPaidAccountAvailableFunds

This is the available balance of the Charges Paid account under the B2C shortcode used in the transaction.

Decimal

236543.9


B2CRecipientIsRegisteredCustomer

This is a key that indicates whether the customer is a M-PESA registered customer or not.

Character

"Y" for Yes

"N" for No

