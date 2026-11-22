#!/bin/bash

# curl -X POST http://localhost:3000/api/auth/login \
#     -d '{"email": "test@mail.com", "password": "password1!"}' \
#     -H "Content-Type: application/json" \
#     -c cookies.txt

# curl -X GET http://localhost:3000/api/appointments/get-all \
#   -b cookies.txt

curl -X GET http://localhost:3000/api/users/get-by-token 
