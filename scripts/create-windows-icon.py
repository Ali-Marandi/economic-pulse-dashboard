from pathlib import Path
from PIL import Image

source = Path("resources/economic-pulse-icon.png")
target = Path("resources/icon.ico")

with Image.open(source) as image:
    image = image.convert("RGBA")
    image.save(target, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

print(target)
