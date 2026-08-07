import os
import urllib.request
from PIL import Image

def remove_white_bg(img_path, output_path, tolerance=220):
    try:
        img = Image.open(img_path).convert("RGBA")
        datas = img.getdata()
        newData = []
        for item in datas:
            # Check if pixel is close to white
            if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
                # Replace with transparent
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Processed: {output_path}")
    except Exception as e:
        print(f"Error processing {img_path}: {e}")

counter_url = "https://tse3.mm.bing.net/th/id/OIP.R_FDJYeveZn7KIwRkuH4ugHaHa?rs=1&pid=ImgDetMain&o=7&rm=3"
gate_url = "https://img.freepik.com/premium-photo/cartoon-style-house-entrance-with-wood-door_977285-13176.jpg?w=2000"
washroom_path = "frontend/public/assets/washroom.png"

# Download
print("Downloading counter...")
urllib.request.urlretrieve(counter_url, "counter_temp.jpg")
print("Downloading gate...")
urllib.request.urlretrieve(gate_url, "gate_temp.jpg")

# Process
os.makedirs("frontend/public/assets", exist_ok=True)
remove_white_bg("counter_temp.jpg", "frontend/public/assets/counter_transparent.png")
remove_white_bg("gate_temp.jpg", "frontend/public/assets/gate_transparent.png")

if os.path.exists(washroom_path):
    print("Processing washroom...")
    remove_white_bg(washroom_path, "frontend/public/assets/washroom_transparent.png")

# Cleanup
if os.path.exists("counter_temp.jpg"): os.remove("counter_temp.jpg")
if os.path.exists("gate_temp.jpg"): os.remove("gate_temp.jpg")
print("Done!")
