const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const PIECE_SIZE_CROSS = 100;
const PIECE_SIZE_LARGE = 300;
const PIECE_SIZE_SMALL = 150;
const MIN_DISTANCE = 100;



const TYPES_STANDARD = {
    "Bosque": {
        color: "darkgreen",
        maxPieces: 3,
        name: "Bosque",
        classify: ["Alto", "Accidentado", "Cobertura ligera"],
        draw_pattern: false,  // Campo añadido
        color_pattern: "none" // Campo añadido
    },
    "Campos": {
        color: "yellow",
        maxPieces: 2,
        name: "Campos",
        classify: ["Bajo", "Accidentado", "Cobertura ligera"],
        draw_pattern: false,
        color_pattern: "none"
    },
    "Terreno rocoso": {
        color: "gray",
        maxPieces: 1,
        name: "Terreno rocoso",
        classify: ["Bajo", "Accidentado", "Cobertura pesada"],
        draw_pattern: false,
        color_pattern: "none"
    },
    "Ruinas": {
        color: "silver",
        maxPieces: 1,
        name: "Ruinas",
        classify: ["Alto", "Accidentado", "Cobertura pesada"],
        draw_pattern: true,
        color_pattern: "white"
    },
    "Colina": {
        color: "lightgreen",
        maxPieces: 1,
        name: "Colina",
        classify: ["Alto", "Abierto", "Sin cobertura"],
        draw_pattern: false,
        color_pattern: "none"
    },
    "Colina empinada": {
        color: "lightgreen",
        maxPieces: 1,
        name: "Colina empinada",
        classify: ["Alto", "Accidentado", "Sin cobertura"],
        draw_pattern: true,
        color_pattern: "white"
    },
    "Pantano": {
        color: "blue",
        maxPieces: 3,
        name: "Cienagas",
        classify: ["Bajo", "Peligroso", "Sin cobertura"],
        draw_pattern: false,
        color_pattern: "none"
    },
    "Rio": {
        color: "lightblue",
        maxPieces: 3,
        name: "Río",
        classify: ["Corriente", "Agua"],
        draw_pattern: false,
        color_pattern: "none"
    },
    "RioHelado": {
        color: "lightgrey",
        maxPieces: 3,
        name: "Río Helado",
        classify: ["Corriente", "Hielo"],
        draw_pattern: true,
        color_pattern: "white"
    }
};

let TYPES = TYPES_STANDARD;

let piecesPlaced = [];
let riverProbability = 0.05; // 5% por defecto
let placementProbabilityMenu = 1.0;
let minPiecesBeforeReducing = 3;
let currentRiverType = "Rio";  // Tipo de río por defecto
let selectedPieces = [];




