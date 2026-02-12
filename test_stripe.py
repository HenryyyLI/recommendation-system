# test_checkout_simple.py
import requests
import json

BASE_URL = "https://generous-tortoise-henry-org-78af1212.koyeb.app"

payload = {
    "clientId": "2820558652430377474",
    "items": [
        {
            "productId": "6407551567006884557",
            "name": "Wilson US Open Tennis Ball",
            "price": 31.74,
            "quantity": 2
        }
    ],
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
}

print(f"Testing: {BASE_URL}/api/v1/checkout/create-session")
print("=" * 60)

try:
    response = requests.post(
        f"{BASE_URL}/api/v1/checkout/create-session",
        json=payload,
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS!")
    else:
        print(f"\n❌ FAILED: {response.status_code}")
        
except Exception as e:
    print(f"❌ ERROR: {e}")