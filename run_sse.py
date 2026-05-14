#!/usr/bin/env python3
"""Start the MCP server with SSE transport."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from server import mcp
print("Starting MCP SSE server on http://0.0.0.0:8000/sse", flush=True)
mcp.run(transport="sse")
