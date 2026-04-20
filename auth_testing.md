# Auth Testing Playbook (Chaioz)

## Verify mongo
```
mongosh
use chaioz_db
db.users.findOne({role:"admin"})
db.users.getIndexes()
```

## API
```
API=https://late-night-chai-1.preview.emergentagent.com
curl -c c.txt -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@chaioz.com.au","password":"Chaioz@2026"}'
curl -b c.txt $API/api/auth/me
```
