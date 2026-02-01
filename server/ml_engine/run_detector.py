from ultralytics import YOLO
import cv2
import requests
import time
import os

# CONFIGURATION
API_URL = os.getenv("API_V1_STR", "http://127.0.0.1:8000/api/v1")
MODEL_PATH = "ml_engine/weights/best.pt" 
CONFIDENCE_THRESHOLD = 0.5
INTERVAL_SECONDS = 3

def run_detection():
    print("🎥 CAPSTONE CLASSROOM BEHAVIOR DETECTOR v1.0")
    print("---------------------------------------------")

    try:
        sid_input = input(f"Enter Active Session ID (default: 1): ").strip()
        SESSION_ID = int(sid_input) if sid_input else 1
    except ValueError:
        print("❌ Invalid ID. Using default: 1")
        SESSION_ID = 1

    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model file not found at {MODEL_PATH}")
        print("Please place your trained 'best.pt' inside ml_engine/weights/")
        return

    print(f"Loading model from {MODEL_PATH}...")
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    print("Opening webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Could not open webcam.")
        return

    print(f"✅ Starting detection loop for SESSION {SESSION_ID}...")
    print("Press 'q' in the video window to stop.")

    last_send_time = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret: 
                print("Failed to read frame")
                break

            # Run Inference
            results = model(frame, verbose=False) # verbose=False to keep stdout clean
            
            # Visualize (Optional - shows bounding boxes on screen)
            annotated_frame = results[0].plot()
            cv2.imshow("Classroom Behavior Detection", annotated_frame)
            
            # Only send data every INTERVAL_SECONDS
            current_time = time.time()
            if current_time - last_send_time >= INTERVAL_SECONDS:
                
                # --- Aggregate Counts ---
                # We map the model's class names to our schema keys.
                # Schema keys: raising_hand, sleeping, writing, using_phone, attentive
                # We assume your model classes match these names loosely or exactly.
                
                counts = {
                    "raising_hand": 0, 
                    "sleeping": 0, 
                    "writing": 0, 
                    "using_phone": 0, 
                    "attentive": 0, 
                    "undetected": 0
                }
                
                # Iterate detections
                for box in results[0].boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    if conf < CONFIDENCE_THRESHOLD:
                        continue
                        
                    class_name = model.names[cls_id]
                    
                    # Normalize class name to match our keys (lowercase, replace spaces)
                    # e.g. "Raising Hand" -> "raising_hand"
                    normalized_name = class_name.lower().replace(" ", "_")
                    
                    if normalized_name in counts:
                        counts[normalized_name] += 1
                    else:
                        print(f"⚠️ Warning: Detected class '{class_name}' not in schema.")

                # Send to Backend
                payload = counts
                try:
                    # Sending asynchronously-ish (requests is sync but we are in a loop)
                    endpoint = f"{API_URL}/sessions/{SESSION_ID}/log"
                    response = requests.post(endpoint, json=payload)
                    
                    if response.status_code == 200:
                        print(f"✅ Sent: {payload}")
                    elif response.status_code == 404:
                         print(f"❌ Session {SESSION_ID} not found or inactive. Please create a new session.")
                    else:
                         print(f"❌ Error {response.status_code}: {response.text}")
                         
                except Exception as e:
                    print(f"Connection Error: {e}")

                last_send_time = current_time

            # Exit on 'q'
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("Stopping...")
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    run_detection()
