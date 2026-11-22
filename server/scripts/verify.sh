#!/bin/bash



curl -X POST https://www.google.com/recaptcha/api/siteverify \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "secret=${SECRET}&response=${RESPONSE}"