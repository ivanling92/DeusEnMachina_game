/* Deus En Machina V2 - 3D Version
* Author: Ivan Ling
* Pseudo-3D implementation using canvas 2D with 3D projection
*
* Based on the original 2D version but simulated in 3D space
*/

// Canvas setup
const canvas = document.getElementById("game-canvas");
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;
const ctx = canvas.getContext("2d");
const leaderboard = document.getElementById("leaderboard");

// Game variables (same as 2D version)
const windSpawnrate = 15;
const maxWinspawn = 100;
const minWinspawn = 2;
const windStrength = 0.005;
const dampingFactor = 0.98;
const frictionFactor = 0.999;

// UI elements
const speedDisplay = document.getElementById("aveSpeed");
const scoreDisplay = document.getElementById("score");
const elementDisplay = document.getElementById("elements");
const healthbar = document.getElementById("health-value");
const varticles = document.getElementById("varticles");
const oddles = document.getElementById("oddles");

// Sounds (reuse from original)
const mpop = new Audio("magicpop.mp3");
const pop = new Audio("popsound.mp3");
const panicmusicplayer = new Audio("almostend.mp3");

// Game state variables
let curMouseX = 0;
let curMouseY = 0;
let score = 0;
let numElements = 0;
let speed = 0;
let isGameOver = false;
let opacity = 0;

// 3D Camera and view settings
let camera = {
    x: 0, y: 0, z: 300,
    rotX: 0, rotY: 0,
    fov: 60
};

let spheres = []; // 3D spheres
let wind = { x: 0, y: 0, z: 0 }; // 3D wind vector
let windDecay = 0.8;
let isDragging = false;
let isRotating = false;
let startMouse = { x: 0, y: 0 };
let endMouse = { x: 0, y: 0 };

// Tutorial flags (same as original)
let vacuumdrag = false;
let oddleappear = false;
let leftOddle = false;
let iceOddle = false;
let wonderingOddle = false;

// Symbol and color functions (same as original)
function getSymbol(value) {
    const symbols = {
        1:"⬲",
        2: "✤",
        3: "❆",
        4: "✼",
        5: "ꆛ",
        8: "✽",
        16: "✾",
        32: "✿",
        64: "❀",
        128: "❁",
        154: "❂",
        186: "❈",
        224: "✳",
        270: "✷",
        324: "✵",
    };
    return symbols[value] || "🌱";
}

function getColor(value) {
    const colors = {
      1: "rgb(66, 72, 67)",
      2: "#3B6790",  
      3: "rgb(79, 221, 240)",
      4: "#9F8383",  
      5: "rgb(222, 85, 35)",
      8: "rgb(46, 109, 118)",   
      16: "rgb(138, 51, 36)",  
      32: "rgb(10, 158, 29)", 
      64: "rgb(48, 174, 223)", 
      128: "rgb(212, 212, 37)", 
      154: "rgb(73, 56, 149)",  
      186: "rgb(0, 177, 130)", 
      224: "rgb(241, 244, 60)", 
      270: "rgb(72, 16, 132)", 
      324: "rgb(255, 0, 255)",
    };
    return colors[value] || "rgb(230, 150, 30)";
}

// 3D Math functions
function rotateX(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x,
        y: point.y * cos - point.z * sin,
        z: point.y * sin + point.z * cos
    };
}

function rotateY(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x * cos + point.z * sin,
        y: point.y,
        z: -point.x * sin + point.z * cos
    };
}

function project3D(point) {
    // Apply camera rotation
    let rotated = rotateY(point, camera.rotY);
    rotated = rotateX(rotated, camera.rotX);
    
    // Translate relative to camera
    const translated = {
        x: rotated.x - camera.x,
        y: rotated.y - camera.y,
        z: rotated.z - camera.z
    };
    
    // Perspective projection
    if (translated.z <= 0) return null; // Behind camera
    
    const fov = camera.fov * Math.PI / 180;
    const scale = canvas.height / (2 * Math.tan(fov / 2));
    
    return {
        x: (translated.x * scale / translated.z) + canvas.width / 2,
        y: (translated.y * scale / translated.z) + canvas.height / 2,
        z: translated.z,
        scale: scale / translated.z
    };
}

