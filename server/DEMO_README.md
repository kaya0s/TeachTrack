# 🎬 Demo Mode Setup - Video Input Testing

## 🎯 Purpose
Test your app with **video input** instead of webcam for demo purposes. **No core code changes required!**

---

## 📋 Quick Setup (5 minutes)

### 1. **Place Your Video File**
```bash
# Copy your video to one of these locations:
# - server/demo_video.mp4 (recommended)
# - server/videos/your_video.mp4  
# - ~/Videos/your_video.mp4
# - ~/Desktop/your_video.mp4
cp "path/to/your/video.mp4" "c:\Users\kayaos\Desktop\CAPSTONE\server\demo_video.mp4"
```

### 2. **Set Video Path (Optional)**
```bash
# Windows (Command Prompt)
set DEMO_VIDEO_PATH=path/to/your/video.mp4

# Windows (PowerShell)
$env:DEMO_VIDEO_PATH="path/to/your/video.mp4"

# Or use default filename "demo_video.mp4"
```

### 3. **Start Server**
```bash
cd c:\Users\kayaos\Desktop\CAPSTONE\server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. **Test in Flutter App**
- Open Flutter app
- Start **EXAM mode** session
- **Your video will be used as input!**

---

## 🎬 What Happens During Demo

### **Video Input Instead of Webcam**
- Your video file plays continuously in a loop
- **Real YOLO detection** processes each frame (not simulated!)
- Actual behavior patterns detected from video content
- Same detection logic as production webcam mode

### **Real Phone Detections**
- **Video frames are analyzed** by the YOLO model
- **Actual phone usage** in your video triggers alerts
- **Real snapshots** uploaded with detection boxes
- **Evidence appears** in Flutter monitoring screen

### **Alert System**
- Phone alerts trigger based on **actual detections** in video
- Snapshots upload every 30 seconds (cooldown)
- Evidence appears in Flutter monitoring screen
- **EXAM mode** includes detection bounding boxes

---

## 📱 Expected Demo Flow

```
🎬 Video plays → 📱 Phone detected → 📸 Snapshot uploaded → 🚨 Alert triggered → 📱 Evidence shown
```

### **In Flutter App You'll See:**
1. **Live monitoring** with video-based metrics
2. **Phone alerts** appearing periodically
3. **Detection snapshots** showing phone boxes
4. **Alert list** with thumbnail images

---

## ⚙️ Configuration

### **Video Settings**
```bash
# Environment variable (optional)
DEMO_VIDEO_PATH="your_video.mp4"        # Your video file path

# Default locations checked (in order):
# - server/demo_video.mp4
# - server/videos/demo_video.mp4
# - ~/Videos/demo_video.mp4
# - ~/Desktop/demo_video.mp4
```

### **Demo API Endpoints**
New demo endpoints available at `http://localhost:8000/api/v1/demo/`:
- `POST /detector/start/{session_id}` - Start demo video detector
- `POST /detector/stop/{session_id}` - Stop demo detector  
- `GET /detector/status/{session_id}` - Get detector status
- `GET /video/info` - Get video information
- `POST /video/reset` - Reset video to beginning
- `POST /cleanup` - Clean up resources

### **Detection Behavior**
- **Real YOLO model** processes video frames
- **Activity mode support** (LECTURE, COLLABORATION, EXAM)
- **Snapshot uploads** for phone detections
- **Video loops** automatically when reaching end
- **Same intervals** as production (configurable)

---

## 🎯 Demo Scenario Example

### **Video Content Ideas:**
- Classroom lecture footage
- Students with phones
- Any video with people
- Even test patterns work!

### **What to Demonstrate:**
1. **Phone detection accuracy**
2. **Snapshot evidence collection**
3. **Alert timing and cooldowns**
4. **Flutter monitoring interface**
5. **Cloudinary image storage**

---

## 🔧 Troubleshooting

### **❌ "Demo video not found"**
```bash
# Solution: Place video in one of these locations:
# - server/demo_video.mp4 (recommended)
# - server/videos/your_video.mp4
# - ~/Videos/your_video.mp4
# - ~/Desktop/your_video.mp4

# Or set environment variable:
set DEMO_VIDEO_PATH=full\path\to\your\video.mp4
```

### **❌ "Failed to open demo video"**
- Check video format (MP4, AVI, MOV supported)
- Ensure video file is not corrupted
- Verify file permissions

### **❌ "No detections triggered"**
- Ensure video contains people/objects visible to YOLO
- Check detection confidence thresholds in settings
- Verify YOLO model is loaded correctly

### **❌ "Server not responding"**
```bash
# Restart server after demo setup
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **❌ "Demo detector not starting"**
- Check server logs for error messages
- Verify demo video is accessible
- Ensure session ID is valid

---

## 🚀 Advanced Demo Options

### **Custom Detection Patterns**
Edit `create_demo_behavior_log()` in `demo_video_service.py`:
```python
# Custom phone detection pattern
return BehaviorLogCreate(
    on_task=20,
    using_phone=10,  # More phones!
    sleeping=2,
    off_task=3
)
```

### **Multiple Videos**
Create different demo scenarios:
- `cheating_video.mp4` - High phone usage
- `normal_video.mp4` - Low phone usage
- `test_video.mp4` - Specific test cases

---

## 📊 Demo Benefits

### **✅ No Core Code Changes**
- Original detector service untouched
- Safe for production testing
- Easy to enable/disable

### **✅ Realistic Testing**
- Actual video input processing
- Real alert generation
- Live snapshot uploads

### **✅ Repeatable Results**
- Consistent demo every time
- Predictable phone detections
- Reliable evidence collection

### **✅ Professional Presentation**
- Smooth demo flow
- Clear evidence display
- Impressive functionality showcase

---

## 🎉 Success Indicators

### **Demo Working When:**
- ✅ Video plays continuously
- ✅ Phone alerts appear in Flutter
- ✅ Snapshots show in monitoring screen
- ✅ Cloudinary dashboard shows images
- ✅ Alert cooldowns work properly

### **Ready for Presentation When:**
- ✅ Smooth video playback
- ✅ Timely phone detections
- ✅ Clear evidence images
- ✅ Responsive Flutter interface

---

## 🔄 Cleanup

### **Disable Demo Mode**
```bash
# Switch back to main branch to use webcam
git checkout main
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Clean Demo Resources** (while on demo branch)
```bash
# Call cleanup API endpoint
curl -X POST http://localhost:8000/api/v1/demo/cleanup
```

### **Remove Demo Files** (optional)
```bash
# Remove demo video (if needed)
rm server/demo_video.mp4
```

---

## 🎬 Demo Tips

1. **Choose engaging video** - Clear phone usage visible
2. **Test detection first** - Check if YOLO detects objects in your video
3. **Prepare Flutter app** - Have it ready to start session
4. **EXAM mode recommended** - Shows full detection capabilities
5. **Check video length** - Longer videos provide more demo time

**Your demo will showcase the complete detection system using real video input!** 🚀
