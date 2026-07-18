TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXEwb3QxYnEwMDB5b3dkbWYxa2xhMXUyIiwicm9sZSI6IkFETUlOIiwib3JnYW5pemF0aW9uSWQiOiJPUkctODc4ODYiLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3ODQzODg3NTEsImV4cCI6MTc4NDM5NTk1MX0.9OjeQdSZ5J7aei3OIauWXUlMhGK5t8FKKRIGmnvJl6U"
BASE_URL="https://zyoris.onrender.com"

echo "1. GET /permission-matrix"
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/permission-matrix | head -c 500
echo "\n"

echo "2. GET /permission-matrix/templates"
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/permission-matrix/templates | head -c 500
echo "\n"
