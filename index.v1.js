;(() => {
    // Game State
    const BOARD_WIDTH = 5;
    const BOARD_HEIGHT = 4;
    const RED = 'red';
    const GREEN = 'green';
    const ACTIVE_COLOR = 'purple';
    const RED_COLOR = 'red';
    const GREEN_COLOR = 'green';

    let currentPlayer = {side: RED, color: RED_COLOR};
    let isTurning = false
    let didTurn = false;
    let activePiece = null;
    let moveInProgress = false;
    let powerSpent = 0;
    let possibleSteps = [];
    const boardState = Array.from({length: BOARD_HEIGHT}).map(() => Array.from({length: BOARD_WIDTH}));
    const DEFAULTS = {direction: 0, side: null, power: 3, piece: true, element: null}

    const redPieceDefaults = {...DEFAULTS, direction: 3, side: RED}
    const greenPieceDefaults = {...DEFAULTS, direction: 0, side: GREEN}

    boardState[0][0] = {...redPieceDefaults}
    boardState[0][2] = {...redPieceDefaults}
    boardState[0][4] = {...redPieceDefaults}

    boardState[boardState.length - 1][0] = {...greenPieceDefaults}
    boardState[boardState.length - 1][2] = {...greenPieceDefaults}
    boardState[boardState.length - 1][4] = {...greenPieceDefaults}

    
    // View
    
    const CELL_SIZE = 100 / BOARD_WIDTH - 2;
    const TOP_BUFFER = CELL_SIZE / 8;
    const SIDE_BUFFER = CELL_SIZE;
    const moveIndicator = document.querySelector('#moveindicator');
    const turnLabel = document.querySelector('#turnlabel');
    const turnLeft = document.querySelector('.turnbutton.left');
    const turnRight = document.querySelector('.turnbutton.right');
    const endTurn = document.querySelector('#end');
    turnLeft.addEventListener('click',() => {
        if (didTurn) return;
        if (!activePiece) return;
        isTurning = true;
        const [i, j] = activePiece[0];
        const state = boardState[i][j];
        state.direction -= 1;
        state.direction %= 6;
        if (state.direction < 0) {
            state.direction += 6;
        }
        activePiece[1].style.rotate = `${state.direction * 60}deg`
        render();
        calculateSteps(activePiece[0], state)
    })
    turnRight.addEventListener('click',() => {
        if (didTurn) return;
        if (!activePiece) return;
        isTurning = true;
        const [i, j] = activePiece[0];
        const state = boardState[i][j];
        state.direction += 1;
        state.direction %= 6;
        if (state.direction < 0) {
            state.direction += 6;
        }
        activePiece[1].style.rotate = `${state.direction * 60}deg`
        render();
        calculateSteps(activePiece[0], state)
    })
    endTurn.addEventListener('click',() => {
        didTurn = false;
        activePiece = null;
        moveInProgress = false;
        powerSpent = 0;
        possibleSteps = [];
        didTurn = false;
        isTurning = false;

        currentPlayer = currentPlayer.side === RED ? {side: GREEN, color: GREEN_COLOR} : {side: RED, color: RED_COLOR};
        moveIndicator.innerHTML = `Current Player: <span style="color: ${currentPlayer.color};" class="playerinfo">${currentPlayer.side}</span>`
        render();
    })

    const board = document.querySelector('#board');
    function centerTheBoard() {
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const cellSize = Math.min(winWidth, winHeight) / (BOARD_WIDTH);
        const boardSize = cellSize * BOARD_WIDTH;
        const margin = (winWidth - boardSize) / 2
        board.style.setProperty('--leftmargin', `${margin}px`)
    }
    centerTheBoard();
    let throttle = null;
    window.addEventListener('resize', () => {
        if (throttle) {
            cancelAnimationFrame(throttle);
            throttle = null;
        }
        throttle = requestAnimationFrame(() => {
            centerTheBoard();
            throttle = null;
        })
    })
    board.addEventListener('click', event => {

        let element = event.target;
        while (element) {
            if (element.classList?.contains('hexagon')) {
                break;
            }
            element = element.parentNode;
        }
        if (!element) return;
        let cellAddress = null;
        boardState.forEach((row, rIdx) => {
            row.forEach((cell, cIdx) => {
                if (cell.element === element) {
                    cellAddress = [rIdx, cIdx]
                }
            })
        })
        if (!cellAddress) return;
        move(cellAddress);
    })

    function render() {

        board.innerHTML = '';
        boardState.map((row, rowIdx) => {
            row.map((cellState, cellIdx) => {
                const cellEl = document.createElement('div');
                cellEl.classList.add('hexagon');

                const top = TOP_BUFFER + 
                            CELL_SIZE * 1.01547005 * rowIdx + 
                            ((cellIdx % 2) ? CELL_SIZE / 2 : 0);
                
                cellEl.style.setProperty('--top', `${top}vmin`);

                const left =    SIDE_BUFFER + 
                                CELL_SIZE * 0.875 * cellIdx
                cellEl.style.setProperty('--left', `${left}vmin`);

                const topSide = document.createElement('i');
                topSide.classList.add('side', 'piece', 'top')
                const leftSide = document.createElement('i');
                leftSide.classList.add('side', 'piece', 'left')
                const rightSide = document.createElement('i');
                rightSide.classList.add('side', 'piece', 'right')
                cellEl.append(topSide, leftSide, rightSide)

                if (cellState?.side) {
                    const {direction, side, power} = cellState;
                    cellEl.classList.add('shield');
                    const powerDiv = document.createElement('div');
                    powerDiv.classList.add('power');
                    cellEl.append(powerDiv)
                    for (let i = 0; i < power; i++) {
                        const stone = document.createElement('i');
                        powerDiv.append(stone);
                    }

                    const rotationCSS = `${direction * 60}deg`;
                    cellEl.style.rotate = rotationCSS;
                    cellEl.style.setProperty('--border', side === RED ? RED_COLOR: GREEN_COLOR)
                    cellEl.style.setProperty('--color', side === RED ? 'pink': 'lightgreen')
                    if (activePiece != null && activePiece[0].join('.') === [rowIdx, cellIdx].join('.')) {
                        cellEl.style.setProperty('--border', ACTIVE_COLOR)
                    }
                    cellState.element = cellEl;
                } else {
                    row[cellIdx] = {element: cellEl};
                }
                
                board.appendChild(cellEl);
            })
        })
    }

    function calculateSteps(start, currentState) {
        const {power, direction} = currentState;
        let [incI, incJ] = [0,0]
        if (direction === 0 || direction === 3) {
            incI = direction === 0 ? -1 : 1;
        }
        const steps = [];
        const currentPower = power - powerSpent;
        let remainingPower = currentPower;
        let [i, j] = start;
        while (remainingPower) {
            if (direction === 1) {
                if (j % 2 === 0) {
                    [incI, incJ] = [-1, 1]
                } else {
                    [incI, incJ] = [0, 1]
                }
            } else if (direction === 2) {
                if (j % 2 === 0) {
                    [incI, incJ] = [0, 1]
                } else {
                    [incI, incJ] = [1, 1]
                }
            } else if (direction === 4) {
                if (j % 2 === 0) {
                    [incI, incJ] = [0, -1]
                } else {
                    [incI, incJ] = [1, -1]
                }
            } else if (direction === 5) {
                if (j % 2 === 0) {
                    [incI, incJ] = [-1, -1]
                } else {
                    [incI, incJ] = [0, -1]
                }
            }
            i += incI;
            j += incJ;
            remainingPower--;
            if (boardState[i]?.[j] == null) break;
            const nextState = boardState[i][j];
            if (nextState.side === currentState.side) break;
            if (nextState.side != null && nextState.side !== currentState.side) {
                
                const [ableToWin, powerAdj] = canWin(nextState, remainingPower + 1, direction);
                if (!ableToWin) break;
                steps.push({cell: [i, j], powerSpent: currentPower, powerAdj, capture: true})
                break;
            } else {
                steps.push({cell: [i, j], powerSpent: currentPower - remainingPower})
            }
            
        }
        possibleSteps = steps;
    }

    function canWin(state, remainingPower, attackingDirection) {
        const backStub = [
            [5,0,1], // 0
            [0,1,2], // 1
            [1,2,3], // 2
            [2,3,4], // 3
            [3,4,5], // 4
            [4,5,0], // 5
        ]
        if (backStub[state.direction].includes(attackingDirection)) return [true, 1];
        if (state.power < remainingPower) return [true, -1];
        return [false, 0]
    }

    function move([rIdx, cIdx]) {
        const cellState = boardState[rIdx][cIdx];
        const {side} = cellState;
        if (side === currentPlayer.side && !activePiece) {
            activePiece = [[rIdx, cIdx], cellState.element];
            cellState.element.style.setProperty('--border', ACTIVE_COLOR)
            calculateSteps([rIdx, cIdx], cellState)
        } else if (side === currentPlayer.side && !moveInProgress) {
            activePiece[1].style.setProperty('--border', currentPlayer.color)
            activePiece = [[rIdx, cIdx], cellState.element];
            cellState.element.style.setProperty('--border', ACTIVE_COLOR)
            calculateSteps([rIdx, cIdx], cellState)
        } else if (activePiece) {
            moveInProgress = true;
            if (isTurning) {
                didTurn = true;
                isTurning = false;
            }

            const [i, j] = activePiece[0]
            const destination = possibleSteps.find(step => step.cell.join(',') === [rIdx, cIdx].join(','));

            if (!destination) {
                window.alert('cannot play there')
                return
            }
            const {powerAdj, capture} = destination;
            powerSpent += destination.powerSpent;
            const state = boardState[i][j];
            activePiece[0] = [rIdx, cIdx];
            if (capture) {
                state.power += powerAdj;
                powerSpent = state.power;
            }
            boardState[i][j] = {}
            boardState[rIdx][cIdx] = state;
            calculateSteps([rIdx, cIdx], state)
            render()
            
        }
    }
    render();
})();