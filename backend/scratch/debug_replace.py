with open("frontend/src/pages/ChatConversations.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Substituir imagem normal
old_image = 'alt="Imagem" \n                                                                    className="rounded-lg max-w-full h-auto max-h-60 object-contain'
new_image = 'alt="Imagem" \n                                                                    loading="lazy"\n                                                                    className="rounded-lg max-w-full h-auto max-h-60 object-contain'

if old_image in content:
    content = content.replace(old_image, new_image)
    print("Imagem normal substituída!")
else:
    # Tentar com CRLF
    old_image_crlf = old_image.replace("\n", "\r\n")
    new_image_crlf = new_image.replace("\n", "\r\n")
    if old_image_crlf in content:
        content = content.replace(old_image_crlf, new_image_crlf)
        print("Imagem normal substituída (CRLF)!")

# 2. Substituir sticker
old_sticker = 'alt="Sticker" \n                                                                    className="w-32 h-32 object-contain"'
new_sticker = 'alt="Sticker" \n                                                                    loading="lazy"\n                                                                    className="w-32 h-32 object-contain"'

if old_sticker in content:
    content = content.replace(old_sticker, new_sticker)
    print("Sticker substituído!")
else:
    old_sticker_crlf = old_sticker.replace("\n", "\r\n")
    new_sticker_crlf = new_sticker.replace("\n", "\r\n")
    if old_sticker_crlf in content:
        content = content.replace(old_sticker_crlf, new_sticker_crlf)
        print("Sticker substituído (CRLF)!")

with open("frontend/src/pages/ChatConversations.jsx", "w", encoding="utf-8") as f:
    f.write(content)
