import http.server
import socketserver
import webbrowser
from pathlib import Path
import sys
import select
import threading
import asyncio
import websockets
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os

# Configuration
PORT = 8000
WS_PORT = 8001
DIRECTORY = Path(__file__).parent.parent

# Global set to store WebSocket connections
connected_clients = set()

# Global variables to track servers
http_server = None
ws_server = None

class FileChangeHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        if event.is_directory:
            return
        # Ignore temporary files and Python cache
        if event.src_path.endswith('.tmp') or '__pycache__' in event.src_path:
            return
        print(f"\nFile changed: {event.src_path}")
        asyncio.run(broadcast_reload())

async def broadcast_reload():
    if connected_clients:
        await asyncio.gather(
            *[ws.send(json.dumps({"command": "reload"})) for ws in connected_clients]
        )

async def websocket_handler(websocket):
    try:
        connected_clients.add(websocket)
        print(f"\nNew client connected. Total clients: {len(connected_clients)}")
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print(f"\nClient disconnected. Total clients: {len(connected_clients)}")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_GET(self):
        # Add handling for JSON files
        if self.path.endswith('.json'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            try:
                with open(str(DIRECTORY / self.path.lstrip('/')), 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404)
            return

        # Add handling for audio files
        if self.path.endswith(('.mp3', '.wav', '.ogg')):
            self.send_response(200)
            self.send_header('Content-type', f'audio/{self.path.split(".")[-1]}')
            self.end_headers()
            try:
                with open(str(DIRECTORY / self.path.lstrip('/')), 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404)
            return

        # Add handling for image files
        if self.path.endswith(('.jpg', '.jpeg', '.png', '.gif')):
            self.send_response(200)
            self.send_header('Content-type', f'image/{self.path.split(".")[-1]}')
            self.end_headers()
            try:
                with open(str(DIRECTORY / self.path.lstrip('/')), 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404)
            return

        if self.path.endswith('.js'):
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.end_headers()
            try:
                with open(str(DIRECTORY / self.path.lstrip('/')), 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404)
            return
            
        if self.path.endswith(('.html', '')):
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            # Handle root path
            file_path = self.path.lstrip('/')
            if not file_path:
                file_path = 'index.html'
            
            try:
                with open(str(DIRECTORY / file_path), 'rb') as f:
                    content = f.read().decode('utf-8')
            except FileNotFoundError:
                content = "<html><body><h1>404 Not Found</h1></body></html>"
            
            reload_script = f'''
                <script>
                    (function() {{
                        const ws = new WebSocket('ws://localhost:{WS_PORT}');
                        ws.onmessage = function(event) {{
                            const data = JSON.parse(event.data);
                            if (data.command === 'reload') {{
                                // Save camera state before reload
                                const gameState = {{
                                    camera: {{
                                        position: {{
                                            x: window.game?.camera?.position?.x || 0,
                                            y: window.game?.camera?.position?.y || 1.6,
                                            z: window.game?.camera?.position?.z || 0
                                        }},
                                        rotation: {{
                                            x: window.game?.rotationX || 0,
                                            y: window.game?.rotationY || 0
                                        }}
                                    }}
                                }};
                                localStorage.setItem('gameState', JSON.stringify(gameState));
                                window.location.reload();
                            }}
                        }};
                        ws.onclose = function() {{
                            console.log('WebSocket connection closed. Retrying in 1s...');
                            setTimeout(() => window.location.reload(), 1000);
                        }};
                    }})();
                </script>
            '''
            
            if '</body>' in content:
                content = content.replace('</body>', f'{reload_script}</body>')
            else:
                content += reload_script
            
            self.wfile.write(content.encode('utf-8'))
        else:
            super().do_GET()

def check_keyboard_input():
    while True:
        if select.select([sys.stdin], [], [], 0.1)[0]:
            key = sys.stdin.read(1)
            if key.upper() == 'R':
                print("\nManual reload triggered...")
                asyncio.run(broadcast_reload())

async def start_websocket_server():
    global ws_server
    ws_server = await websockets.serve(websocket_handler, "localhost", WS_PORT)
    await asyncio.Future()  # run forever

def start_file_watcher():
    observer = Observer()
    observer.schedule(FileChangeHandler(), str(DIRECTORY), recursive=True)
    observer.start()
    return observer

def start_http_server():
    global http_server
    http_server = socketserver.TCPServer(("", PORT), Handler)
    print(f"\nHTTP Server started at http://localhost:{PORT}")
    print(f"WebSocket Server started at ws://localhost:{WS_PORT}")
    print("Press 'R' to reload or Ctrl+C to stop the server\n")
    
    # Open the browser automatically
    webbrowser.open(f"http://localhost:{PORT}")
    
    try:
        http_server.serve_forever()
    finally:
        http_server.server_close()

def cleanup_servers():
    global http_server, ws_server
    if http_server:
        print("\nClosing HTTP server...")
        http_server.shutdown()
        http_server.server_close()
    
    if ws_server:
        print("Closing WebSocket server...")
        # Create a new event loop for cleanup
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(ws_server.close())
        loop.close()

def main():
    try:
        # Start the file watcher
        observer = start_file_watcher()

        # Start the keyboard input thread
        input_thread = threading.Thread(target=check_keyboard_input, daemon=True)
        input_thread.start()

        # Start WebSocket server in a separate thread
        ws_thread = threading.Thread(
            target=lambda: asyncio.run(start_websocket_server()),
            daemon=True
        )
        ws_thread.start()

        # Start HTTP server in the main thread
        start_http_server()

    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"\nError: Port {PORT} or {WS_PORT} is already in use.")
            print("Please try different ports or stop the other server.")
        else:
            raise e
    finally:
        cleanup_servers()
        observer.stop()
        observer.join()

if __name__ == "__main__":
    main() 