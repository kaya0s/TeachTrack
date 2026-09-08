from pathlib import Path
import sys
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config"
CREDENTIALS_FILE = CONFIG_DIR / "credentials.json"
TOKEN_FILE = CONFIG_DIR / "token.json"


def main():
    if not CREDENTIALS_FILE.exists():
        print(f"[-] Error: OAuth client secrets file not found at: {CREDENTIALS_FILE}")
        print("Please download your OAuth client credentials JSON from Google Cloud Console,")
        print(f"save it to '{CREDENTIALS_FILE}', and run this script again.")
        sys.exit(1)

    print(f"[+] Found credentials file at: {CREDENTIALS_FILE}")
    print("[*] Launching browser for Google authentication...")

    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
        )
        creds = flow.run_local_server(port=0)

        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        with open(TOKEN_FILE, "w", encoding="utf-8") as token:
            token.write(creds.to_json())

        print(f"[+] Success! New token written to: {TOKEN_FILE}")
        print("[+] You can now run database backups using your user Google Drive account.")
    except Exception as e:
        print(f"[-] Authentication failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
