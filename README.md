npm i

node index.js

#send-message-personal

curl --location 'http://localhost:3000/send-message' \
--header 'Content-Type: application/json' \
--data '{
    "number": "nomor telepon",
    "message": "Halo, ieu pesen ti API!"
}
'

#masih ada bug pada pesan grup.
##send-message-grup

curl --location 'http://localhost:3000/send-group-message' \
--header 'Content-Type: application/json' \
--data '{
    "groupName": "nama grup",
    "message": "Halo, ieu pesen ti API ka grup!"
}
'
