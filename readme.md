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
````
Copiar el archivo notFound_admin.html en el directorio /usr/share/nginx/html

Ingresar al archivo /etc/nginx/conf.d/casillaelectronica-admin.onpe.gob.pe.conf

Agregar la linea try_files $uri $uri/ = 404; en el location / {}

Agregar lo siguiente: 

error_page 404 /notFound_admin.html;
location = /notFound_admin.html {
  root /usr/share/nginx/html/;
  internal;
}
error_page 500 502 503 504 /50x.html;
location = /50x.html {
  root /usr/share/nginx/html/;
  internal;
}

Guardar y luego ejecutar:
sudo nginx -t
sudo systemctl restart nginx
```