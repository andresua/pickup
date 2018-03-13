 var AWS = require("aws-sdk")
  , region = "us-west-2";
var doc = require("dynamodb-doc");
var db;
var error = false;
try {
    if(AWS.DynamoDB.DocumentClient) {
        AWS.config.update({
          region: region
          //,
          //endpoint: "http://localhost:8000"
        });
        db = new AWS.DynamoDB.DocumentClient();
    } 
} catch(e) {
   console.log(e); 
   error = true;
}

if(error || !AWS.DynamoDB.DocumentClient) {
    doc.config.update({
      region: region
      //,
      //endpoint: "http://localhost:8000"
    });
    db = doc.DynamoDB.DocumentClient();
}

var dynamodb = new AWS.DynamoDB();

exports.handler = function(event, context, callback){
    console.log(event);
    switch (event.httpMethod) {
        case 'GET':
            try {
            db.scan({ 
                      ReturnConsumedCapacity: "TOTAL", 
                      TableName: "PickUp"
                     }, function(err, data) {
                        if(err) {
                            console.log(err);
                            callback(null, {
                                  statusCode: 500,
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({"error" : err})
                            });
                        } else {
                            console.log(data);
                            callback(null, {
                                  statusCode: 200,
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(data.Items)
                            });
                        }
                  });
            } catch (error) {
                console.log(error);
                callback(null, {
                      statusCode: 500,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({"error" : error})
                });
            }
            
            break;     
        case 'POST':
            console.log(event);
           console.log(context);
            
            var body = event.body ? JSON.parse(event.body) : {};
            
            if(body.correlationId) {
                db.query({
                          TableName: "PickUp",
                          IndexName: "correlationId-index",
                          KeyConditionExpression: "correlationId = :v1",
                          ExpressionAttributeValues: {
                                ":v1": body.correlationId
                            }
                         }, function(err, data) {
                            if(err) {
                                console.log(err);
                                callback(null, {
                                      statusCode: 500,
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({"error" : err})
                                });
                            } else {
                                console.log(data);
                                var origin;
                                try {
                                    origin = JSON.parse(data.origin);
                                } catch (e) {
                                    console.log(e);
                                }
                                data.Items.forEach((data) => {
                                    switch(data.estado) {
                                        case 'ENVIAR DIRECCION':
                                            data.estado = 'DEVOLVER CLIENTE ENVIO DIRECCION';
                                            db.update({
                                                      Key: {
                                                          "ID": data.ID
                                                      },
                                                      UpdateExpression: "set estado = :estado",
                                                      ExpressionAttributeValues: { 
                                                            ":estado": {"S": "DEVOLVER CLIENTE ENVIO DIRECCION"}
                                                      },
                                                      TableName: "PickUp"
                                                     }, function(err, data2) {
                                                        if(err) {
                                                            console.log(err);
                                                            callback(null, {
                                                                  statusCode: 500,
                                                                  headers: { "Content-Type": "application/json" },
                                                                  body: JSON.stringify({"error" : err})
                                                            });
                                                        } else {
                                                            console.log(data2);
                                                            callback(null, {
                                                                  statusCode: 200,
                                                                  headers: { "Content-Type": "application/json" },
                                                                  body: JSON.stringify({
                                                                      "status": 200,
                                                                      "mensaje": {
                                                                          "compensation": "success"
                                                                      }
                                                                  })
                                                            });
                                                        }
                                                  });
                                            break;
                                        default:
                                            callback(null, {
                                                  statusCode: 500,
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({"data" : data, "message": "STATE UNRECOGNIZED: " + data.state})
                                            });
                                            
                                    }
                                });
                            }
                      });
            } else {
                body.correlationId = "-1";
                callback(null, {
                              statusCode: 500,
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({"data" : body, "message": "NO CORRELATION ID FOUND"})
                        });
            }
            break;    
        default:
            callback(null, {
                  statusCode: 400,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({"resp":`Unsupported method "${event.httpMethod}"`})
            });
    }
   
};