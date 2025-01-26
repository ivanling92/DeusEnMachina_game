/* Deus En Machina V1
* Author: Ivan Ling
* 
*

TODO:
- Rename speed as entropy
- Think of better icons for the bubbles

IDEAS:

- Story line
- Shop system for user to buy power ups to increase internal energy of the system
- Maybe create "life" where some advanced bubbles comes to life and starts munching other bubbles

*/



// Get canvas element and context
const canvas = document.getElementById("bubble");
//Fill the parent div container
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;
const ctx = canvas.getContext("2d");
const leaderboard = document.getElementById("leaderboard");


//Variables
const windSpawnrate = 15; // Wind spawn rate
const maxWinspawn = 100;
const minWinspawn = 2;
const windStrength = 0.005; // Wind strength
const dampingFactor = 0.98; // Damping factor
const frictionFactor = 0.999; // Friction factor


const speedDisplay = document.getElementById("aveSpeed");
const scoreDisplay = document.getElementById("score");
const healthbar = document.getElementById("health-value");

//Get the ul element called varticles
const varticles = document.getElementById("varticles");
const oddles = document.getElementById("oddles");

//tutorial flag
let vacuumdrag = false;
let oddleappear = false;
let leftOddle = false;
let iceOddle = false;




//Game Vars
let score = 0;



