## Requirements
```
NodeJS 12.x
```

## Install dependecies and plugins
```
npm install
```

## Test cors
```
curl -I -X OPTIONS \
  -H "Origin: http://example.com" \
  -H 'Access-Control-Request-Method: GET' \
  http://api.com/ 2>&1 | grep 'Access-Control-Allow-Origin'
```
