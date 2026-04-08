#!/usr/bin/env python3
"""
Simple HTTP server for viewing HTML files in the browser.

Usage:
    python html_editor_server.py [--port PORT] [--type TYPE]

Example:
    python html_editor_server.py --port 8000 --type generate_preview
    python html_editor_server.py --port 8000 --type populate_site_template
"""

import argparse
import http.server
import socketserver
import os
from pathlib import Path


class HTMLHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that serves HTML file directly."""

    def __init__(self, *args, html_file_path=None, **kwargs):
        self.html_file_path = html_file_path
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/" or self.path == "/index.html":
            # Serve the HTML file content
            self.serve_html_content()
        else:
            # Serve other files normally
            super().do_GET()

    def serve_html_content(self):
        """Serve the HTML file content."""
        if not self.html_file_path or not os.path.exists(self.html_file_path):
            self.send_error(404, "HTML file not found")
            return

        with open(self.html_file_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # Inject JavaScript to fix modal interaction issues
        # This allows closing the modal by clicking the backdrop
        fix_script = """
<script>
(function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalFix);
    } else {
        initModalFix();
    }

    function initModalFix() {
        const modal = document.getElementById('announcementModal');
        const backdrop = modal ? modal.querySelector('.announcement-modal-backdrop') : null;

        if (modal && backdrop) {
            // Close modal when clicking backdrop
            backdrop.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
    }
})();
</script>
"""

        # Inject the script before the closing </body> tag
        if "</body>" in html_content:
            html_content = html_content.replace("</body>", fix_script + "</body>")
        else:
            # If no </body> tag, append to end
            html_content += fix_script

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(html_content.encode())


def create_handler(html_file_path):
    """Create a handler class with the HTML file path."""

    class Handler(HTMLHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, html_file_path=html_file_path, **kwargs)

    return Handler


def main():
    """Main function to start the server."""
    parser = argparse.ArgumentParser(
        description="Start simple HTTP server for viewing HTML files"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run the server on (default: 8000)",
    )
    parser.add_argument(
        "--type",
        type=str,
        choices=["generate_preview", "populate_site_template", "crown_of_beauty"],
        default="generate_preview",
        help="Type of HTML file to serve: 'generate_preview', 'populate_site_template', or 'crown_of_beauty' (default: generate_preview)",
    )
    args = parser.parse_args()

    # Get the directory of this script
    script_dir = Path(__file__).parent

    # Map type to file path
    file_mapping = {
        "generate_preview": script_dir / "generate_preview_complete_example.html",
        "populate_site_template": script_dir
        / "populate_site_template_complete_example.html",
        "crown_of_beauty": script_dir
        / "crown_of_beauty"
        / "crown_of_beauty_complete_example.html",
    }

    html_file_path = file_mapping[args.type]

    if not html_file_path.exists():
        print(f"Error: HTML file not found: {html_file_path}")
        print(f"Available files in {script_dir}:")
        for f in script_dir.rglob("*.html"):
            print(f"  - {f.relative_to(script_dir)}")
        return

    # Change to the script directory to serve files
    os.chdir(script_dir)

    # Create handler with HTML file path
    Handler = create_handler(str(html_file_path))

    # Start server
    with socketserver.TCPServer(("", args.port), Handler) as httpd:
        print(f"🚀 Server started!")
        print(f"📁 Serving: {html_file_path.name}")
        print(f"🌐 Open in browser: http://localhost:{args.port}/")
        print(f"\nPress Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")


if __name__ == "__main__":
    main()
