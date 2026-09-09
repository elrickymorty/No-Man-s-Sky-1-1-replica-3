import http.server, socketserver

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('0.0.0.0', 8080), H) as httpd:
    print('NMS replica serving on 0.0.0.0:8080', flush=True)
    httpd.serve_forever()
