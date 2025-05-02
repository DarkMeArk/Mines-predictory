import os
import logging
import hashlib
import hmac
import json
from flask import Flask, render_template, request, jsonify, send_file
import numpy as np
from minesweeper_solver import analyze_board

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")

@app.route('/')
def index():
    """Render the main page of the application."""
    return render_template('index.html')

@app.route('/android')
def android():
    """Render the Android download page."""
    return render_template('android.html')

@app.route('/download-android-apk')
def download_apk():
    """Provide direct download link for the Android APK."""
    # Serve the APK file from the static directory
    apk_path = os.path.join(app.static_folder, 'apk', 'mines_predictor_v1.0.0.apk')
    
    # Check if the APK file exists
    if not os.path.exists(apk_path):
        return render_template('download.html', error="APK file not found. Please check back later.")
    
    return send_file(
        apk_path, 
        as_attachment=True,
        download_name='MinesPredictor-v1.0.0.apk',
        mimetype='application/vnd.android.package-archive'
    )

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze the current state of the Minesweeper board and return safe moves."""
    try:
        data = request.get_json()
        board_size = data.get('boardSize', 9)
        board_state = data.get('boardState', [])
        
        # Convert board state to a numpy array for analysis
        board_array = np.array(board_state)
        
        # Analyze the board to find safe moves
        safe_moves, probability_map = analyze_board(board_array, board_size)
        
        return jsonify({
            'success': True,
            'safeMoves': safe_moves,
            'probabilityMap': probability_map.tolist() if isinstance(probability_map, np.ndarray) else probability_map
        })
    except Exception as e:
        logging.error(f"Error analyzing board: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/verify-provably-fair', methods=['POST'])
def verify_provably_fair():
    """Verify a provably fair seed and determine mine positions."""
    try:
        data = request.get_json()
        server_seed = data.get('serverSeed', '')
        client_seed = data.get('clientSeed', '')
        nonce = data.get('nonce', '0')
        board_size = data.get('boardSize', 5)
        total_mines = data.get('totalMines', 17)
        
        if not server_seed:
            return jsonify({
                'success': False,
                'error': 'Server seed is required'
            }), 400
        
        # Create combined seed string (this format might vary by platform)
        seed_string = f"{server_seed}:{client_seed}:{nonce}"
        
        # Generate SHA-256 hash of the seed
        hash_obj = hashlib.sha256(seed_string.encode())
        hash_hex = hash_obj.hexdigest()
        
        # Use the hash to determine mine positions
        mine_positions = []
        total_cells = board_size * board_size
        
        # Use chunks of the hash to generate positions
        chunk_size = 5  # Each chunk gives us a 20-bit number
        chunks = [hash_hex[i:i+chunk_size] for i in range(0, len(hash_hex), chunk_size)]
        
        for chunk in chunks:
            if len(mine_positions) >= total_mines:
                break
                
            # Convert hex chunk to integer
            value = int(chunk, 16)
            # Map to a position on the board
            position = value % total_cells
            row = position // board_size
            col = position % board_size
            
            # Add if not already in the list
            if (row, col) not in mine_positions:
                mine_positions.append((row, col))
        
        # Create initial board state with all mines placed
        board = np.full((board_size, board_size), -1)  # -1 represents unknown
        for row, col in mine_positions:
            board[row, col] = -2  # -2 represents a mine
        
        return jsonify({
            'success': True,
            'minePositions': mine_positions,
            'boardState': board.tolist()
        })
    except Exception as e:
        logging.error(f"Error verifying provably fair seed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
