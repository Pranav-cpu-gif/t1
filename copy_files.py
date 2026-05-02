import shutil

try:
    shutil.copyfile(r"c:\Desktop\Bizness Traker v2\index.html", r"c:\Desktop\Bizness Traker\index.html")
    shutil.copyfile(r"c:\Desktop\Bizness Traker v2\app.js", r"c:\Desktop\Bizness Traker\app.js")
    shutil.copyfile(r"c:\Desktop\Bizness Traker - Copy\style.css", r"c:\Desktop\Bizness Traker\style.css")
    print("Files copied successfully.")
except Exception as e:
    print(f"Error: {e}")
