import numpy as np
import logging

# Constants for board cell states
UNKNOWN = -1
MINE = -2
FLAG = -3
EMPTY = 0
# 1-8 are number of mines surrounding the cell

def analyze_board(board, board_size):
    """
    Analyze the current state of the Minesweeper board and return safe moves.
    
    Args:
        board (numpy.ndarray): The current state of the board
        board_size (int): The size of the board (n x n)
        
    Returns:
        tuple: (safe_moves, probability_map)
            - safe_moves: list of (row, col) tuples representing safe cells
            - probability_map: 2D array with mine probabilities (0-1) for each cell
    """
    logging.debug(f"Analyzing board of size {board_size}x{board_size}")
    
    if not isinstance(board, np.ndarray):
        board = np.array(board)
    
    # Initialize probability map (0 = safe, 1 = mine, -1 = unknown)
    probability_map = np.full((board_size, board_size), -1.0)
    
    # Mark known mines and safe cells in probability map
    for row in range(board_size):
        for col in range(board_size):
            if board[row, col] == MINE or board[row, col] == FLAG:
                probability_map[row, col] = 1.0  # Definite mine
            elif board[row, col] >= 0:  # Revealed cell (number or empty)
                probability_map[row, col] = 0.0  # Definite safe
    
    # Find safe moves using constraint satisfaction
    safe_moves = find_safe_moves(board, board_size)
    
    # Update probability map with calculated probabilities
    probability_map = calculate_probabilities(board, probability_map, board_size)
    
    # Mark identified safe moves in probability map
    for row, col in safe_moves:
        probability_map[row, col] = 0.0
    
    logging.debug(f"Found {len(safe_moves)} safe moves")
    return safe_moves, probability_map

def get_neighbors(row, col, board_size):
    """Get all valid neighboring cells around a given cell."""
    neighbors = []
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            if dr == 0 and dc == 0:
                continue
            r, c = row + dr, col + dc
            if 0 <= r < board_size and 0 <= c < board_size:
                neighbors.append((r, c))
    return neighbors

def find_safe_moves(board, board_size):
    """
    Identify safe moves using logical constraints.
    A cell is safe if all mines around a numbered cell are accounted for.
    """
    safe_moves = []
    
    for row in range(board_size):
        for col in range(board_size):
            # Skip if cell is not a number (1-8)
            if not 1 <= board[row, col] <= 8:
                continue
            
            # Get all neighbors of this cell
            neighbors = get_neighbors(row, col, board_size)
            
            # Count flagged neighbors and unknown neighbors
            flagged_count = sum(1 for r, c in neighbors if board[r, c] == FLAG or board[r, c] == MINE)
            unknown_neighbors = [(r, c) for r, c in neighbors if board[r, c] == UNKNOWN]
            
            # Case 1: All mines accounted for - any remaining unknown neighbors are safe
            if flagged_count == board[row, col] and unknown_neighbors:
                safe_moves.extend(unknown_neighbors)
            
            # Case 2: Number of unknown cells equals remaining mines - all unknown neighbors are mines
            # (we don't mark these as safe, but we could flag them)
            
    return list(set(safe_moves))  # Remove duplicates

def calculate_probabilities(board, probability_map, board_size):
    """
    Calculate probabilities of mines for uncertain cells based on neighboring information.
    This is a simplified probability calculation that doesn't account for global constraints.
    """
    for row in range(board_size):
        for col in range(board_size):
            # Skip if not a numbered cell
            if not 1 <= board[row, col] <= 8:
                continue
            
            neighbors = get_neighbors(row, col, board_size)
            unknown_neighbors = [(r, c) for r, c in neighbors if board[r, c] == UNKNOWN]
            
            if not unknown_neighbors:
                continue
                
            # Count confirmed mines around this cell
            confirmed_mines = sum(1 for r, c in neighbors if board[r, c] == FLAG or board[r, c] == MINE)
            
            # Calculate remaining mines
            remaining_mines = board[row, col] - confirmed_mines
            
            # If valid, assign uniform probability to unknown cells
            if 0 <= remaining_mines <= len(unknown_neighbors):
                prob = remaining_mines / len(unknown_neighbors)
                for r, c in unknown_neighbors:
                    # Only update if current value is -1 (unknown) or the new probability is lower
                    if probability_map[r, c] == -1 or (probability_map[r, c] > prob and prob > 0):
                        probability_map[r, c] = prob
    
    # Replace any remaining -1 values with a default probability
    remaining_unknown = (probability_map == -1)
    if np.any(remaining_unknown):
        # Use a default of 0.5 for completely unknown cells
        probability_map[remaining_unknown] = 0.5
        
    return probability_map
