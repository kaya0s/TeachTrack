
from sqlalchemy import create_engine, text

# Database URL from .env
DB_URL = "mysql+pymysql://root:kayaos@localhost/capstone_db"
engine = create_engine(DB_URL)

def update_logos():
    logo_url = "https://scontent.fcgy3-1.fna.fbcdn.net/v/t39.30808-6/306961662_483766030436150_1471875407590209753_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=1d70fc&_nc_eui2=AeFrVbg3dJeZt45tPD31pktJMMDpNr0CgYYwwOk2vQKBhjSR3oYPQn8vwzxv-0pESjyTVwBoNWx4A5FuECd1ZKNs&_nc_ohc=LSDuTsmCT_IQ7kNvwGoVG6n&_nc_oc=AdnRHoYjtZXIE9C92PrYOZlc2e-QSe6A1mvAD84BgED30xPmhu40zpfB58YdjTEDL3U&_nc_zt=23&_nc_ht=scontent.fcgy3-1.fna&_nc_gid=iaanDqE6P_iNMIGQYytF7A&_nc_ss=8&oh=00_AfxABUWU3b7HMuieQqGwJgZTa7ismz_UlJJdcLE7NAqE0g&oe=69B26AE5"
    
    try:
        with engine.connect() as conn:
            print("Updating college logos...")
            conn.execute(text("UPDATE colleges SET logo_path = :logo"), {"logo": logo_url})
            conn.commit()
            print("Update complete.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_logos()