//Symbol
function getSymbol(value){
    //lookup table for symbols
    const symbols = {
        1:"⬲",
        2: "✤",
        3: "❆",
        4: "✼",
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
    return colors[value] || "rgb(230, 150, 30)"; // Default to Earth Black
}

// Bubble class
class Bubble {
  constructor(x, y, radius, dx, dy, value) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dx = dx; // Horizontal velocity
    this.dy = dy; // Vertical velocity
    this.value = value;
    this.color = getColor(value);
  }

  

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Draw the number
    ctx.fillStyle = "white";
    ctx.font = `${this.radius}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let symbol = getSymbol(this.value);
    //If symbol not in varticle list add it
    if(!varticles.innerHTML.includes(symbol) && this.value%2 == 0){
        const li = document.createElement('li');
        li.classList.add('col-3');
        const div = document.createElement('div');
        div.classList.add('varticle-square');
        div.style.backgroundColor = getColor(this.value);
        div.textContent = symbol;
        li.appendChild(div);
        varticles.appendChild(li);
    }
    else if(!oddles.innerHTML.includes(symbol) && this.value%2 == 1){
        const li = document.createElement('li');
        li.classList.add('col-3');
        const div = document.createElement('div');
        div.classList.add('varticle-square');
        div.style.backgroundColor = getColor(this.value);
        div.textContent = symbol;
        li.appendChild(div);
        oddles.appendChild(li);
    }


    ctx.fillText(symbol, this.x, this.y);
  }

  update(bubbles, wind) {
    // Apply wind force
    this.dx += wind.x;
    this.dy += wind.y;

    //apply friction
    this.dx *= frictionFactor;
    this.dy *= frictionFactor;

    //If the bubble is too slow, set to 0
    if (Math.abs(this.dx) < 0.2) this.dx = 0;
    if (Math.abs(this.dy) < 0.2) this.dy = 0;

    //ODDLES LOGIC

    if (this.value == 1){
        this.dx -= 0.5;
    }



    //If after mouse up the average speed of all bubble is near 0, trigger game over text
    let totalSpeed = 0;
    bubbles.forEach((bubble) => {
            if(bubble.value%2 == 0){
            totalSpeed += Math.abs(bubble.dx) + Math.abs(bubble.dy);
            }   
        }
    );
    speedDisplay.textContent = "Entropy:" + (totalSpeed/bubbles.length).toFixed(2);
    let healthWidth = ((totalSpeed / bubbles.length) - 0.2) / 1.5 * 100;
    healthbar.style.width = Math.min(healthWidth, 100) + "%";
    scoreDisplay.textContent = "Score:" + Math.round(score);
    if (totalSpeed/bubbles.length < 0.20) {
        gameOver();
        }

    // Reverse direction if bubble hits canvas boundaries
    if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
      this.dx = -this.dx;
    }
    if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
      this.dy = -this.dy;
    }

    // If bubble is currently outside the boundary, move it inside
    if (this.x + this.radius > canvas.width) {
      this.x = canvas.width - this.radius;
    }
    if (this.x - this.radius < 0) {
        this.x = this.radius;
        }
    if (this.y + this.radius > canvas.height) {
        this.y = canvas.height - this.radius;
        }
    if (this.y - this.radius < 0) {
        this.y = this.radius;
        }




    // Check collision with other bubbles
    for (let i = 0; i < bubbles.length; i++) {
      const other = bubbles[i];
      if (this === other) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = this.radius + other.radius;

      if (distance < minDistance) {
       
        //Special case for ODDLES
        if(this.value > 100 && other.value == 1){
            //delete this bubble
            console.log("Oddle hit bubble");

            //check tutorial flag for left oddle
            if(!leftOddle){
                leftOddle = true;
                chatMessage.innerHTML = "New rule discovered! Heaver varticles can consume the black oddle! <br/><br/>" + chatMessage.innerHTML;
            }


            bubbles.splice(i, 1);
            //accelerate the other bubble
            this.dx += -5;
        }
         // If values match, merge bubbles
        if (this.value === other.value && this.value%2 == 0) {
            if(this.value > 100){
                this.value = Math.round(1.2*this.value);
                if(this.value%2 ==1)
                {
                    this.value += 1;
                }
                this.radius = 20+(this.value*0.2); // Scale radius
            }
            else{
                this.value *= 2;
                this.radius = 20+(this.value*0.5); // Scale radius
            }
          
          this.color = getColor(this.value);
          bubbles.splice(i, 1); // Remove the other bubble
          //Play a mp3 sound
        if(this.value > 100){
            score += 100;
            const audio = new Audio("magicpop.mp3");
            audio.volume = 0.7;
            audio.play();
        }
        else{
        const audio = new Audio("popsound.mp3");
        //set volume to 50%
        score += 10;
        audio.volume = 0.1;
        audio.play();
        }
          continue;
        }

        // Simple elastic collision response
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        // Rotate velocities to align with collision angle
        const v1 = { x: this.dx * cos + this.dy * sin, y: this.dy * cos - this.dx * sin };
        const v2 = { x: other.dx * cos + other.dy * sin, y: other.dy * cos - other.dx * sin };

        // Swap velocities along collision axis
        const temp = v1.x;
        v1.x = v2.x;
        v2.x = temp;

        // Rotate velocities back
        this.dx  = (v1.x * cos - v1.y * sin)*dampingFactor;
        this.dy  = (v1.y * cos + v1.x * sin)*dampingFactor;
        other.dx = (v2.x * cos - v2.y * sin)*dampingFactor;
        other.dy = (v2.y * cos + v2.x * sin)*dampingFactor;

        //If value > 200, add additional damping
        if(this.value > 100){
            this.dx *= 0.5;
            this.dy *= 0.5;
        }

        if(other.value > 100){
            other.dx *= 0.5;
            other.dy *= 0.5;
        }


        //If velocity is too low, set to 0
        if (Math.abs(this.dx) < 0.1) this.dx = 0;
        if (Math.abs(this.dy) < 0.1) this.dy = 0;
        if (Math.abs(other.dx) < 0.1) other.dx = 0;
        if (Math.abs(other.dy) < 0.1) other.dy = 0;



        // Push bubbles apart to avoid overlapping
        const overlap = minDistance - distance;
        const adjustX = overlap * cos / 2;
        const adjustY = overlap * sin / 2;
        this.x += adjustX;
        this.y += adjustY;
        other.x -= adjustX;
        other.y -= adjustY;
      }
    }

    this.x += this.dx;
    this.y += this.dy;
    this.draw();
  }
}

// Generate random bubbles
function createBubbles(numBubbles) {
  const values = [2, 4];
  const bubbles = [];
  for (let i = 0; i < numBubbles; i++) {
    const value = values[Math.floor(Math.random() * values.length)];
    const radius = 20+(value*0.5); // Scale radius
    //Only create bubbles in blank spaces
    let x = Math.random() * (canvas.width - radius * 2) + radius;
    let y = Math.random() * (canvas.height - radius * 2) + radius;
    let isTouching = false;
    bubbles.forEach((bubble) => {
        const dx = x - bubble.x;
        const dy = y - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bubble.radius) {
            isTouching = true;
        }
    });
    if(isTouching){
        i--;
        continue;
    }
    
    const dx = wind.x + (Math.random() - 0.5) * 2; // Random horizontal velocity
    const dy = wind.y +(Math.random() - 0.5) * 2; // Random vertical velocity
    bubbles.push(new Bubble(x, y, radius, dx, dy, value));
  }
  return bubbles;
}


// Generate random bubbles
function createOddles(numBubbles) {
    if(!oddleappear){
        oddleappear = true;
        chatMessage.innerHTML = "New rule discovered! Oddles can appear spontaneously when too much kinetic energy is injected! They won't combine with each other! What a nuisance!<br/><br/>"+ chatMessage.innerHTML;
    }
    const values = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    //If varticle list contains ✳
    if(varticles.innerHTML.includes("❈")){
        values.push(3);
    }

    const bubbles = [];
    for (let i = 0; i < numBubbles; i++) {
      const value = values[Math.floor(Math.random() * values.length)];
      let radius = 20+(value*0.5); // Scale radius
      if(value == 3){
          radius = 100;
      }

      //Only create bubbles in blank spaces
      let x = Math.random() * (canvas.width - radius * 2) + radius;
      let y = Math.random() * (canvas.height - radius * 2) + radius;
      let isTouching = false;
      bubbles.forEach((bubble) => {
          const dx = x - bubble.x;
          const dy = y - bubble.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < bubble.radius) {
              isTouching = true;
          }
      });
      if(isTouching){
          i--;
          continue;
      }
      
      const dx = wind.x + (Math.random() - 0.5) * 2; // Random horizontal velocity
      const dy = wind.y +(Math.random() - 0.5) * 2; // Random vertical velocity
      bubbles.push(new Bubble(x, y, radius, dx, dy, value));
    }
    return bubbles;
  }


// Wind state
let wind = { x: 0, y: 0 };
let windDecay = 0.8; // Decay rate of the wind
let isDragging = false;
let startX = 0;
let startY = 0;
let dendX = 0;
let dendY = 0;

// Handle mouse events
canvas.addEventListener("mousedown", (e) => {
    dendX = e.clientX;
    dendY = e.clientY;

    // Only works if not clicking on a bubble
    let isTouching = false;
    bubbles.forEach((bubble) => {
        const dx = e.clientX - bubble.x;
        const dy = e.clientY - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bubble.radius) {
            isTouching = true;
        }
    });

    if (!isTouching) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        dendX = e.clientX; // Update endX and endY
        dendY = e.clientY;
    }
});

canvas.addEventListener("mouseup", (e) => {
    isDragging = false;
    let endX = e.clientX;
    let endY = e.clientY;

    wind.x = (endX - startX) * windStrength; // Scale wind strength
    wind.y = (endY - startY) * windStrength;

    // Calculate the total bubbles to be added proportional to the wind strength
    let totalBubbles = Math.round(Math.abs(wind.x) + Math.abs(wind.y) * windSpawnrate);

    // If the wind is too low, add 2 bubbles
    if (totalBubbles < minWinspawn) {
        totalBubbles = minWinspawn;
    } else if (totalBubbles > maxWinspawn) {
        totalBubbles = maxWinspawn;
    }
    console.log(totalBubbles);

    if (!isGameOver) {
        // Add random bubbles when applying wind
        const newBubbles = createBubbles(totalBubbles);

        // Check if ❁ is in the varticles list, if it is, add oddles
        if (varticles.innerHTML.includes("❁")) {
            const oddles = createOddles(Math.round(totalBubbles/5));
            bubbles.push(...oddles);
        }
        bubbles.push(...newBubbles);
    }
});


//Handle touch events
canvas.addEventListener("touchstart", (e) => {
    dendX = e.touches[0].clientX;
    dendY = e.touches[0].clientY;

    //only works if not touching a bubble
    let isTouching = false;
    bubbles.forEach((bubble) => {
        const dx = e.touches[0].clientX - bubble.x;
        const dy = e.touches[0].clientY - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bubble.radius) {
            isTouching = true;
        }
    });
    
    if(!isTouching)
    {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }
});

canvas.addEventListener("touchmove", (e) => {
    if (isDragging) {
        dendX = e.touches[0].clientX;  // Update endX and endY
        dendY = e.touches[0].clientY;
    }
    });

canvas.addEventListener("touchend", (e) => {
    isDragging = false;
    let endX = e.changedTouches[0].clientX;
    let endY = e.changedTouches[0].clientY;
    wind.x = (endX - startX) * windStrength; // Scale wind strength
    wind.y = (endY - startY) * windStrength;

    //Calculate the total bubbles to be added proportional to the wind strength
    let totalBubbles = Math.round(Math.abs(wind.x)+Math.abs(wind.y)*windSpawnrate);
    //If the wind is too low, add 2 bubbles
    if(totalBubbles < minWinspawn){
        totalBubbles = minWinspawn;
    }
    else if(totalBubbles > maxWinspawn){
        totalBubbles = maxWinspawn;
    }
    //console.log(totalBubbles);

    if(!isGameOver){
        // Add random bubbles when applying wind
        if(!vacuumdrag && totalBubbles > maxWinspawn/5)
            {
                vacuumdrag = true;
                chatMessage.innerHTML = "New rule discovered! You can only create vector field by clicking on vacuum! Dragging will create wind! but when too much kinetic energy is injected, varticles will spontaneously appear!";
            }

        const newBubbles = createBubbles(totalBubbles); 

        //Check if ❁ is in the varticles list if it is, add oddles
        if(varticles.innerHTML.includes("❁")){
            const oddles = createOddles(Math.round(totalBubbles/5));
            bubbles.push(...oddles);
        }
        bubbles.push(...newBubbles);
    }

    });






// When I click on any bubble, console print its value
canvas.addEventListener("click", (e) => {
    const x = e.clientX;
    const y = e.clientY;
    bubbles.forEach((bubble) => {
        const dx = x - bubble.x;
        const dy = y - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bubble.radius) {
            console.log(bubble.value);

            if(bubble.value == 3){
                const index = bubbles.indexOf(bubble);
                if(index > -1){
                    //also remove everything touching this bubble
                    bubbles.forEach((other) => {
                        const dx = bubble.x - other.x;
                        const dy = bubble.y - other.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < bubble.radius) {
                            const index = bubbles.indexOf(other);
                            if(index > -1){
                                bubbles.splice(index, 1);
                            }
                        }
                    });
                    bubbles.splice(index, 1);

                    if(!iceOddle){
                        iceOddle = true;
                        chatMessage.innerHTML = "New rule discovered! Ice varticles can be removed by clicking them! <br/><br/>" + chatMessage.innerHTML;
                    }
                }
            }

        }
    });
});




let isGameOver = false; // Flag to indicate the game is over
let i = 0;
let opacity = 0;
function gameOver() {
  isGameOver = true; // Set the flag
  i = 0;
  opacity = 0;
}


// Main animation loop

//Game start
speakText("Click and drag to create wind, and merge bubbles to grow them. Let's get started!");

const bubbles = createBubbles(20);

// Main animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    const rect = canvas.getBoundingClientRect();

    if (isDragging) {  // Redraw the line if dragging
        ctx.beginPath();
        //Scale start and end points to canvas size
        let wstartX = (canvas.width / rect.width) * (startX-rect.left);
        let wstartY = (canvas.height / rect.height) * (startY-rect.top);
        let wdendX = (canvas.width /rect.width) * (dendX-rect.left);
        let wdendY = (canvas.height / rect.height) * (dendY-rect.top);

        ctx.moveTo(wstartX, wstartY);
        ctx.lineTo(wdendX, wdendY);

        let A = wstartX - wdendX;
        let B = wstartY - wdendY;

        //calculate absolute magnitude of wind
        let windMag = Math.sqrt(A*A + B*B);
        //console.log("wind mag:" + windMag);
        
        //scale windMag to 255
        windMag = Math.round((windMag/800)*255);


        //Make line thickness dependent on wind strength
        ctx.lineWidth = Math.abs(windMag)*0.05;
        
        //Make line color dependent on wind strength, blue for low, and red for high
        ctx.strokeStyle = `rgb(${windMag}, 0, ${255-windMag})`;

        //apply gradient to line
        var gradient = ctx.createLinearGradient(wstartX, wstartY, wdendX, wdendY);
        gradient.addColorStop(0, `rgb(${windMag*0.5}, 0, ${255-windMag})`);
        gradient.addColorStop(1, `rgb(${windMag}, 0, ${255-windMag*0.4})`);
        ctx.strokeStyle = gradient;




        ctx.stroke();
    }

  
    if (!isGameOver) {
      // Apply wind decay
      wind.x *= windDecay;
      wind.y *= windDecay;
  
      // Update and draw bubbles
      bubbles.forEach((bubble) => bubble.update(bubbles, wind));
    } else {
        //GAME OVER Conditions
        if (bubbles.length>0) {
            i++;
            //console.log(i);
            //console.log(bubbles.length);
            bubbles.pop(); // Removes the last bubble
            bubbles.forEach((bubble) => bubble.update(bubbles, wind));
        }
        else if(opacity < 1) {
            // Render "Game Over" text with fading effect
        ctx.fillStyle = `rgba(255, 40, 40, ${opacity})`;
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
        opacity += 0.01;
        }
        else{
        console.log("Idle");
        ctx.fillStyle = `rgba(255, 40, 40, 1)`;
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);

        restartmodal = document.getElementById("restart-modal");
        //remove the d-none class from the class list
        restartmodal.classList.remove("d-none");
        //add d-block class to the class list
        restartmodal.classList.add("d-block");      
        const restartbutton = document.getElementById("restart-button");
        restartbutton.addEventListener("click", restartGame);
        }
    }
  
    requestAnimationFrame(animate);
  }
  
  // Start the animation
  animate();

// Handle window resize
window.addEventListener("resize", () => {
    //Resize the canvas to fill the parent container
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
});



const chatMessage = document.getElementById("chat-box");

//add timer function that triggers every 5 seconds in game
let play = 0;
setInterval(() => {
    if(!isGameOver){
        play = 0;
        score += 1;
    }
    else{
        if(play == 0){
            play = 1;
            console.log("gameOver");
            const audio = new Audio("gameover_fin.mp3");
            audio.play();
        }
    }

}, 500);






//Speech function

function speakText(message) {
    const speech = new SpeechSynthesisUtterance(message);  // Create a new SpeechSynthesisUtterance

    // Optionally, you can set properties like language, pitch, rate, etc.
    speech.lang = "en-US";    // Language (English - US)
    speech.pitch = 1;         // Pitch (0 = lowest, 2 = highest)
    speech.rate = 1;          // Rate (0.1 = slowest, 10 = fastest)

    // Speak the text
    window.speechSynthesis.speak(speech);
}


function restartGame() {
    isGameOver = false;

    // Get the leaderboard element
    const leaderboard = document.getElementById("leaderboard");
    if (!leaderboard) {
        console.error("Leaderboard element not found!");
        return;
    }

    // Get player name and validate input
    const playerName = document.getElementById("playerName").value.trim();
    if (!playerName) {
        alert("Please enter a valid player name!");
        return;
    }

    // Extract existing leaderboard scores into an array
    let leaderboard_scores = [];
    for (let i = 0; i < leaderboard.children.length; i++) {
        const entry = leaderboard.children[i].textContent.split(":");
        leaderboard_scores.push({
            name: entry[0].trim(),
            score: parseInt(entry[1].trim()),
        });
    }

    // Add the new score to the array
    leaderboard_scores.push({ name: playerName, score });

    // Sort the scores in descending order and keep the top 5
    leaderboard_scores = leaderboard_scores
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 5); // Keep only the top 5 scores

    // Update the leaderboard DOM
    leaderboard.innerHTML = ""; // Clear existing leaderboard
    leaderboard_scores.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `${entry.name}: ${entry.score}`;
        leaderboard.appendChild(li);
    });

    // Reset game state
    bubbles.length = 0;
    bubbles.push(...createBubbles(20)); // Add initial bubbles
    opacity = 0;
    score = 0;

    // Hide the restart modal
    const restartModal = document.getElementById("restart-modal");
    if (restartModal) {
        restartModal.classList.remove("d-block");
        restartModal.classList.add("d-none");
    } else {
        console.error("Restart modal element not found!");
    }
}



//Cheats

//When A is pressed, add 10 bubbles
document.addEventListener("keydown", (e) => {
    if (e.key === "a" && !isGameOver) {
        const newBubbles = createBubbles(100);
        bubbles.push(...newBubbles);
    }
});