let PIECES = [
    { size: PIECE_SIZE_LARGE, type: "Bosque" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Bosque" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Bosque" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Bosque" , checked: true},
    { size: PIECE_SIZE_LARGE, type: "Campos" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Campos" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Campos" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Terreno rocoso" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Ruinas" , checked: true},
    { size: PIECE_SIZE_LARGE, type: "Colina" , checked: true},
    { size: PIECE_SIZE_LARGE, type: "Colina empinada" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Pantano" , checked: true},
    { size: PIECE_SIZE_SMALL, type: "Pantano" , checked: true},
    // ... añade más piezas según lo necesites
];

for (let i = 0; i < PIECES.length; i++) {
    selectedPieces.push({ ...PIECES[i] });
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

CanvasRenderingContext2D.prototype.fillRoundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    this.fill();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function canPlacePiece(piecesPlaced, x, y, size) {
    for (let piece of piecesPlaced) {
        let overlapX = (x < piece.x + piece.size + MIN_DISTANCE && x + size + MIN_DISTANCE > piece.x) ||
            (piece.x < x + size + MIN_DISTANCE && piece.x + piece.size + MIN_DISTANCE > x);
        let overlapY = (y < piece.y + piece.size + MIN_DISTANCE && y + size + MIN_DISTANCE > piece.y) ||
            (piece.y < y + size + MIN_DISTANCE && piece.y + piece.size + MIN_DISTANCE > y);

        if (overlapX && overlapY) {
            return false; // Si hay solapamiento en ambas direcciones, no podemos colocar la pieza
        }

        // Verificar contra el "Río" si es la pieza actual
        if (piece.type === "Rio") {
            if (piece.orientation === "horizontal") {
                if (Math.abs(piece.y - y) < size + MIN_DISTANCE) {
                    return false;
                }
            } else {
                if (Math.abs(piece.x - x) < size + MIN_DISTANCE) {
                    return false;
                }
            }
        }
    }

    return true;
}





function placeRiver(piecesPlaced) {
    let orientations = ["horizontal", "vertical"]; // "random" esta deshabilitado de momento, hasta que solucionemos el tema de colisiones.
    const orientation = orientations[Math.floor(Math.random() * orientations.length)];


    if (orientation === "horizontal") {
        const y = getRandomInt(0, canvas.height - PIECE_SIZE_CROSS);
        piecesPlaced.push({
            x: 0,
            y: y,
            size: canvas.width,
            type: currentRiverType,
            orientation: orientation
        });

    } else if (orientation === "vertical") {
        const x = getRandomInt(0, canvas.width - PIECE_SIZE_CROSS);
        piecesPlaced.push({
            x: x,
            y: 0,
            size: canvas.height,
            type: currentRiverType,
            orientation: orientation
        });
    }
}



function countPiecesOfType(piecesPlaced, type) {
    return piecesPlaced.filter(piece => piece.type === type).length;
}

function drawTextOnPiece(x, y, width, height, type) {
    if (document.getElementById('showTextCheckbox').checked) {
        const typeData = TYPES[type];

        if (type === "Rio") {
            // Simplemente regresamos y no pintamos nada para el "Río"
            return;
        }

        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px Arial';

        ctx.fillText(typeData.name, x + width / 2, y + height / 3);
        ctx.font = 'italic 14px Arial';
        for (let i = 0; i < typeData.classify.length; i++) {
            ctx.fillText(typeData.classify[i], x + width / 2, y + height / 2 + i * 20);
        }
    }
}



function drawStripedPattern(ctx, width, height, background, line_color, lineWidth = 30) {
    // Crea un canvas temporal
    let patternCanvas = document.createElement('canvas');
    let patternCtx = patternCanvas.getContext('2d');

    patternCanvas.width = width;
    patternCanvas.height = height;

    // Rellena el fondo con el color deseado
    patternCtx.fillStyle = background; // El color de fondo para "Río Helado"
    patternCtx.fillRect(0, 0, width, height);

    // Configura las rayas
    patternCtx.strokeStyle = line_color;
    patternCtx.lineWidth = lineWidth;

    // Dibuja las rayas inclinadas a 45 grados
    for (let y = -width; y < height; y += lineWidth * 2) {
        patternCtx.beginPath();
        patternCtx.moveTo(0, y);
        patternCtx.lineTo(width, y + width);
        patternCtx.stroke();
    }

    return ctx.createPattern(patternCanvas, 'repeat');
}

function redrawPieces(piecesPlaced) {
    clearCanvas();

    for (let piece of piecesPlaced) {
        if (TYPES[piece.type].draw_pattern) {
            ctx.fillStyle = drawStripedPattern(ctx, 10, 10, TYPES[piece.type].color, TYPES[piece.type].color_pattern); // Ajusta los valores para cambiar el tamaño de las rayas
        } else {
            ctx.fillStyle = TYPES[piece.type].color;
        }
        if (piece.type === "Rio" || piece.type === "RioHelado") {
            if (piece.orientation === "horizontal") {
                ctx.fillRect(0, piece.y, canvas.width, PIECE_SIZE_CROSS);
            } else {
                ctx.fillRect(piece.x, 0, PIECE_SIZE_CROSS, canvas.height);
            }
        } else {
            ctx.fillRoundRect(piece.x, piece.y, piece.size, piece.size, 20);
        }
        drawTextOnPiece(piece.x, piece.y, piece.size, piece.size, piece.type); // Pasar todos los parámetros requeridos
    }
}

function placePieces() {
    console.log("Comienza un mapa");
    
    
    piecesPlaced = [];

    loadSelectedPieces();
    
    shuffleArray(selectedPieces);
    // pieces.sort(() => Math.random() - 0.5);
    clearCanvas();
    let placementProbability = placementProbabilityMenu;
    let retries = 100;
    console.log("placementProbability:" +placementProbability)

    let currentPieceCount = 0;

    // Añadir pieza cruzando el canvas con 5% de probabilidad
    if (Math.random() < riverProbability) {
        placeRiver(piecesPlaced);
    }

    for (let piece of selectedPieces) {
        console.log("Piezas colocadas:"+ currentPieceCount);
        let prob_add = Math.random()
        if (prob_add > placementProbability) {  // Comprobamos si podemos anadir una nueva pieza
            console.log("Termina: No ha pasado la probabilidad de poner la pieza:" + prob_add + ">" + placementProbability)
            break;
        }

        if (countPiecesOfType(piecesPlaced, piece.type) >= TYPES[piece.type].maxPieces) {
            continue;
        }

        let canPlace = false;

        for (let i = 0; i < retries; i++) {
            let x = getRandomInt(0, canvas.width - piece.size);
            let y = getRandomInt(0, canvas.height - piece.size);

            if (canPlacePiece(piecesPlaced, x, y, piece.size)) {
                currentPieceCount += 1;
                piecesPlaced.push({ x: x, y: y, size: piece.size, type: piece.type });
                canPlace = true;

                if (currentPieceCount > minPiecesBeforeReducing) {
                    placementProbability -= 0.20;
                    console.log("Reducimos probabilidad: " + placementProbability)
                }
                break;
            }
        }

        if (!canPlace) {
            console.log("Termina: No ha encontrado un sitio en el mapa")
            break;
        }
    }

    redrawPieces(piecesPlaced);  // Añade esta línea
}

function loadSelectedPieces() {
   
   
    // Obtener todos los checkboxes de la lista
    let checkboxes = document.querySelectorAll('#listaPiezas input[type="checkbox"]');

    // Limpiar selectedPieces
    selectedPieces = [];

    // Verificar el estado de cada checkbox y actualizar selectedPieces
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            selectedPieces.push(PIECES[index]);
        }
    });

    // Ahora selectedPieces contiene solo las piezas seleccionadas
    console.log(selectedPieces);

}
function loadMapState(qrContent) {
    // Aquí va tu función para cargar el estado del mapa usando el contenido del QR
    const stateObject = JSON.parse(qrContent);
    for(let piece of stateObject) {
        // Suponiendo que tienes una función que coloca piezas en base a un objeto
        placePiece(piece);
    }
}
function getCurrentState() {
    return JSON.stringify(piecesPlaced);
}

