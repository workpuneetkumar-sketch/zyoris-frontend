TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXJxaXZrcmwwMDRyOTJycTY3MjR6b2czIiwicm9sZSI6IkFETUlOIiwib3JnYW5pemF0aW9uSWQiOm51bGwsInRva2VuVHlwZSI6ImFjY2VzcyIsImlhdCI6MTc4NDM4ODU2MCwiZXhwIjoxNzg0Mzk1NzYwfQ.KoFk4nJkVMeHz-NwxDfUOoDYBWMn7mTfoE5SjZ8pcC8"
BASE_URL="https://zyoris.onrender.com"

echo "1. GET /permission-matrix"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" $BASE_URL/permission-matrix
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/permission-matrix | head -c 200
echo "\n"

echo "2. GET /permission-matrix/templates"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" $BASE_URL/permission-matrix/templates
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/permission-matrix/templates | head -c 200
echo "\n"

# I need a roleId. Let's get it from /admin/roles or /roles or /permission-matrix
# The /permission-matrix returns { matrix: [ { roleId: ... } ] }
