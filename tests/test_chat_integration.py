import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_integration_test():
    # Generate unique email
    import time
    email = f"test_integration_{int(time.time())}@example.com"
    username = f"user_{int(time.time())}"
    password = "SecurePassword123!"

    print(f"1. Registering new user: {email}...")
    reg_payload = {
        "name": "Integration Test User",
        "email": email,
        "password": password,
        "confirm_password": password,
        "username": username
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)
    if response.status_code != 201:
        print(f"Registration failed ({response.status_code}): {response.text}")
        return
        
    reg_data = response.json()
    verification_token = reg_data.get("verification_token")
    if not verification_token:
        print("No verification token returned.")
        return
        
    print(f"2. Verifying email using token: {verification_token[:15]}...")
    verify_payload = {"token": verification_token}
    response = requests.post(f"{BASE_URL}/api/v1/auth/verify-email", json=verify_payload)
    if response.status_code != 200:
        print(f"Email verification failed ({response.status_code}): {response.text}")
        return
        
    print("3. Logging in...")
    login_payload = {
        "identifier": email,
        "password": password
    }
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload)
    if response.status_code != 200:
        print(f"Login failed ({response.status_code}): {response.text}")
        return
        
    login_data = response.json()
    access_token = login_data["data"]["access_token"]
    print(f"Logged in successfully. Access token (first 15 chars): {access_token[:15]}")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print("\n4. Sending chat message to /api/chat...")
    chat_payload = {
        "message": "I have a sore throat, fever, and slight cough.",
        "history": []
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/chat", json=chat_payload, headers=headers, timeout=20)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        try:
            print(json.dumps(response.json(), indent=2))
        except Exception:
            print(response.text)
    except Exception as e:
        print("Error during API request:", e)

if __name__ == "__main__":
    run_integration_test()
