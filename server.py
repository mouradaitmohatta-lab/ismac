#!/usr/bin/env python3
import os
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import datetime
from docx_generator import (
    generate_bon_decharge_standard, 
    generate_decharge_detaillee, 
    generate_pv_affectation
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
if not os.path.exists(HISTORY_FILE):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

class RequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            index_path = os.path.join(TEMPLATES_DIR, "index.html")
            with open(index_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        if path.startswith("/static/"):
            rel_path = path[len("/static/"):]
            file_path = os.path.join(STATIC_DIR, rel_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.serve_file(file_path)
                return

        if path.startswith("/output/"):
            rel_path = urllib.parse.unquote(path[len("/output/"):])
            file_path = os.path.join(OUTPUT_DIR, rel_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.serve_file(file_path, is_download=True)
                return

        if path == "/api/inventory":
            inv_path = os.path.join(DATA_DIR, "inventory.json")
            with open(inv_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        if path == "/api/beneficiaries":
            ben_path = os.path.join(DATA_DIR, "beneficiaries.json")
            with open(ben_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        if path == "/api/history":
            with open(HISTORY_FILE, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        self.send_error(404, "Page Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"
        
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception:
            payload = {}

        if path == "/api/inventory":
            inv_path = os.path.join(DATA_DIR, "inventory.json")
            with open(inv_path, "r", encoding="utf-8") as f:
                items = json.load(f)
            items.append(payload)
            with open(inv_path, "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False, indent=2)
            
            res_data = json.dumps({"success": True}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(res_data)))
            self.end_headers()
            self.wfile.write(res_data)
            return

        if path == "/api/generate":
            doc_type = payload.get("doc_type", "audiovisuel")
            beneficiary = payload.get("beneficiary", "BENEFICIAIRE")
            date_str = payload.get("date", datetime.datetime.now().strftime("%d/%m/%Y"))
            motif = payload.get("motif", "")
            lieu = payload.get("lieu", "")
            items = payload.get("items", [])

            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
            doc_num = f"{len(history) + 1:02d} / 2026"

            safe_ben = "".join([c if c.isalnum() else "_" for c in beneficiary])
            safe_type = doc_type.upper()
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ISMAC_Decharge_{safe_type}_{safe_ben}_{timestamp}.docx"
            out_filepath = os.path.join(OUTPUT_DIR, filename)

            if doc_type in ("audiovisuel", "informatique"):
                doc = generate_bon_decharge_standard(doc_type, beneficiary, date_str, items, doc_num)
            elif doc_type == "detaillee":
                doc = generate_decharge_detaillee(beneficiary, date_str, motif, items)
            elif doc_type == "pv_affectation":
                doc = generate_pv_affectation(beneficiary, date_str, motif, lieu, items, doc_num)
            else:
                doc = generate_bon_decharge_standard("audiovisuel", beneficiary, date_str, items, doc_num)

            doc.save(out_filepath)

            record = {
                "id": f"REC-{timestamp}",
                "doc_number": doc_num,
                "doc_type": doc_type,
                "beneficiary": beneficiary,
                "date": date_str,
                "items_count": len(items),
                "items": items,
                "filename": filename,
                "file_url": f"/output/{urllib.parse.quote(filename)}",
                "created_at": datetime.datetime.now().isoformat()
            }
            history.append(record)
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(history, f, ensure_ascii=False, indent=2)

            res = json.dumps({
                "success": True,
                "filename": filename,
                "file_url": f"/output/{urllib.parse.quote(filename)}",
                "doc_number": doc_num
            }).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(res)))
            self.end_headers()
            self.wfile.write(res)
            return

        self.send_error(404, "Endpoint not found")

    def serve_file(self, path, is_download=False):
        ext = os.path.splitext(path)[1].lower()
        mime_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pdf": "application/pdf"
        }
        content_type = mime_types.get(ext, "application/octet-stream")

        with open(path, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        if is_download:
            filename = os.path.basename(path)
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(content)

def run(port=8080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f"Server running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    run(port=port)
