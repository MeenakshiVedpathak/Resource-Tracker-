with open('public/logo.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the solid white background rectangle
content = content.replace('<rect width="200" height="100" fill="white"/>', '')

# Change all the dark grey text to white
content = content.replace('fill="#666666"', 'fill="white"')

with open('public/logo.svg', 'w', encoding='utf-8') as f:
    f.write(content)
    
print("SVG updated successfully!")
