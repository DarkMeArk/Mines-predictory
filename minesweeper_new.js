document.addEventListener('DOMContentLoaded', function() {
    // Game configuration
    const DEFAULT_BOARD_SIZE = 5;  // Default 5x5 grid (standard for bet939)
    let boardSize = DEFAULT_BOARD_SIZE;
    let totalMines = 17;  // Default mine count for bet939
    let gameBoard = [];
    let safeTiles = 8;  // Default safe tiles (25 total - 17 mines)
    
    // UI Elements
    const gameBoardElement = document.getElementById('gameBoard');
    const minesCountInput = document.getElementById('minesCountInput');
    const minesDisplay = document.getElementById('minesDisplay');
    const safeTilesDisplay = document.getElementById('safeTilesDisplay');
    const analyzeButton = document.getElementById('analyzeButton');
    const clearButton = document.getElementById('clearButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const analysisResults = document.getElementById('analysisResults');
    const restartGameButton = document.getElementById('restartGameButton');
    const verifySeedButton = document.getElementById('verifySeedButton');
    const currentSeedDisplay = document.getElementById('currentSeedDisplay');
    const verifyFairButton = document.getElementById('verifyFairButton');
    const serverSeedInput = document.getElementById('serverSeedInput');
    const clientSeedInput = document.getElementById('clientSeedInput');
    const nonceInput = document.getElementById('nonceInput');
    const verificationResultsContainer = document.getElementById('verificationResultsContainer');
    const autoPredictButton = document.getElementById('autoPredictButton');
    const autoPredictStatus = document.getElementById('autoPredictStatus');
    const toggleOverlayModeButton = document.getElementById('toggleOverlayMode');
    const previousGamesContainer = document.getElementById('previousGamesContainer');
    
    // State variables
    let isAutoPredictionEnabled = false;
    let isOverlayMode = false;
    let autoRefreshIntervalId = null;
    let lastExtractedSeed = null;
    
    // Game state constants
    const UNKNOWN = -1;
    const MINE = -2;
    const FLAG = -3;
    const EMPTY = 0;
    
    // Initialize the game
    initializeBoard();
    
    // Load any previous game data
    loadPreviousGames();
    
    // Hide loading spinner initially
    loadingSpinner.style.display = 'none';
    
    // Event listeners
    minesCountInput.addEventListener('change', function() {
        totalMines = parseInt(this.value);
        if (totalMines < 2) totalMines = 2;
        if (totalMines > 20) totalMines = 20;
        this.value = totalMines;
        updateMineDisplay();
    });
    
    document.getElementById('decreaseMines').addEventListener('click', function() {
        if (totalMines > 2) {
            totalMines--;
            minesCountInput.value = totalMines;
            updateMineDisplay();
        }
    });
    
    document.getElementById('increaseMines').addEventListener('click', function() {
        if (totalMines < 20) {
            totalMines++;
            minesCountInput.value = totalMines;
            updateMineDisplay();
        }
    });
    
    analyzeButton.addEventListener('click', function() {
        analyzeBoard(false);
    });
    
    clearButton.addEventListener('click', function() {
        initializeBoard();
        renderBoard();
        analysisResults.innerHTML = '';
        verificationResultsContainer.innerHTML = '<p class="text-muted">No verification performed yet</p>';
    });
    
    restartGameButton.addEventListener('click', function() {
        window.open('https://bet939.bet/casino/game/mines', '_blank');
    });
    
    verifySeedButton.addEventListener('click', function() {
        let extractedSeed = extractSeedFromGameInterface();
        if (extractedSeed) {
            serverSeedInput.value = extractedSeed.serverSeed || '';
            clientSeedInput.value = extractedSeed.clientSeed || '';
            nonceInput.value = extractedSeed.nonce || '';
            
            // Auto-verify if we have a server seed
            if (extractedSeed.serverSeed) {
                verifyProvablyFair(false);
            }
        } else {
            alert('Could not extract seed information. Please enter it manually.');
        }
    });
    
    verifyFairButton.addEventListener('click', function() {
        verifyProvablyFair(false);
    });
    
    autoPredictButton.addEventListener('click', function() {
        if (isAutoPredictionEnabled) {
            disableAutoPrediction();
        } else {
            enableAutoPrediction();
        }
    });
    
    toggleOverlayModeButton.addEventListener('click', function() {
        toggleOverlayMode();
    });
    
    // Function to update mines display
    function updateMineDisplay() {
        minesDisplay.textContent = totalMines;
        safeTiles = boardSize * boardSize - totalMines;
        safeTilesDisplay.textContent = safeTiles;
    }
    
    // Initialize the game board
    function initializeBoard() {
        gameBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(UNKNOWN));
        renderBoard();
        updateMineDisplay();
    }
    
    // Render the game board to the DOM
    function renderBoard() {
        gameBoardElement.innerHTML = '';
        gameBoardElement.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
        
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';
                cellDiv.dataset.row = row;
                cellDiv.dataset.col = col;
                
                updateCellAppearance(cellDiv, row, col);
                
                cellDiv.addEventListener('click', function() {
                    cycleCell(row, col);
                });
                
                gameBoardElement.appendChild(cellDiv);
            }
        }
    }
    
    // Update the appearance of a cell based on its state
    function updateCellAppearance(cellDiv, row, col) {
        const cellState = gameBoard[row][col];
        
        // Reset classes
        cellDiv.className = 'cell';
        cellDiv.innerHTML = '';
        
        if (cellState === UNKNOWN) {
            cellDiv.classList.add('unknown');
            cellDiv.innerHTML = '<span class="cellContent">?</span>';
        } else if (cellState === MINE || cellState === FLAG) {
            cellDiv.classList.add('mine');
            cellDiv.innerHTML = '<span class="cellContent">💣</span>';
        } else if (cellState >= 0) {  // Revealed cell (number or empty)
            cellDiv.classList.add('revealed');
            if (cellState > 0) {
                cellDiv.innerHTML = `<span class="cellContent">${cellState}</span>`;
                cellDiv.classList.add(`num-${cellState}`);
            } else {
                cellDiv.innerHTML = '<span class="cellContent">💎</span>';
            }
        }
    }
    
    // Update all cells on the board
    function updateAllCells() {
        const cells = gameBoardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            updateCellAppearance(cell, row, col);
        });
    }
    
    // Cycle through cell states when clicked
    function cycleCell(row, col) {
        const currentState = gameBoard[row][col];
        if (currentState === UNKNOWN) {
            gameBoard[row][col] = MINE;  // First click: mark as mine
        } else if (currentState === MINE) {
            gameBoard[row][col] = EMPTY;  // Second click: mark as empty (safe)
        } else if (currentState === EMPTY) {
            gameBoard[row][col] = 1;  // Third click: number 1
        } else if (currentState >= 1 && currentState < 8) {
            gameBoard[row][col] = currentState + 1;  // Increment number
        } else {
            gameBoard[row][col] = UNKNOWN;  // Reset to unknown
        }
        
        // Update the cell in the DOM
        const cellDiv = gameBoardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellDiv) {
            updateCellAppearance(cellDiv, row, col);
        }
    }
    
    // Toggle a specific cell between unknown and mine
    function toggleMine(row, col) {
        if (gameBoard[row][col] === UNKNOWN) {
            gameBoard[row][col] = MINE;
        } else if (gameBoard[row][col] === MINE) {
            gameBoard[row][col] = UNKNOWN;
        }
        
        // Update the cell in the DOM
        const cellDiv = gameBoardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellDiv) {
            updateCellAppearance(cellDiv, row, col);
        }
    }
    
    // Analyze the current board state
    function analyzeBoard(autoMode = false) {
        if (!autoMode) {
            // Show loading spinner and disable button
            loadingSpinner.style.display = 'inline-block';
            analyzeButton.disabled = true;
        }
        
        // Prepare data to send to backend
        const data = {
            boardSize: boardSize,
            boardState: gameBoard,
            totalMines: totalMines
        };
        
        // Send the board state to the backend for analysis
        fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayAnalysisResults(data.safeMoves, data.probabilityMap, autoMode);
            } else {
                if (!autoMode) {
                    analysisResults.innerHTML = `<div class="alert alert-danger">Error: ${data.error}</div>`;
                }
            }
        })
        .catch(error => {
            if (!autoMode) {
                analysisResults.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            }
        })
        .finally(() => {
            if (!autoMode) {
                // Hide loading spinner and enable button
                loadingSpinner.style.display = 'none';
                analyzeButton.disabled = false;
            }
        });
    }
    
    // Display the analysis results on the page
    function displayAnalysisResults(safeMoves, probabilityMap, autoMode = false) {
        if (!autoMode) {
            // Clear previous results
            analysisResults.innerHTML = '';
            
            // Create results section
            const resultsDiv = document.createElement('div');
            
            // Display safe moves if any
            if (safeMoves && safeMoves.length > 0) {
                const safeMovesDiv = document.createElement('div');
                safeMovesDiv.className = 'alert alert-success';
                
                const safeMovesTitle = document.createElement('h5');
                safeMovesTitle.textContent = '100% Safe Moves:';
                safeMovesDiv.appendChild(safeMovesTitle);
                
                const movesList = document.createElement('div');
                movesList.className = 'd-flex flex-wrap gap-2 mt-2';
                
                safeMoves.forEach(move => {
                    const moveBtn = document.createElement('button');
                    moveBtn.className = 'btn btn-sm btn-outline-success';
                    moveBtn.textContent = `Row ${move[0]+1}, Col ${move[1]+1}`;
                    moveBtn.addEventListener('click', () => {
                        highlightCell(move[0], move[1]);
                    });
                    movesList.appendChild(moveBtn);
                });
                
                safeMovesDiv.appendChild(movesList);
                resultsDiv.appendChild(safeMovesDiv);
            } else {
                const noSafeMovesDiv = document.createElement('div');
                noSafeMovesDiv.className = 'alert alert-warning';
                noSafeMovesDiv.textContent = 'No 100% safe moves found. Check the probability map for best options.';
                resultsDiv.appendChild(noSafeMovesDiv);
            }
            
            // Display probability map
            const probMapTitle = document.createElement('h5');
            probMapTitle.className = 'mt-3';
            probMapTitle.textContent = 'Mine Probability Map:';
            resultsDiv.appendChild(probMapTitle);
            
            // Add probability statistics
            const probStats = document.createElement('div');
            probStats.className = 'd-flex justify-content-between mb-2';
            
            // Count mines based on probability
            const mineCount = countMinesProbability(probabilityMap);
            probStats.innerHTML = `
                <span>Estimated mines: ${mineCount.toFixed(1)} (Target: ${totalMines})</span>
                <span>Safe tiles: ${countSafeTiles(probabilityMap)}</span>
            `;
            resultsDiv.appendChild(probStats);
            
            // Display the probability map
            displayProbabilityMap(probabilityMap, resultsDiv);
            
            // Add to the page
            analysisResults.appendChild(resultsDiv);
        }
        
        // Highlight cells on the game board based on probability
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cell = gameBoardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                
                // Only update unknown cells
                if (gameBoard[row][col] === UNKNOWN && cell) {
                    // Remove previous highlights
                    cell.classList.remove('safe-move', 'likely-safe', 'uncertain', 'likely-mine', 'definite-mine');
                    
                    // Add probability-based classes
                    const prob = probabilityMap[row][col];
                    if (prob === 0) {
                        cell.classList.add('safe-move');
                    } else if (prob < 0.25) {
                        cell.classList.add('likely-safe');
                    } else if (prob < 0.5) {
                        cell.classList.add('uncertain');
                    } else if (prob < 0.75) {
                        cell.classList.add('likely-mine');
                    } else {
                        cell.classList.add('definite-mine');
                    }
                }
            }
        }
        
        // If in auto mode and we have 100% safe moves, highlight them
        if (autoMode && safeMoves && safeMoves.length > 0) {
            // Find the safest move (first in the list)
            const safeMove = safeMoves[0];
            highlightCell(safeMove[0], safeMove[1]);
            
            // Show notification
            showNotification(`Safe move found: Row ${safeMove[0]+1}, Col ${safeMove[1]+1}`);
        }
    }
    
    // Count mines based on probability map
    function countMinesProbability(probabilityMap) {
        let sum = 0;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                // Only count unknown cells
                if (gameBoard[row][col] === UNKNOWN) {
                    sum += probabilityMap[row][col];
                }
            }
        }
        return sum;
    }
    
    // Count definitely safe tiles
    function countSafeTiles(probabilityMap) {
        let count = 0;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                // Count revealed cells and 100% safe cells
                if (gameBoard[row][col] >= 0 || (gameBoard[row][col] === UNKNOWN