// 3D Sphere class
class Sphere3D {
    constructor(x, y, z, radius, dx, dy, dz, value) {
        this.pos = { x, y, z };
        this.velocity = { x: dx, y: dy, z: dz };
        this.radius = radius;
        this.value = value;
        this.color = getColor(value);
        
        // Track varticles and oddles
        this.trackElement();
    }
    
    trackElement() {
        const symbol = getSymbol(this.value);
        
        // Track varticles (even values)
        if(!varticles.innerHTML.includes(symbol) && this.value % 2 == 0) {
            const li = document.createElement('li');
            li.classList.add('col-3');
            const div = document.createElement('div');
            div.classList.add('varticle-square');
            div.style.backgroundColor = getColor(this.value);
            div.style.display = 'flex';
            div.style.justifyContent = 'center';
            div.style.alignItems = 'center';
            div.textContent = symbol;
            li.appendChild(div);
            varticles.appendChild(li);
        }
        // Track oddles (odd values)
        else if(!oddles.innerHTML.includes(symbol) && this.value % 2 == 1) {
            const li = document.createElement('li');
            li.classList.add('col-3');
            const div = document.createElement('div');
            div.classList.add('varticle-square');
            div.style.backgroundColor = getColor(this.value);
            div.style.display = 'flex';
            div.style.justifyContent = 'center';
            div.style.alignItems = 'center';
            div.textContent = symbol;
            li.appendChild(div);
            oddles.appendChild(li);
        }
    }
    
    update(allSpheres) {
        // Apply wind force
        this.velocity.x += wind.x;
        this.velocity.y += wind.y;
        this.velocity.z += wind.z;
        
        // Apply friction
        this.velocity.x *= frictionFactor;
        this.velocity.y *= frictionFactor;
        this.velocity.z *= frictionFactor;
        
        // If velocity is too slow, set to 0
        if (Math.abs(this.velocity.x) < 0.2) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.2) this.velocity.y = 0;
        if (Math.abs(this.velocity.z) < 0.2) this.velocity.z = 0;
        
        // ODDLES LOGIC (same as 2D version but in 3D)
        if (this.value == 1) {
            this.velocity.x -= 0.5;
        }
        else if (this.value == 3) {
            this.velocity.x *= 0.2;
            this.velocity.y *= 0.2;
            this.velocity.z *= 0.2;
        }
        else if (this.value == 5) {
            // Move toward/away from projected mouse position
            const mouseWorld = this.getMouseWorld();
            if (mouseWorld) {
                const dx = mouseWorld.x - this.pos.x;
                const dy = mouseWorld.y - this.pos.y;
                const dz = mouseWorld.z - this.pos.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (distance > 50) {
                    this.velocity.x += dx * 0.0005;
                    this.velocity.y += dy * 0.0005;
                    this.velocity.z += dz * 0.0005;
                    if (!wonderingOddle) {
                        wonderingOddle = true;
                        chatMessage.innerHTML = "New rule discovered! ꆛ Wandering Oddles can be moved by the cursor in 3D space! <br/><br/>" + chatMessage.innerHTML;
                    }
                } else {
                    this.velocity.x -= dx * 0.0008;
                    this.velocity.y -= dy * 0.0008;
                    this.velocity.z -= dz * 0.0008;
                }
            }
        }
        
        // Calculate entropy
        this.updateEntropy(allSpheres);
        
        // Check boundary collisions
        this.checkBoundaries();
        
        // Check sphere collisions
        this.checkCollisions(allSpheres);
        
