import sys
from PIL import Image

def process_logo():
    try:
        img = Image.open('public/logo.png').convert('RGBA')
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    width, height = img.size
    pixels = img.load()
    
    # 1. Flood fill to find the background mask (approximate)
    bg_mask = [[False]*height for _ in range(width)]
    queue = [(0,0), (width-1,0), (0,height-1), (width-1,height-1)]
    for start in queue:
        if not bg_mask[start[0]][start[1]]:
            q = [start]
            while q:
                x, y = q.pop(0)
                r, g, b, a = pixels[x, y]
                if max(r,g,b) < 50 and not bg_mask[x][y]:
                    bg_mask[x][y] = True
                    for dx, dy in [(0,1), (1,0), (0,-1), (-1,0)]:
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < width and 0 <= ny < height and not bg_mask[nx][ny]:
                            if max(pixels[nx,ny][:3]) < 50:
                                bg_mask[nx][ny] = True
                                q.append((nx, ny))
                                
    # 2. Find the bounding box of the "gtt DATA" text.
    tx_min_x, tx_max_x = width, 0
    tx_min_y, tx_max_y = height, 0
    for y in range(height):
        for x in range(width):
            if not bg_mask[x][y]:
                r, g, b, a = pixels[x, y]
                if r < 30 and g < 30 and b < 30:
                    if x < tx_min_x: tx_min_x = x
                    if x > tx_max_x: tx_max_x = x
                    if y < tx_min_y: tx_min_y = y
                    if y > tx_max_y: tx_max_y = y
                    
    pad = 5
    tx_min_x = max(0, tx_min_x - pad)
    tx_max_x = min(width - 1, tx_max_x + pad)
    tx_min_y = max(0, tx_min_y - pad)
    tx_max_y = min(height - 1, tx_max_y + pad)
    
    # 3. Process every pixel
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Inside text bounding box -> make black text white
            if tx_min_x <= x <= tx_max_x and tx_min_y <= y <= tx_max_y:
                blackness = 255 - max(r, g, b)
                pixels[x, y] = (min(255, r + blackness), min(255, g + blackness), min(255, b + blackness), 255)
            else:
                # Outside text -> un-premultiply to extract foreground from black background
                intensity = max(r, g, b)
                if intensity == 0:
                    pixels[x, y] = (0, 0, 0, 0)
                else:
                    nr = min(255, int(r * 255 / intensity))
                    ng = min(255, int(g * 255 / intensity))
                    nb = min(255, int(b * 255 / intensity))
                    pixels[x, y] = (nr, ng, nb, intensity)

    img.save('public/logo.png')
    print("Logo processed flawlessly.")

if __name__ == '__main__':
    process_logo()
