import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Setup
cert_path = 'khanhub-5e552-firebase-adminsdk-fbsvc-6a7df175de.json'
if not os.path.exists(cert_path):
    # Try to extract from .env if possible, but let's assume it's there or we use a different way.
    # Actually, I can just use the project ID and let it use default credentials if running in a Google env,
    # but here I should use the service account if available.
    pass

# I'll try to read the .env.local to get the private key if the file is missing
private_key = None
with open('apps/web/.env.local', 'r') as f:
    for line in f:
        if 'FIREBASE_ADMIN_PRIVATE_KEY=' in line:
            private_key = line.split('=', 1)[1].strip().strip('"').replace('\\n', '\n')
            break

cred_dict = {
    "type": "service_account",
    "project_id": "khanhub-5e552",
    "private_key_id": "6a7df175de",
    "private_key": private_key,
    "client_email": "firebase-adminsdk-fbsvc@khanhub-5e552.iam.gserviceaccount.com",
    "client_id": "111111111111111111111",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40khanhub-5e552.iam.gserviceaccount.com"
}

cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("--- REHAB USERS ---")
users = db.collection('rehab_users').limit(5).get()
for user in users:
    print(f"ID: {user.id} | Data: {user.to_dict().get('customId')} | Role: {user.to_dict().get('role')}")

print("\n--- PATIENTS ---")
patients = db.collection('rehab_patients').limit(5).get()
for p in patients:
    print(f"ID: {p.id} | Name: {p.to_dict().get('name')}")