document.getElementById("generateQR").addEventListener("click", function() {
    const state = getCurrentState();

    // Limpiamos el contenido previo
    document.getElementById("qrcode").innerHTML = "";

    // Generamos el QR
    new QRCode(document.getElementById("qrcode"), state);
});

document.getElementById('showTextCheckbox').addEventListener('change', function () {
    redrawPieces(piecesPlaced);
});

document.getElementById('seasonCheckbox').addEventListener('change', function () {
    currentRiverType = this.checked ? "RioHelado" : "Rio";
    redrawPieces(piecesPlaced);
});

document.getElementById('riverProbabilityInput').addEventListener('change', function () {
    riverProbability = this.value / 100;
    console.log("Probabilidad de Río ajustada a:", riverProbability);  // Agrega esta línea
});

document.getElementById('placementProbabilityInput').addEventListener('change', function () {
    placementProbabilityMenu = parseFloat(this.value);
    console.log("Probabilidad de Ubicación ajustada a:", placementProbabilityMenu);
});
document.getElementById('placementProbabilityInput').addEventListener('change', function () {
    let inputValue = parseFloat(this.value);
    if (inputValue < 0) inputValue = 0;
    if (inputValue > 1) inputValue = 1;
    placementProbabilityMenu = inputValue;
    this.value = inputValue;  // Esto actualizará la entrada si el valor fue corregido
    console.log("Probabilidad de Ubicación ajustada a:", placementProbabilityMenu);
});

document.getElementById('minPiecesInput').addEventListener('change', function () {
    minPiecesBeforeReducing = parseInt(this.value, 10);
    console.log("Número mínimo de piezas ajustado a:", minPiecesBeforeReducing);
});
document.getElementById('scanButton').addEventListener('click', function() {
    const reader = new Html5Qrcode("reader");

    reader.scan(
        function(qrMessage) {
            // Esta función es llamada cada vez que se decodifica exitosamente un QR
            console.log(`Código QR leído: ${qrMessage}`);
            
            // Aquí puedes hacer lo que necesites con el contenido, como cargar el estado de tu mapa
            loadMapState(qrMessage);
            
            reader.stop();
        },
        function(error) {
            // Si hay errores durante el escaneo, se mostrarán aquí
            console.warn(`Error: ${error}`);
        },
        function(videoError) {
            // Errores relacionados con la cámara se manejan aquí
            console.error(`Error de video: ${videoError}`);
        }
    );
});



document.addEventListener('DOMContentLoaded', (event) => {
    // Primer bloque de código
    const listaPiezas = document.getElementById('listaPiezas');
    
    for (let i = 0; i < PIECES.length; i++) {
        const li = document.createElement('li');
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'piece' + i;
        input.checked = true;
        
        const label = document.createElement('label');
        label.setAttribute('for', 'piece' + i);
        label.textContent = `${PIECES[i].type} - ${PIECES[i].size}`;
        
        li.appendChild(input);
        li.appendChild(label);
        
        listaPiezas.appendChild(li);
    }

    // listaPiezas.addEventListener('change', function (e) {
    //     if (e.target.type === 'checkbox') {
    //         let index = parseInt(e.target.id.replace('piece', ''));
    //         if (e.target.checked) {
    //             selectedPieces.push(PIECES[index]);
    //         } else {
    //             selectedPieces = selectedPieces.filter(piece => piece !== PIECES[index]);
    //         }
    //         console.log(selectedPieces);
    //     }
    // });

    // Segundo bloque de código
    let acc = document.getElementsByClassName("accordionButton")[0];

    acc.addEventListener("click", function() {
        this.classList.toggle("active");
        let panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    });
});