        // Update position
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;
        this.pos.z += this.velocity.z;
    }
    
    getMouseWorld() {
        // Simple approximation - project mouse to world space at current sphere's Z
        const mouseNDC = {
            x: (curMouseX / canvas.width) * 2 - 1,
            y: (curMouseY / canvas.height) * 2 - 1
        };
        
        return {
            x: mouseNDC.x * this.pos.z * 0.5,
            y: -mouseNDC.y * this.pos.z * 0.5,
            z: this.pos.z
        };
    }
    
    updateEntropy(allSpheres) {
        let totalSpeed = 0;
        let numbubs = 0;
        
        allSpheres.forEach((sphere) => {
            if (sphere.value % 2 == 0) {
                totalSpeed += Math.sqrt(sphere.velocity.x**2 + sphere.velocity.y**2 + sphere.velocity.z**2);
                numbubs++;
            }
        });
        
        speed = numbubs > 0 ? (totalSpeed / numbubs) : 0;
        
        if (!isGameOver) {
            speedDisplay.textContent = "Entropy:" + speed.toFixed(2);
        } else {
            speedDisplay.textContent = "Entropy: 0.00";
        }
        
        let healthWidth = ((speed) - 0.2) / 1.5 * 100;
        healthbar.style.width = Math.min(healthWidth, 100) + "%";
        
        scoreDisplay.textContent = "Score:" + Math.round(score);
        elementDisplay.textContent = "Elements found:" + numElements;
        
        if (speed < 0.20) {
            speedDisplay.textContent = "Entropy: 0.00";
            gameOver();
        }
    }
    
    checkBoundaries() {
        const boundarySize = 200;
        
        // X boundaries
        if (this.pos.x + this.radius > boundarySize || this.pos.x - this.radius < -boundarySize) {
            this.velocity.x = -this.velocity.x;
            this.pos.x = Math.max(-boundarySize + this.radius, Math.min(boundarySize - this.radius, this.pos.x));
        }
        
        // Y boundaries
        if (this.pos.y + this.radius > boundarySize || this.pos.y - this.radius < -boundarySize) {
            this.velocity.y = -this.velocity.y;
            this.pos.y = Math.max(-boundarySize + this.radius, Math.min(boundarySize - this.radius, this.pos.y));
        }
        
        // Z boundaries
        if (this.pos.z + this.radius > boundarySize || this.pos.z - this.radius < -boundarySize) {
            this.velocity.z = -this.velocity.z;
            this.pos.z = Math.max(-boundarySize + this.radius, Math.min(boundarySize - this.radius, this.pos.z));
        }
    }
    
    checkCollisions(allSpheres) {
        for (let i = 0; i < allSpheres.length; i++) {
            const other = allSpheres[i];
            if (this === other) continue;
            
            const dx = this.pos.x - other.pos.x;
            const dy = this.pos.y - other.pos.y;
            const dz = this.pos.z - other.pos.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const minDistance = this.radius + other.radius;
            
            if (distance < minDistance) {
                // Special collision logic for oddles
                if (this.value > 150 && other.value == 1) {
                    spheres.splice(i, 1);
                    this.velocity.x += -5;
                    
                    if (!leftOddle) {
                        leftOddle = true;
                        chatMessage.innerHTML = "New rule discovered! Heavier varticles can consume the ⬲ black oddle in 3D! <br/><br/>" + chatMessage.innerHTML;
                    }
                    continue;
                }
                
                if (this.value == 5 && other.value == 5) {
                    spheres.splice(i, 1);
                    spheres.splice(spheres.indexOf(this), 1);
                    continue;
                }
                
                // Merge bubbles if values match and even
                if (this.value === other.value && this.value % 2 == 0) {
                    this.mergeWith(other, allSpheres, i);
                    continue;
                }
                
                // Elastic collision in 3D
                this.elasticCollision3D(other, distance, minDistance);
            }
        }
    }
    
    mergeWith(other, allSpheres, index) {
        // Update value and size
        if (this.value > 100) {
            this.value = Math.round(1.2 * this.value);
            if (this.value % 2 == 1) {
                this.value += 1;
            }
            this.radius = 20 + (this.value * 0.2);
        } else {
            this.value *= 2;
            this.radius = 20 + (this.value * 0.5);
        }
        
        this.color = getColor(this.value);
        this.trackElement();
        
        // Remove other sphere
        allSpheres.splice(index, 1);
        
        // Play sound and update score
        if (this.value > 100) {
            score += 100;
            mpop.volume = 0.7;
            mpop.play();
        } else {
            score += 10;
            pop.volume = 0.1;
            pop.play();
        }
    }
    
    elasticCollision3D(other, distance, minDistance) {
        // 3D elastic collision
        const dx = this.pos.x - other.pos.x;
        const dy = this.pos.y - other.pos.y;
        const dz = this.pos.z - other.pos.z;
        
        // Normalize collision normal
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        
        // Relative velocity
        const dvx = this.velocity.x - other.velocity.x;
        const dvy = this.velocity.y - other.velocity.y;
        const dvz = this.velocity.z - other.velocity.z;
        
        // Collision response
        const velocityAlongNormal = dvx * nx + dvy * ny + dvz * nz;
        
        if (velocityAlongNormal > 0) return; // Objects separating
        
        const restitution = dampingFactor;
        const j = -(1 + restitution) * velocityAlongNormal;
        
        this.velocity.x += j * nx;
        this.velocity.y += j * ny;
        this.velocity.z += j * nz;
        other.velocity.x -= j * nx;
        other.velocity.y -= j * ny;
        other.velocity.z -= j * nz;
        
        // Apply additional damping for heavy spheres
        if (this.value > 100) {
            this.velocity.x *= 0.7;
            this.velocity.y *= 0.7;
            this.velocity.z *= 0.7;
        }
        if (other.value > 100) {
            other.velocity.x *= 0.7;
            other.velocity.y *= 0.7;
            other.velocity.z *= 0.7;
        }
        
        // Separate overlapping spheres
        const overlap = minDistance - distance;
        const separationX = nx * overlap / 2;
        const separationY = ny * overlap / 2;
        const separationZ = nz * overlap / 2;
        
        this.pos.x += separationX;
        this.pos.y += separationY;
        this.pos.z += separationZ;
        other.pos.x -= separationX;
        other.pos.y -= separationY;
        other.pos.z -= separationZ;
    }
    
    draw() {
        const projected = project3D(this.pos);
        if (!projected) return; // Behind camera
        
        // Calculate depth-based effects
        const depth = projected.z;
        const maxDepth = 500;
        const depthRatio = Math.max(0, Math.min(1, depth / maxDepth));
        
        // Sphere size based on perspective
        const screenRadius = this.radius * projected.scale;
        if (screenRadius < 1) return; // Too small to see
        
        // Draw sphere with gradient for 3D effect
        const gradient = ctx.createRadialGradient(
            projected.x - screenRadius * 0.3, 
            projected.y - screenRadius * 0.3, 
            0,
            projected.x, 
            projected.y, 
            screenRadius
        );
        
        // Lighter color for highlight, darker for depth
        const baseColor = this.color;
        const rgb = baseColor.match(/\d+/g);
        if (rgb) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);
            
            // Highlight color (lighter)
            const hr = Math.min(255, r + 60);
            const hg = Math.min(255, g + 60);
            const hb = Math.min(255, b + 60);
            
            // Shadow color (darker, affected by depth)
            const sr = Math.max(0, r - 40 - depthRatio * 40);
            const sg = Math.max(0, g - 40 - depthRatio * 40);
            const sb = Math.max(0, b - 40 - depthRatio * 40);
            
            gradient.addColorStop(0, `rgb(${hr}, ${hg}, ${hb})`);
            gradient.addColorStop(0.7, baseColor);
            gradient.addColorStop(1, `rgb(${sr}, ${sg}, ${sb})`);
        } else {
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(1, '#000000');
        }
        
        // Draw sphere
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, screenRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw outline for depth
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * (1 - depthRatio)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw symbol
        ctx.fillStyle = "white";
        ctx.font = `${Math.max(12, screenRadius * 0.6)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(getSymbol(this.value), projected.x, projected.y);
    }
}

// Create spheres (3D version)
function createSpheres(numSpheres) {
    const values = [2, 4];
    const newSpheres = [];
    
    for (let i = 0; i < numSpheres; i++) {
        const value = values[Math.floor(Math.random() * values.length)];
        const radius = 20 + (value * 0.5);
        
        // Random 3D position within bounds
        let x = (Math.random() - 0.5) * 300;
        let y = (Math.random() - 0.5) * 300;
        let z = (Math.random() - 0.5) * 300;
        
        // Check for overlaps
        let isTouching = false;
        spheres.forEach((sphere) => {
            const dx = x - sphere.pos.x;
            const dy = y - sphere.pos.y;
            const dz = z - sphere.pos.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (distance < sphere.radius + radius) {
                isTouching = true;
            }
        });
        
        if (isTouching) {
            i--;
            continue;
        }
        
        // Random 3D velocity
        const dx = wind.x + (Math.random() - 0.5) * 2;
        const dy = wind.y + (Math.random() - 0.5) * 2;
        const dz = wind.z + (Math.random() - 0.5) * 2;
        
        newSpheres.push(new Sphere3D(x, y, z, radius, dx, dy, dz, value));
    }
    
    return newSpheres;
}

// Create oddles in 3D
function createOddles3D(numOddles) {
    if (!oddleappear) {
        oddleappear = true;
        chatMessage.innerHTML = "New rule discovered! Oddles can appear spontaneously when too much kinetic energy is injected in 3D space! <br/><br/>" + chatMessage.innerHTML;
    }
    
    const values = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    
    if (varticles.innerHTML.includes("❈")) {
        values.push(3);
    }
    if (varticles.innerHTML.includes("✳")) {
        values.push(5);
    }
    
    const newOddles = [];
    
    for (let i = 0; i < numOddles; i++) {
        const value = values[Math.floor(Math.random() * values.length)];
        let radius = 20 + (value * 0.5);
        
        if (value == 3) radius = 60;
        if (value == 5) radius = 30;
        
        // Random 3D position
        let x = (Math.random() - 0.5) * 300;
        let y = (Math.random() - 0.5) * 300;
        let z = (Math.random() - 0.5) * 300;
        
        // Check for overlaps
        let isTouching = false;
        spheres.forEach((sphere) => {
            const dx = x - sphere.pos.x;
            const dy = y - sphere.pos.y;
            const dz = z - sphere.pos.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (distance < sphere.radius + radius) {
                isTouching = true;
            }
        });
        
        if (isTouching) {
            i--;
            continue;
        }
        
        // Random 3D velocity
        const dx = wind.x + (Math.random() - 0.5) * 2;
        const dy = wind.y + (Math.random() - 0.5) * 2;
        const dz = wind.z + (Math.random() - 0.5) * 2;
        
        newOddles.push(new Sphere3D(x, y, z, radius, dx, dy, dz, value));
    }
    
    return newOddles;
}

// Event handlers
function setupEventListeners() {
    // Mouse events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel);
    
    // Touch events
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove', onTouchMove);
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function onMouseDown(event) {
    event.preventDefault();
    
    if (event.button === 2) { // Right click for rotation
        isRotating = true;
        startMouse.x = event.clientX;
        startMouse.y = event.clientY;
    } else if (event.button === 0) { // Left click for wind
        // Check if clicking on a sphere
        let clickedSphere = false;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        for (let sphere of spheres) {
            const projected = project3D(sphere.pos);
            if (projected) {
                const dx = mouseX - projected.x;
                const dy = mouseY - projected.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                const screenRadius = sphere.radius * projected.scale;
                if (distance < screenRadius) {
                    clickedSphere = true;
                    break;
                }
            }
        }
        
        if (!clickedSphere) {
            isDragging = true;
            startMouse.x = event.clientX;
            startMouse.y = event.clientY;
        }
    }
}

function onMouseMove(event) {
    curMouseX = event.clientX;
    curMouseY = event.clientY;
    
    if (isRotating) {
        const deltaX = (event.clientX - startMouse.x) * 0.01;
        const deltaY = (event.clientY - startMouse.y) * 0.01;
        
        camera.rotY += deltaX;
        camera.rotX += deltaY;
        
        // Clamp rotation
        camera.rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotX));
        
        startMouse.x = event.clientX;
        startMouse.y = event.clientY;
    } else if (isDragging) {
        endMouse.x = event.clientX;
        endMouse.y = event.clientY;
    }
}

function onMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        
        // Calculate wind force
        const deltaX = (endMouse.x - startMouse.x) * windStrength;
        const deltaY = (endMouse.y - startMouse.y) * windStrength;
        
        // Convert 2D mouse movement to 3D wind force
        wind.x = deltaX;
        wind.y = -deltaY; // Invert Y
        wind.z = (Math.random() - 0.5) * Math.abs(deltaX + deltaY); // Random Z component
        
        // Calculate spheres to spawn
        let totalSpheres = Math.round((Math.abs(deltaX) + Math.abs(deltaY)) * windSpawnrate * 50);
        
        if (totalSpheres < minWinspawn) {
            totalSpheres = minWinspawn;
        } else if (totalSpheres > maxWinspawn) {
            totalSpheres = maxWinspawn;
        }
        
        console.log("Spawning", totalSpheres, "spheres");
        
        if (!isGameOver) {
            // Add new spheres
            const newSpheres = createSpheres(totalSpheres);
            spheres.push(...newSpheres);
            
            // Add oddles if condition is met
            if (varticles.innerHTML.includes("❁")) {
                const oddles = createOddles3D(Math.round(totalSpheres / 5));
                spheres.push(...oddles);
            }
            
            if (!vacuumdrag && totalSpheres > maxWinspawn / 5) {
                vacuumdrag = true;
                chatMessage.innerHTML = "New rule discovered! You can create 3D vector fields by clicking on vacuum! Dragging creates wind forces in 3D space!";
            }
        }
    }
    
    isRotating = false;
}

function onClick(event) {
    if (isDragging || isRotating) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Check for sphere clicks
    for (let i = 0; i < spheres.length; i++) {
        const sphere = spheres[i];
        const projected = project3D(sphere.pos);
        if (projected) {
            const dx = mouseX - projected.x;
            const dy = mouseY - projected.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            const screenRadius = sphere.radius * projected.scale;
            
            if (distance < screenRadius) {
                console.log("Clicked sphere value:", sphere.value);
                
                if (sphere.value == 3) {
                    spheres.splice(i, 1);
                    
                    if (!iceOddle) {
                        iceOddle = true;
                        chatMessage.innerHTML = "New rule discovered! ❆ Ice oddles can be removed by clicking them in 3D! <br/><br/>" + chatMessage.innerHTML;
                    }
                }
                break;
            }
        }
    }
}

function onWheel(event) {
    event.preventDefault();
    
    // Zoom in/out
    const zoomSpeed = 10;
    camera.z += event.deltaY * zoomSpeed * 0.01;
    camera.z = Math.max(100, Math.min(600, camera.z));
}

// Touch event handlers (simplified)
function onTouchStart(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        startMouse.x = touch.clientX;
        startMouse.y = touch.clientY;
        isDragging = true;
    }
}

function onTouchMove(event) {
    if (isDragging && event.touches.length === 1) {
        const touch = event.touches[0];
        endMouse.x = touch.clientX;
        endMouse.y = touch.clientY;
        curMouseX = touch.clientX;
        curMouseY = touch.clientY;
    }
}

function onTouchEnd(event) {
    if (isDragging) {
        onMouseUp({ clientX: endMouse.x, clientY: endMouse.y });
    }
}

// Game functions
function gameOver() {
    isGameOver = true;
    opacity = 0;
}

function restartGame() {
    isGameOver = false;
    
    // Clear UI
    varticles.innerHTML = "";
    oddles.innerHTML = "";
    
    // Handle leaderboard (same as original)
    const playerName = document.getElementById("playerName").value.trim();
    if (!playerName) {
        alert("Please enter a valid player name!");
        return;
    }
    
    let leaderboard_scores = [];
    for (let i = 0; i < leaderboard.children.length; i++) {
        const entry = leaderboard.children[i].textContent.split(":");
        leaderboard_scores.push({
            name: entry[0].trim(),
            score: parseInt(entry[1].trim()),
        });
    }
    
    score = Math.round(score);
    leaderboard_scores.push({ name: playerName, score });
    
    leaderboard_scores = leaderboard_scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    
    leaderboard.innerHTML = "";
    leaderboard_scores.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `${entry.name}: ${entry.score}`;
        leaderboard.appendChild(li);
    });
    
    document.cookie = "leaderboard=" + JSON.stringify(leaderboard_scores);
    
    // Reset game state
    spheres.length = 0;
    spheres.push(...createSpheres(20));
    
    opacity = 0;
    score = 0;
    
    // Reset camera
    camera.rotX = 0;
    camera.rotY = 0;
    camera.z = 300;
    
    // Hide restart modal
    const restartModal = document.getElementById("restart-modal");
    restartModal.classList.remove("d-block");
    restartModal.classList.add("d-none");
}

function loadLeaderboard() {
    if (document.cookie.includes("leaderboard")) {
        const leaderboard_scores = JSON.parse(document.cookie.split("=")[1]);
        leaderboard_scores.forEach(entry => {
            const li = document.createElement("li");
            li.textContent = `${entry.name}: ${entry.score}`;
            leaderboard.appendChild(li);
        });
    } else {
        document.cookie = "leaderboard=[]";
        console.log("leaderboard cookie created");
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid for 3D depth perception
    drawBackground();
    
    if (!isGameOver) {
        // Apply wind decay
        wind.x *= windDecay;
        wind.y *= windDecay;
        wind.z *= windDecay;
        
        // Update all spheres
        spheres.forEach(sphere => sphere.update(spheres));
        
        // Sort spheres by depth for proper rendering
        spheres.sort((a, b) => {
            const projectedA = project3D(a.pos);
            const projectedB = project3D(b.pos);
            if (!projectedA && !projectedB) return 0;
            if (!projectedA) return 1;
            if (!projectedB) return -1;
            return projectedB.z - projectedA.z; // Render far spheres first
        });
        
        // Draw all spheres
        spheres.forEach(sphere => sphere.draw());
        
        // Draw wind indicator
        if (isDragging) {
            drawWindIndicator();
        }
    } else {
        // Game over animation
        if (spheres.length > 0) {
            spheres.pop();
        } else if (opacity < 1) {
            opacity += 0.01;
        } else {
            // Show restart modal
            const restartModal = document.getElementById("restart-modal");
            restartModal.classList.remove("d-none");
            restartModal.classList.add("d-block");
            
            const restartButton = document.getElementById("restart-button");
            restartButton.addEventListener("click", restartGame);
            
            panicmusicplayer.pause();
        }
        
        // Render game over text
        if (opacity > 0) {
            ctx.fillStyle = `rgba(255, 40, 40, ${opacity})`;
            ctx.font = "60px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
        }
        
        // Draw remaining spheres
        spheres.forEach(sphere => sphere.draw());
    }
}

function drawBackground() {
    // Draw a simple grid for 3D depth perception
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawWindIndicator() {
    ctx.beginPath();
    ctx.moveTo(startMouse.x, startMouse.y);
    ctx.lineTo(endMouse.x, endMouse.y);
    
    const deltaX = endMouse.x - startMouse.x;
    const deltaY = endMouse.y - startMouse.y;
    const magnitude = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
    
    ctx.lineWidth = Math.max(2, magnitude * 0.05);
    
    const intensity = Math.min(255, magnitude * 2);
    ctx.strokeStyle = `rgb(${intensity}, 100, ${255 - intensity})`;
    
    ctx.stroke();
}

// Handle window resize
function onWindowResize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

// Game timer (same logic as 2D version)
setInterval(() => {
    if (!isGameOver) {
        score += 0.1;
        numElements = varticles.children.length + oddles.children.length;
        
        // Background effects based on entropy
        if (speed > 2) {
            // High entropy - cooler colors
            if (panicmusicplayer.volume > 0.05) {
                panicmusicplayer.volume -= 0.05;
            } else {
                panicmusicplayer.pause();
            }
        } else {
            // Low entropy - warmer colors, music
            if (panicmusicplayer.paused) {
                panicmusicplayer.volume = 0.1;
                panicmusicplayer.play();
            } else if (panicmusicplayer.volume < 0.5) {
                panicmusicplayer.volume += 0.01;
            }
        }
    } else {
        const audio = new Audio("gameover_fin.mp3");
        audio.play();
    }
}, 200);

// Speech synthesis
function speakText(message) {
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = "en-US";
    speech.pitch = 1;
    speech.rate = 1;
    window.speechSynthesis.speak(speech);
}

// Keyboard cheats
document.addEventListener("keydown", (e) => {
    if (e.key === "a" && !isGameOver) {
        const newSpheres = createSpheres(100);
        spheres.push(...newSpheres);
    }
    if (e.key === "5" && !isGameOver) {
        const oddles = createOddles3D(10);
        spheres.push(...oddles);
    }
});

// Get chat message element
const chatMessage = document.getElementById("chat-box");

// Initialize the game
function init() {
    console.log("Initializing 3D Deus En Machina...");
    
    setupEventListeners();
    loadLeaderboard();
    
    // Create initial spheres
    spheres.push(...createSpheres(20));
    
    // Start animation loop
    animate();
    
    // Setup window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Welcome message
    speakText("Welcome to the 3D universe! Click and drag to create wind forces, right-click to rotate the view, and explore the 3D space!");
    
    console.log("3D Deus En Machina initialized successfully!");
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}